import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, Camera, Radio, 
  RotateCcw, Shield, GraduationCap, BookOpen, Clock, 
  Activity, CheckCircle2, AlertCircle, Sparkles, Volume2
} from 'lucide-react';
import { db, collection, addDoc, Timestamp, doc, updateDoc, deleteDoc } from '../../firebase';
import { INITIAL_CLASSES } from '../../data/marksheetData';

export const BROADCAST_CHANNELS = [
  'Principal Office',
  'Academic Coordinator',
  ...INITIAL_CLASSES
];

interface Props {
  currentUser?: any;
}

export default function ClassroomCaster({ currentUser }: Props) {
  const [channel, setChannel] = useState<string>(BROADCAST_CHANNELS[0]);
  const [teacherName, setTeacherName] = useState<string>(currentUser?.displayName || 'Class Teacher');
  const [subject, setSubject] = useState<string>('General Lecture');
  const [topic, setTopic] = useState<string>('');
  
  // Streaming states
  const [isStreaming, setIsStreaming] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [broadcastTime, setBroadcastTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const streamDocIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeCallsRef = useRef<any[]>([]);

  // Update teacher name when currentUser becomes available
  useEffect(() => {
    if (currentUser?.displayName && teacherName === 'Class Teacher') {
      setTeacherName(currentUser.displayName);
    }
  }, [currentUser]);

  // Clean up on component unmount
  useEffect(() => {
    const handleUnload = () => {
      stopStreamingSync();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      stopStreaming();
    };
  }, []);

  // Synchronous cleanup for unload events
  const stopStreamingSync = () => {
    if (streamDocIdRef.current) {
      try {
        deleteDoc(doc(db, 'active_streams', streamDocIdRef.current));
      } catch (e) {
        // ignore on exit
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
  };

  // Set up audio analyzer to display real-time speaking level
  const setupAudioMeter = (stream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (err) {
      console.warn('Audio metering unavailable:', err);
    }
  };

  // Attach stream to video tag whenever stream or isStreaming changes
  useEffect(() => {
    if (isStreaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.log('Video autoplay handled:', e));
    }
  }, [isStreaming]);

  // Start Broadcasting
  const startStreaming = async () => {
    setIsInitializing(true);
    setStatusMessage('Accessing camera and microphone...');

    try {
      // 1. Capture Media Stream (audio & video)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode,
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (e) {
        console.warn('Fallback to basic media constraints:', e);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      }

      streamRef.current = stream;
      setupAudioMeter(stream);

      // 2. Initialize PeerJS client with unique ID
      setStatusMessage('Connecting to real-time broadcast signaling...');
      const cleanChannelId = channel.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const uniquePeerId = `lecture-${cleanChannelId}-${Date.now().toString().slice(-5)}`;

      const peer = new Peer(uniquePeerId, {
        debug: 1
      });

      peer.on('open', async (id) => {
        setPeerId(id);
        setIsStreaming(true);
        setIsInitializing(false);
        setStatusMessage('Broadcasting live!');

        // 3. Register stream in Firestore `active_streams`
        try {
          const docRef = await addDoc(collection(db, 'active_streams'), {
            classId: channel,
            channelType: channel.includes('Principal') || channel.includes('Coordinator') ? 'management' : 'classroom',
            teacherName: teacherName.trim() || 'Teacher',
            subject: subject.trim() || 'Lecture',
            topic: topic.trim() || 'Online Class Session',
            peerId: id,
            timestamp: Timestamp.now(),
            lastHeartbeat: Timestamp.now(),
            status: 'live',
            isScreenSharing: false,
            isAudioMuted: false,
            isVideoMuted: false
          });
          streamDocIdRef.current = docRef.id;

          // Start Heartbeat every 12 seconds so viewer knows broadcaster is active
          heartbeatIntervalRef.current = setInterval(async () => {
            if (streamDocIdRef.current) {
              try {
                await updateDoc(doc(db, 'active_streams', streamDocIdRef.current), {
                  lastHeartbeat: Timestamp.now()
                });
              } catch (err) {
                console.warn('Heartbeat ping error:', err);
              }
            }
          }, 12000);

        } catch (dbErr) {
          console.error('Failed to register active stream in Firestore:', dbErr);
        }
      });

      // 4. Handle incoming viewer calls
      peer.on('call', (call) => {
        activeCallsRef.current.push(call);
        if (streamRef.current) {
          call.answer(streamRef.current);
        }
        call.on('close', () => {
          activeCallsRef.current = activeCallsRef.current.filter(c => c !== call);
        });
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        setStatusMessage(`Connection warning: ${err.type || 'network'}`);
      });

      peerRef.current = peer;

      // Start elapsed broadcast timer
      setBroadcastTime(0);
      timerIntervalRef.current = setInterval(() => {
        setBroadcastTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Failed to start broadcast:', err);
      setIsInitializing(false);
      alert(`Could not start broadcast: ${err.message || 'Permission denied'}.\n\nPlease ensure camera and microphone permissions are allowed.`);
    }
  };

  // Stop Broadcasting
  const stopStreaming = async () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (streamDocIdRef.current) {
      try {
        await deleteDoc(doc(db, 'active_streams', streamDocIdRef.current));
      } catch (e) {
        console.warn('Error deleting stream doc:', e);
      }
      streamDocIdRef.current = null;
    }

    setIsStreaming(false);
    setPeerId('');
    setIsScreenSharing(false);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    setBroadcastTime(0);
    setAudioLevel(0);
    setStatusMessage('');
  };

  // Toggle Microphone Mute
  const toggleAudio = () => {
    if (!streamRef.current) return;
    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const newState = !isAudioMuted;
      audioTracks.forEach(t => { t.enabled = !newState; });
      setIsAudioMuted(newState);

      if (streamDocIdRef.current) {
        updateDoc(doc(db, 'active_streams', streamDocIdRef.current), {
          isAudioMuted: newState
        }).catch(() => {});
      }
    }
  };

  // Toggle Camera Mute (Video freeze / black)
  const toggleVideo = () => {
    if (!streamRef.current) return;
    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const newState = !isVideoMuted;
      videoTracks.forEach(t => { t.enabled = !newState; });
      setIsVideoMuted(newState);

      if (streamDocIdRef.current) {
        updateDoc(doc(db, 'active_streams', streamDocIdRef.current), {
          isVideoMuted: newState
        }).catch(() => {});
      }
    }
  };

  // Switch between User (Front) and Environment (Back) camera on mobile
  const flipCamera = async () => {
    if (!isStreaming || isScreenSharing) return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1280 } },
        audio: false
      });
      replaceVideoTrack(newStream.getVideoTracks()[0]);
    } catch (e) {
      console.warn('Failed to switch camera direction:', e);
    }
  };

  // Replace active video track for all connected viewers seamlessly
  const replaceVideoTrack = (newTrack: MediaStreamTrack) => {
    if (!streamRef.current) return;
    const oldTrack = streamRef.current.getVideoTracks()[0];
    if (oldTrack) {
      streamRef.current.removeTrack(oldTrack);
      oldTrack.stop();
    }
    streamRef.current.addTrack(newTrack);

    if (videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }

    // Replace track on all active WebRTC peer connections
    activeCallsRef.current.forEach((call: any) => {
      try {
        const sender = call.peerConnection?.getSenders?.().find((s: any) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newTrack);
        }
      } catch (e) {
        console.warn('Error replacing track on peer:', e);
      }
    });
  };

  // Toggle Screen Share (Mobile or Desktop Screen)
  const toggleScreenShare = async () => {
    if (!isStreaming) return;

    if (isScreenSharing) {
      // Revert back to Camera
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 } },
          audio: false
        });
        replaceVideoTrack(camStream.getVideoTracks()[0]);
        setIsScreenSharing(false);

        if (streamDocIdRef.current) {
          updateDoc(doc(db, 'active_streams', streamDocIdRef.current), {
            isScreenSharing: false
          }).catch(() => {});
        }
      } catch (e) {
        console.error('Error switching back to camera:', e);
      }
    } else {
      // Initiate Screen Sharing
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert('Screen sharing is not supported by your current browser.');
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Handle when user stops sharing via the browser's native banner
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        replaceVideoTrack(screenTrack);
        setIsScreenSharing(true);

        if (streamDocIdRef.current) {
          updateDoc(doc(db, 'active_streams', streamDocIdRef.current), {
            isScreenSharing: true
          }).catch(() => {});
        }
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.error('Screen sharing error:', err);
          alert('Could not start screen sharing: ' + (err.message || 'Permission denied'));
        }
      }
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isManagement = channel.includes('Principal') || channel.includes('Coordinator');

  return (
    <div className="max-w-4xl mx-auto py-2">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 mb-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30 shadow-inner">
              <Radio size={28} className={isStreaming ? 'animate-pulse text-red-400' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Teacher Lecture Broadcast</h1>
                {isStreaming && (
                  <span className="bg-red-500/20 text-red-400 text-xs px-2.5 py-0.5 rounded-full font-bold border border-red-500/30 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    ON AIR
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Cast your live online lecture, camera feed, presentation slides, or screen with real-time audio.
              </p>
            </div>
          </div>

          {isStreaming && (
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700 w-fit">
              <Clock size={16} className="text-blue-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Duration</div>
                <div className="text-base font-mono font-bold text-white">{formatTime(broadcastTime)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isStreaming ? (
        /* Setup / Configuration Form */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Sparkles size={20} className="text-blue-600" />
              Lecture Setup & Channel Selection
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Channel / Class Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Broadcasting Channel / Class
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                >
                  <optgroup label="School Administration">
                    <option value="Principal Office">👑 Principal Office Broadcast</option>
                    <option value="Academic Coordinator">🎓 Academic Coordinator Session</option>
                  </optgroup>
                  <optgroup label="Classrooms">
                    {INITIAL_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>📚 {cls}</option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  Select whether you are broadcasting for a specific class or administrative office.
                </p>
              </div>

              {/* Teacher / Presenter Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Presenter / Teacher Name
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Tr. Ahmad, Sir Osama"
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Display name shown to students and the principal.
                </p>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Subject / Category
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics, Science, Urdu, Quran"
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Topic / Session Agenda */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Lecture Topic / Title
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Chapter 5: Linear Equations"
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            {/* Quick Feature Highlights */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Real-time Audio & Mic stream</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Desktop & Mobile Screen Share</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Auto-clears inactive feeds</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={startStreaming}
              disabled={isInitializing}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-3 text-base disabled:opacity-50"
            >
              <Radio size={22} className={isInitializing ? 'animate-spin' : ''} />
              {isInitializing ? (statusMessage || 'Initializing Stream...') : 'Start Live Lecture Broadcast'}
            </button>
          </div>
        </div>
      ) : (
        /* Live Broadcast Studio Interface */
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
            {/* Top Overlay Banner */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  LIVE
                </div>
                <div className="text-white drop-shadow-md">
                  <span className="font-bold text-sm">{channel}</span>
                  <span className="text-xs text-slate-300 mx-2">•</span>
                  <span className="text-xs text-slate-200">{teacherName}</span>
                </div>
              </div>

              {/* Source Badge */}
              <div className="bg-slate-800/80 backdrop-blur-md text-white text-xs px-3 py-1 rounded-xl border border-slate-700 flex items-center gap-1.5 shadow">
                {isScreenSharing ? (
                  <><Monitor size={14} className="text-blue-400" /> Screen Sharing</>
                ) : (
                  <><Camera size={14} className="text-emerald-400" /> Camera Feed</>
                )}
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                muted
                autoPlay
              />

              {isVideoMuted && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                  <VideoOff size={48} className="mb-2 text-slate-600" />
                  <p className="text-sm font-semibold">Camera is temporarily paused</p>
                  <p className="text-xs text-slate-600">Your audio is still broadcasting</p>
                </div>
              )}

              {/* Live Audio Meter Overlay */}
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {isAudioMuted ? (
                  <MicOff size={16} className="text-red-400" />
                ) : (
                  <Volume2 size={16} className="text-emerald-400" />
                )}
                <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${isAudioMuted ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: isAudioMuted ? '0%' : `${audioLevel}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-300">
                  {isAudioMuted ? 'MUTED' : `${audioLevel}%`}
                </span>
              </div>
            </div>

            {/* In-Broadcast Controls Bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {/* Mic Mute / Unmute */}
                <button
                  onClick={toggleAudio}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                    isAudioMuted 
                      ? 'bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30' 
                      : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} className="text-emerald-400" />}
                  <span>{isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                </button>

                {/* Camera Toggle */}
                <button
                  onClick={toggleVideo}
                  disabled={isScreenSharing}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                    isVideoMuted 
                      ? 'bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30' 
                      : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                  } disabled:opacity-40`}
                  title={isVideoMuted ? 'Enable Camera' : 'Pause Camera'}
                >
                  {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} className="text-blue-400" />}
                  <span>{isVideoMuted ? 'Resume Video' : 'Pause Video'}</span>
                </button>

                {/* Flip Camera (Mobile) */}
                {!isScreenSharing && (
                  <button
                    onClick={flipCamera}
                    className="p-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors"
                    title="Flip Camera (Front/Rear)"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}

                {/* Screen Share Toggle */}
                <button
                  onClick={toggleScreenShare}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                    isScreenSharing
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={isScreenSharing ? 'Switch Back to Camera' : 'Share Screen or Presentation'}
                >
                  <Monitor size={18} className={isScreenSharing ? 'text-white' : 'text-blue-400'} />
                  <span>{isScreenSharing ? 'Stop Screen Share' : 'Share Screen / Slides'}</span>
                </button>
              </div>

              {/* End Lecture Button */}
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to end this live lecture broadcast?')) {
                    stopStreaming();
                  }
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-red-600/20 flex items-center gap-2"
              >
                End Lecture Broadcast
              </button>
            </div>
          </div>

          {/* Broadcast Summary Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isManagement ? (
                  <Shield size={16} className="text-blue-600" />
                ) : (
                  <BookOpen size={16} className="text-emerald-600" />
                )}
                <span className="font-bold text-slate-800 text-sm">{channel}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {subject}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {topic ? `Topic: ${topic}` : 'Broadcasting active lesson session'} • Presenter: <strong>{teacherName}</strong>
              </p>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Signal ID: {peerId}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

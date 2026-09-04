import React, { useEffect, useState, useRef, useMemo } from 'react';
import Peer from 'peerjs';
import { 
  Video, Play, Maximize2, Grid2X2, Grid, LayoutGrid, AppWindow, 
  Volume2, VolumeX, Radio, Shield, GraduationCap, BookOpen, 
  RefreshCw, Clock, Sparkles, Monitor, User, AlertCircle, 
  CheckCircle2, Trash2
} from 'lucide-react';
import { db, collection, query, where, onSnapshot, doc, deleteDoc } from '../../firebase';

export default function PrincipalCCTV() {
  const [activeStreams, setActiveStreams] = useState<any[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [gridLayout, setGridLayout] = useState<1 | 2 | 3 | 4>(3);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'admin' | 'classes'>('all');
  const [isMutedMap, setIsMutedMap] = useState<{ [key: string]: boolean }>({});
  const [videoLoadedMap, setVideoLoadedMap] = useState<{ [key: string]: boolean }>({});
  const [isCleaning, setIsCleaning] = useState(false);
  const [peerStatus, setPeerStatus] = useState<string>('Connecting...');

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const activeCallsRef = useRef<{ [key: string]: any }>({});

  // Initialize Viewer Peer
  useEffect(() => {
    const viewerId = `viewer-${Date.now().toString().slice(-6)}`;
    const viewerPeer = new Peer(viewerId, { debug: 1 });

    viewerPeer.on('open', () => {
      setPeerStatus('Connected');
      setPeer(viewerPeer);
    });

    viewerPeer.on('error', (err) => {
      console.warn('Viewer PeerJS error:', err);
      setPeerStatus('Connection issue');
    });

    return () => {
      viewerPeer.destroy();
    };
  }, []);

  // Listen to Active Streams in Firestore & Automatically Purge Inactive/Stale ones
  useEffect(() => {
    const qStreams = query(collection(db, 'active_streams'), where('status', '==', 'live'));

    const unsubStreams = onSnapshot(qStreams, async (snapshot) => {
      const now = Date.now();
      const validStreams: any[] = [];
      const staleDocIdsToPurge: string[] = [];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        const streamId = d.id;

        // Calculate staleness based on lastHeartbeat or timestamp
        let lastActivityTime = now;
        if (data.lastHeartbeat?.toMillis) {
          lastActivityTime = data.lastHeartbeat.toMillis();
        } else if (data.timestamp?.toMillis) {
          lastActivityTime = data.timestamp.toMillis();
        }

        const ageMs = now - lastActivityTime;

        // If inactive for more than 10 minutes (600,000 ms), schedule for deletion
        if (ageMs > 10 * 60 * 1000) {
          staleDocIdsToPurge.push(streamId);
          return;
        }

        // If offline / no heartbeat for > 90 seconds (camera/device shut down), do not display
        if (ageMs > 90 * 1000) {
          return;
        }

        validStreams.push({ id: streamId, ...data });
      });

      // Purge dead/stale streams older than 10 minutes from database in background
      if (staleDocIdsToPurge.length > 0) {
        staleDocIdsToPurge.forEach(async (id) => {
          try {
            await deleteDoc(doc(db, 'active_streams', id));
          } catch (e) {
            console.warn('Error purging stale stream doc:', e);
          }
        });
      }

      // Sort streams: Management (Principal / Coordinator) first, then classes
      validStreams.sort((a, b) => {
        const aIsMgmt = a.classId?.includes('Principal') || a.classId?.includes('Coordinator');
        const bIsMgmt = b.classId?.includes('Principal') || b.classId?.includes('Coordinator');
        if (aIsMgmt && !bIsMgmt) return -1;
        if (!aIsMgmt && bIsMgmt) return 1;
        return (a.classId || '').localeCompare(b.classId || '');
      });

      setActiveStreams(validStreams);
    });

    return () => {
      unsubStreams();
    };
  }, []);

  // Safe dummy stream for initiating WebRTC call without requesting local camera
  const getDummyStream = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.captureStream(0);
    } catch (e) {
      return new MediaStream();
    }
  };

  // Connect to incoming active lecture streams via WebRTC
  useEffect(() => {
    if (!peer) return;

    activeStreams.forEach((streamInfo) => {
      const videoElement = videoRefs.current[streamInfo.id];
      const hasActiveCall = !!activeCallsRef.current[streamInfo.id];

      if (!hasActiveCall || !videoElement?.srcObject) {
        try {
          const call = peer.call(streamInfo.peerId, getDummyStream());
          if (call) {
            activeCallsRef.current[streamInfo.id] = call;

            call.on('stream', (remoteStream) => {
              if (videoRefs.current[streamInfo.id]) {
                const el = videoRefs.current[streamInfo.id]!;
                el.srcObject = remoteStream;
                el.play().catch(e => console.log('Video play handled:', e));

                // Check if video actually has active video frames
                const checkTrack = () => {
                  if (remoteStream.getVideoTracks().length > 0) {
                    setVideoLoadedMap(prev => ({ ...prev, [streamInfo.id]: true }));
                  }
                };
                checkTrack();
                remoteStream.onaddtrack = checkTrack;
              }
            });

            call.on('close', () => {
              delete activeCallsRef.current[streamInfo.id];
              setVideoLoadedMap(prev => ({ ...prev, [streamInfo.id]: false }));
            });

            call.on('error', (err) => {
              console.warn('Call error on stream', streamInfo.id, err);
              delete activeCallsRef.current[streamInfo.id];
            });
          }
        } catch (callErr) {
          console.warn('Failed to initiate call to peer:', callErr);
        }
      }
    });

    // Cleanup disconnected calls
    const currentStreamIds = new Set(activeStreams.map(s => s.id));
    Object.keys(activeCallsRef.current).forEach((streamId) => {
      if (!currentStreamIds.has(streamId)) {
        activeCallsRef.current[streamId]?.close();
        delete activeCallsRef.current[streamId];
        setVideoLoadedMap(prev => {
          const updated = { ...prev };
          delete updated[streamId];
          return updated;
        });
      }
    });
  }, [activeStreams, peer]);

  // Toggle Mute / Unmute for a specific stream's audio
  const toggleMute = (streamId: string) => {
    const videoEl = videoRefs.current[streamId];
    if (videoEl) {
      const currentMuted = videoEl.muted;
      videoEl.muted = !currentMuted;
      if (videoEl.muted === false) {
        videoEl.play().catch(() => {});
      }
      setIsMutedMap(prev => ({ ...prev, [streamId]: videoEl.muted }));
    }
  };

  // Toggle Fullscreen for a specific video card
  const toggleFullscreen = (streamId: string) => {
    const video = videoRefs.current[streamId];
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      }
    }
  };

  // Manual cleanup function to clear all stale/dead streams immediately
  const handleClearStaleStreams = async () => {
    setIsCleaning(true);
    try {
      const now = Date.now();
      const promises: Promise<any>[] = [];
      activeStreams.forEach((stream) => {
        let lastActivity = now;
        if (stream.lastHeartbeat?.toMillis) {
          lastActivity = stream.lastHeartbeat.toMillis();
        } else if (stream.timestamp?.toMillis) {
          lastActivity = stream.timestamp.toMillis();
        }

        // If inactive for more than 45 seconds, delete it
        if (now - lastActivity > 45 * 1000) {
          promises.push(deleteDoc(doc(db, 'active_streams', stream.id)));
        }
      });

      await Promise.all(promises);
      setTimeout(() => setIsCleaning(false), 600);
    } catch (e) {
      console.error('Error manual cleaning:', e);
      setIsCleaning(false);
    }
  };

  // Filter streams by category
  const filteredStreams = useMemo(() => {
    return activeStreams.filter((stream) => {
      const isMgmt = stream.classId?.includes('Principal') || stream.classId?.includes('Coordinator');
      if (categoryFilter === 'admin') return isMgmt;
      if (categoryFilter === 'classes') return !isMgmt;
      return true;
    });
  }, [activeStreams, categoryFilter]);

  const gridClassMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Monitoring Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
                <Video size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  Live Lectures & Classroom Hub
                  {activeStreams.length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                      {activeStreams.length} Live
                    </span>
                  )}
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Real-time audio & video streaming of online teacher lectures, presentations, and principal sessions.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Pills */}
            <div className="flex bg-slate-800/90 rounded-2xl p-1 border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${categoryFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                All ({activeStreams.length})
              </button>
              <button
                onClick={() => setCategoryFilter('admin')}
                className={`px-3 py-1.5 rounded-xl transition-all ${categoryFilter === 'admin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Principal & Coordinator
              </button>
              <button
                onClick={() => setCategoryFilter('classes')}
                className={`px-3 py-1.5 rounded-xl transition-all ${categoryFilter === 'classes' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Classrooms
              </button>
            </div>

            {/* Grid Layout Switcher */}
            <div className="flex bg-slate-800/90 rounded-2xl p-1 border border-slate-700">
              <button onClick={() => setGridLayout(1)} className={`p-2 rounded-xl transition-colors ${gridLayout === 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`} title="1 Focus View">
                <AppWindow size={16} />
              </button>
              <button onClick={() => setGridLayout(2)} className={`p-2 rounded-xl transition-colors ${gridLayout === 2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`} title="2x2 View">
                <Grid2X2 size={16} />
              </button>
              <button onClick={() => setGridLayout(3)} className={`p-2 rounded-xl transition-colors ${gridLayout === 3 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`} title="3x3 View">
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setGridLayout(4)} className={`p-2 rounded-xl transition-colors ${gridLayout === 4 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`} title="4x4 View">
                <Grid size={16} />
              </button>
            </div>

            {/* Clear Inactive / Stale Streams Button */}
            <button
              onClick={handleClearStaleStreams}
              disabled={isCleaning}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs px-3.5 py-2 rounded-2xl border border-slate-700 transition-all font-medium"
              title="Clean offline broadcasts older than 1 minute"
            >
              <RefreshCw size={14} className={isCleaning ? 'animate-spin' : ''} />
              <span>Clean Inactive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Lecture Stream Grid */}
      <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-2xl min-h-[500px] flex flex-col">
        {filteredStreams.length === 0 ? (
          /* Empty State - No active lectures */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 my-auto">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-slate-600 mb-4 border border-slate-800">
              <Radio size={36} className="text-slate-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-1">No Live Lectures Currently Active</h3>
            <p className="text-sm text-slate-500 max-w-md mb-6">
              When class teachers, the academic coordinator, or the principal start broadcasting from the Lecture Broadcast tab, their live streams and audio will automatically appear here.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Auto-clear active • Offline feeds are purged automatically
            </div>
          </div>
        ) : (
          /* Live Stream Grid */
          <div className={`grid ${gridClassMap[gridLayout]} gap-5`}>
            {filteredStreams.map((stream) => {
              const isMgmt = stream.classId?.includes('Principal') || stream.classId?.includes('Coordinator');
              const isVideoReady = videoLoadedMap[stream.id];
              const isMuted = isMutedMap[stream.id] !== false; // default muted for browser policy

              return (
                <div
                  key={stream.id}
                  className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative group aspect-video flex flex-col shadow-lg transition-all hover:border-slate-700"
                >
                  {/* Top Bar Overlay */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-10 flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-white font-bold text-sm drop-shadow-md flex items-center gap-1.5">
                          {isMgmt && <Shield size={14} className="text-blue-400" />}
                          {stream.classId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <span>{stream.teacherName || 'Teacher'}</span>
                        {stream.subject && (
                          <>
                            <span>•</span>
                            <span className="text-blue-300 font-medium">{stream.subject}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {stream.isScreenSharing && (
                        <span className="px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow">
                          <Monitor size={12} />
                          Screen
                        </span>
                      )}
                      <button
                        onClick={() => toggleFullscreen(stream.id)}
                        className="p-1.5 bg-black/60 hover:bg-black text-white rounded-lg transition-colors"
                        title="Fullscreen"
                      >
                        <Maximize2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Video & Fallback Display */}
                  <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                    {/* The HTML5 video element */}
                    <video
                      ref={(el) => { videoRefs.current[stream.id] = el; }}
                      className={`w-full h-full object-contain transition-opacity duration-300 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
                      autoPlay
                      playsInline
                      muted={isMuted}
                      onPlaying={() => setVideoLoadedMap(prev => ({ ...prev, [stream.id]: true }))}
                    />

                    {/* Non-black Connecting / Audio Placeholder */}
                    {!isVideoReady && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-slate-900 to-slate-950">
                        <div className="p-3 bg-blue-900/30 text-blue-400 rounded-2xl mb-2 border border-blue-800/40">
                          {isMgmt ? <Shield size={28} /> : <GraduationCap size={28} />}
                        </div>
                        <div className="text-xs font-bold text-white mb-1">
                          Connecting to {stream.teacherName}&apos;s Lecture
                        </div>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          {stream.topic || stream.subject || 'Establishing encrypted stream...'}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
                          <span className="text-[10px] text-blue-300 font-medium">Negotiating WebRTC feed</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Interactive Audio Bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Audio Unmute Toggle Button */}
                      <button
                        onClick={() => toggleMute(stream.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                          isMuted
                            ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        title={isMuted ? 'Click to listen to audio' : 'Mute audio'}
                      >
                        {isMuted ? (
                          <>
                            <VolumeX size={14} className="text-amber-400" />
                            <span>Unmute Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={14} className="animate-pulse" />
                            <span>Listening Live</span>
                          </>
                        )}
                      </button>

                      {stream.topic && (
                        <span className="hidden sm:inline-block text-[11px] text-slate-300 truncate max-w-[160px] bg-black/40 px-2 py-0.5 rounded border border-white/10">
                          {stream.topic}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        HD Stream
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

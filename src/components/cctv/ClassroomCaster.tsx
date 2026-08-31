import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { Camera, AlertTriangle, ShieldCheck, Video, Activity } from 'lucide-react';
import { db, storage, collection, addDoc, Timestamp, ref, uploadBytes, getDownloadURL, doc, updateDoc, deleteDoc } from '../../firebase';
import { INITIAL_CLASSES } from '../../data/marksheetData';

export default function ClassroomCaster() {
  const [classId, setClassId] = useState<string>(INITIAL_CLASSES[0]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [incidentCount, setIncidentCount] = useState(0);
  const [isDisturbance, setIsDisturbance] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const streamDocIdRef = useRef<string | null>(null);
  
  const animationFrameId = useRef<number>(0);
  const lastKeypoints = useRef<any[]>([]);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<BlobPart[]>([]);
  
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  // Bind video stream when component switches to streaming view
  useEffect(() => {
    if (isStreaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      
      const handleLoadedData = () => {
        detectPose();
      };
      
      videoRef.current.addEventListener('loadeddata', handleLoadedData);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', handleLoadedData);
        }
      };
    }
  }, [isStreaming]);

  const initPoseDetection = async () => {
    try {
      await tf.setBackend('webgl');
    } catch (e) {
      console.warn("WebGL not available, falling back to CPU", e);
      await tf.setBackend('cpu');
    }
    await tf.ready();
    const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
    detectorRef.current = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
  };

  const startStreaming = async () => {
    try {
      await initPoseDetection();
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
      } catch (e) {
        // Fallback if environment camera is not available (like on laptops)
        console.warn("Could not get environment camera, falling back to default camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
      }
      
      streamRef.current = stream;

      // Initialize PeerJS
      const id = `classroom-${classId.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const peer = new Peer(id);
      
      peer.on('open', async (id) => {
        setPeerId(id);
        setIsStreaming(true);
        // Save stream info to Firestore for admin to discover
        const docRef = await addDoc(collection(db, 'active_streams'), {
          classId,
          peerId: id,
          timestamp: Timestamp.now(),
          status: 'live',
          isDisturbed: false,
          incidentCount: 0
        });
        streamDocIdRef.current = docRef.id;
      });

      peer.on('call', (call) => {
        call.answer(stream);
      });

      peerRef.current = peer;

    } catch (err) {
      console.error("Failed to start stream:", err);
      alert("Could not access camera. Please allow permissions. If you are in a preview, you may need to open the app in a new tab.");
    }
  };

  const stopStreaming = async () => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    if (streamDocIdRef.current) {
      try {
        await deleteDoc(doc(db, 'active_streams', streamDocIdRef.current));
      } catch (e) {
        console.error('Failed to remove stream doc', e);
      }
      streamDocIdRef.current = null;
    }
    setIsStreaming(false);
    setPeerId('');
  };

  const startRecordingIncident = () => {
    if (isRecordingRef.current || !streamRef.current) return;
    isRecordingRef.current = true;
    setIsDisturbance(true);
    
    if (streamDocIdRef.current) {
      updateDoc(doc(db, 'active_streams', streamDocIdRef.current), {
        isDisturbed: true
      });
    }
    
    recordedChunks.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };

    recorder.onstop = async () => {
      isRecordingRef.current = false;
      setIsDisturbance(false);
      
      const newCount = incidentCount + 1;
      setIncidentCount(newCount);
      
      if (streamDocIdRef.current) {
        updateDoc(doc(db, 'active_streams', streamDocIdRef.current), {
          isDisturbed: false,
          incidentCount: newCount
        });
      }
      
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      await saveIncident(blob);
    };

    recorder.start();
    
    // Record for 10 seconds then stop
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, 10000);
  };

  const saveIncident = async (blob: Blob) => {
    try {
      const timestamp = Date.now();
      const fileName = `incidents/${classId}/${timestamp}.webm`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, blob);
      const videoUrl = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, 'incidents'), {
        classId,
        timestamp: Timestamp.fromMillis(timestamp),
        videoUrl,
        status: 'pending_review'
      });
    } catch (err) {
      console.error("Failed to save incident:", err);
    }
  };

  const detectPose = async () => {
    if (!videoRef.current || !detectorRef.current || !canvasRef.current || !isStreaming) return;
    
    const video = videoRef.current;
    if (video.readyState !== 4) {
      animationFrameId.current = requestAnimationFrame(detectPose);
      return;
    }

    const poses = await detectorRef.current.estimatePoses(video);
    
    // Draw Keypoints
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        
        // Simple Disturbance Logic: check rapid movement of nose or wrists
        if (lastKeypoints.current.length > 0) {
          const prevNose = lastKeypoints.current.find(k => k.name === 'nose');
          const currNose = keypoints.find(k => k.name === 'nose');
          
          if (prevNose && currNose && currNose.score && currNose.score > 0.5) {
            const dx = currNose.x - prevNose.x;
            const dy = currNose.y - prevNose.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // If movement threshold exceeded and not currently recording
            if (distance > 50 && !isRecordingRef.current) {
               startRecordingIncident();
            }
          }
        }
        
        lastKeypoints.current = keypoints;

        // Draw points
        keypoints.forEach(keypoint => {
          if (keypoint.score && keypoint.score > 0.3) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = isDisturbance ? 'red' : '#00ff00';
            ctx.fill();
          }
        });
      }
    }

    animationFrameId.current = requestAnimationFrame(detectPose);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-[calc(100vh-100px)] flex flex-col p-4 rounded-xl shadow-inner">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Camera className="text-blue-600" />
          AI Monitor Caster
        </h2>
        <p className="text-sm text-slate-500 mt-1">Mount device to overlook the classroom. AI will detect and record disturbances.</p>
      </div>

      {!isStreaming ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-2">Select Classroom / Section</label>
          <select 
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl mb-6 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {INITIAL_CLASSES.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          
          <button 
            onClick={startStreaming}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Video size={20} />
            Start AI Monitoring
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Monitoring</span>
                <div className="font-bold text-slate-800">{classId}</div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${isDisturbance ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                {isDisturbance ? (
                  <><AlertTriangle size={14} /> Incident Recording...</>
                ) : (
                  <><ShieldCheck size={14} /> Active & Secure</>
                )}
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                playsInline 
                muted
                autoPlay
              />
              <canvas 
                ref={canvasRef} 
                width={640} 
                height={480}
                className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
              />
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Activity size={16} />
                <span>Incidents Captured: <strong>{incidentCount}</strong></span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={stopStreaming}
            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3.5 rounded-xl transition-all"
          >
            Stop Monitoring
          </button>
        </div>
      )}
    </div>
  );
}

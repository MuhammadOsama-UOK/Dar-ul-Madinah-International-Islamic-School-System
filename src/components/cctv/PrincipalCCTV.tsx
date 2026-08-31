import React, { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { ShieldAlert, CheckCircle, Video, Play, Maximize2, X, Grid2X2, Grid, LayoutGrid, AppWindow } from 'lucide-react';
import { db, collection, query, where, onSnapshot, doc, updateDoc, orderBy } from '../../firebase';

export default function PrincipalCCTV() {
  const [activeStreams, setActiveStreams] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [gridLayout, setGridLayout] = useState<1 | 2 | 3 | 4>(3);
  
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    // Initialize Admin Peer
    const adminPeer = new Peer(`admin-${Date.now()}`);
    setPeer(adminPeer);

    return () => {
      adminPeer.destroy();
    };
  }, []);

  useEffect(() => {
    // Listen to Active Streams
    const qStreams = query(collection(db, 'active_streams'), where('status', '==', 'live'));
    const unsubStreams = onSnapshot(qStreams, (snapshot) => {
      const streams = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Sort to bring disturbed ones first
      streams.sort((a, b) => {
        if (a.isDisturbed && !b.isDisturbed) return -1;
        if (!a.isDisturbed && b.isDisturbed) return 1;
        return 0;
      });
      setActiveStreams(streams);
    });

    // Listen to Incidents
    const qIncidents = query(
      collection(db, 'incidents'), 
      where('status', '==', 'pending_review'),
      orderBy('timestamp', 'desc')
    );
    const unsubIncidents = onSnapshot(qIncidents, (snapshot) => {
      const incs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setIncidents(incs);
    });

    return () => {
      unsubStreams();
      unsubIncidents();
    };
  }, []);

  // Connect to active streams
  useEffect(() => {
    if (!peer) return;

    activeStreams.forEach(streamInfo => {
      if (!videoRefs.current[streamInfo.id]?.srcObject) {
        const call = peer.call(streamInfo.peerId, new MediaStream()); // Initiate call
        call?.on('stream', (remoteStream) => {
          if (videoRefs.current[streamInfo.id]) {
            videoRefs.current[streamInfo.id]!.srcObject = remoteStream;
          }
        });
      }
    });
  }, [activeStreams, peer]);

  const toggleFullscreen = (id: string) => {
    const video = videoRefs.current[id];
    if (video) {
      if (video.requestFullscreen) video.requestFullscreen();
    }
  };

  const markReviewed = async (id: string) => {
    await updateDoc(doc(db, 'incidents', id), {
      status: 'reviewed'
    });
    if (selectedIncident?.id === id) setSelectedIncident(null);
  };

  const gridClassMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-100px)]">
      {/* Main CCTV Grid */}
      <div className="flex-1 bg-slate-900 rounded-2xl p-6 shadow-xl flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Video className="text-blue-400" />
              Live CCTV Monitor
            </h2>
            <p className="text-sm text-slate-400 mt-1">Real-time WebRTC streams from classroom AI monitors.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button onClick={() => setGridLayout(1)} className={`p-1.5 rounded ${gridLayout === 1 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="1 Camera View"><AppWindow size={18} /></button>
              <button onClick={() => setGridLayout(2)} className={`p-1.5 rounded ${gridLayout === 2 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="2x2 View"><Grid2X2 size={18} /></button>
              <button onClick={() => setGridLayout(3)} className={`p-1.5 rounded ${gridLayout === 3 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="3x3 View"><LayoutGrid size={18} /></button>
              <button onClick={() => setGridLayout(4)} className={`p-1.5 rounded ${gridLayout === 4 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="4x4 View"><Grid size={18} /></button>
            </div>
            <div className="px-3 py-1.5 bg-blue-900/50 text-blue-300 rounded-lg text-sm font-bold border border-blue-800">
              {activeStreams.length} Active Cameras
            </div>
          </div>
        </div>

        <div className={`grid ${gridClassMap[gridLayout]} gap-4 flex-1`}>
          {activeStreams.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-slate-500 h-64 border-2 border-dashed border-slate-700 rounded-2xl">
              <Video size={48} className="mb-3 opacity-20" />
              <p>No active classrooms currently broadcasting.</p>
            </div>
          ) : (
            activeStreams.map(stream => (
              <div 
                key={stream.id} 
                className={`bg-black rounded-xl overflow-hidden relative group aspect-video transition-all border-2 ${stream.isDisturbed ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-slate-800'}`}
              >
                <video 
                  ref={el => { videoRefs.current[stream.id] = el; }}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div className={`absolute top-0 left-0 w-full p-3 bg-gradient-to-b flex justify-between items-start transition-all ${stream.isDisturbed ? 'from-red-900/80 to-transparent' : 'from-black/80 to-transparent'}`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${stream.isDisturbed ? 'bg-red-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></span>
                      <span className="text-white font-bold text-sm drop-shadow-md">{stream.classId}</span>
                    </div>
                    {stream.isDisturbed && (
                      <span className="text-xs font-bold text-red-300 bg-red-900/50 px-2 py-0.5 rounded border border-red-500/30 w-fit">
                        Disturbance Detected
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleFullscreen(stream.id)}
                    className="p-1.5 bg-black/50 text-white rounded hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
                {stream.incidentCount > 0 && (
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-[10px] font-bold rounded flex items-center gap-1 backdrop-blur-sm border border-slate-700">
                    <ShieldAlert size={12} className="text-amber-400" />
                    {stream.incidentCount} incidents
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Incident Sidebar */}
      <div className="w-full lg:w-96 bg-white rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
          <ShieldAlert className="text-red-500" />
          AI Disturbance Alerts
          {incidents.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-auto">
              {incidents.length}
            </span>
          )}
        </h3>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {incidents.length === 0 ? (
            <div className="text-center text-slate-400 py-10 text-sm">
              <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
              No pending incidents. All clear.
            </div>
          ) : (
            incidents.map(incident => (
              <div 
                key={incident.id} 
                className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedIncident?.id === incident.id ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800 text-sm">{incident.classId}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {incident.timestamp?.toDate ? incident.timestamp.toDate().toLocaleTimeString() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-white p-2 rounded-lg border border-red-100">
                  <Play size={14} className="fill-current" />
                  View 10s AI Capture
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Video Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Disturbance Review</h3>
                <p className="text-sm text-slate-500">{selectedIncident.classId} • {selectedIncident.timestamp?.toDate ? selectedIncident.timestamp.toDate().toLocaleString() : ''}</p>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="text-slate-500" />
              </button>
            </div>
            
            <div className="bg-black aspect-video relative">
              <video 
                src={selectedIncident.videoUrl} 
                className="w-full h-full"
                controls
                autoPlay
              />
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => markReviewed(selectedIncident.id)}
                className="px-6 py-2 text-sm font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                <CheckCircle size={16} />
                Mark as Reviewed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

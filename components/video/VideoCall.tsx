'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import {
  AlertCircle,
  Camera,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  VideoOff,
  SwitchCamera,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface VideoCallProps {
  appointmentId: string;
  roomId: string;
  role: 'doctor' | 'patient';
  remoteName?: string;
  onEnd?: () => void;
  onComplete?: () => void;
}

type CallStatus = 'connecting' | 'waiting' | 'connected' | 'ended' | 'error';

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await fetch('/api/webrtc/ice-servers', {
      method: 'GET',
      cache: 'no-store',
    });
    if (response.ok) {
      const data: { iceServers?: RTCIceServer[] } = await response.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        return [...FALLBACK_ICE_SERVERS, ...data.iceServers];
      }
    }
  } catch (error) {
    console.warn('TURN configuration unavailable; using STUN only');
  }
  return FALLBACK_ICE_SERVERS;
}

export default function VideoCall({
  appointmentId,
  roomId,
  role,
  remoteName = 'Participant',
  onEnd,
  onComplete,
}: VideoCallProps) {
  const { user } = useAuthStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const onEndRef = useRef(onEnd);

  const [status, setStatus] = useState<CallStatus>('connecting');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (!user?.uid || !roomId || !appointmentId) return;

    let disposed = false;
    let roomUnsubscribe: (() => void) | undefined;
    let candidateUnsubscribe: (() => void) | undefined;

    let remoteDescriptionReady = false;
    let offerHandled = false;
    let answerHandled = false;

    const pendingCandidates: RTCIceCandidateInit[] = [];
    const processedCandidateIds = new Set<string>();

    const roomRef = doc(db, 'videoCalls', roomId);

    const stopLocalMedia = () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
    };

    const closePeer = () => {
      if (peerRef.current) {
        peerRef.current.ontrack = null;
        peerRef.current.onicecandidate = null;
        peerRef.current.close();
        peerRef.current = null;
      }
    };

    const flushPendingCandidates = async (peer: RTCPeerConnection) => {
      while (pendingCandidates.length > 0 && remoteDescriptionReady) {
        const candidate = pendingCandidates.shift();
        if (!candidate) continue;
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('✅ [WebRTC] Flushed pending ICE candidate from queue');
        } catch (err) {
          console.error('❌ [WebRTC] Failed to add queued ICE candidate:', err);
        }
      }
    };

    const receiveCandidate = async (
      peer: RTCPeerConnection,
      candidateData: RTCIceCandidateInit,
    ) => {
      if (!remoteDescriptionReady || !peer.remoteDescription) {
        console.log('⏳ [WebRTC] Remote description not ready, queuing ICE candidate');
        pendingCandidates.push(candidateData);
        return;
      }
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidateData));
        console.log('✅ [WebRTC] Added remote ICE candidate instantly');
      } catch (err) {
        console.error('❌ [WebRTC] Failed to add remote ICE candidate:', err);
      }
    };

    const startCall = async () => {
      try {
        setStatus('connecting');
        setError('');

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access is unavailable.');
        }

        const [stream, iceServers] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          }),
          getIceServers(),
        ]);

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const peer = new RTCPeerConnection({
          iceServers,
          iceCandidatePoolSize: 10,
        });

        peerRef.current = peer;

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        peer.ontrack = async (event) => {
          let remoteStream = event.streams[0];
          if (!remoteStream) {
            if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
            remoteStream = remoteStreamRef.current;
            if (!remoteStream.getTracks().some((track) => track.id === event.track.id)) {
              remoteStream.addTrack(event.track);
            }
          } else {
            remoteStreamRef.current = remoteStream;
          }

          if (remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== remoteStream) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            try {
              await remoteVideoRef.current.play();
              setPlaybackBlocked(false);
            } catch (err) {
              setPlaybackBlocked(true);
            }
          }
        };

        const candidateCollection = role === 'doctor' ? 'callerCandidates' : 'calleeCandidates';

        peer.onicecandidate = async (event) => {
          if (!event.candidate) {
            console.log(`🧊 [WebRTC - ${role}] ICE Gathering Complete (null candidate).`);
            return;
          }
          if (disposed) return;
          
          console.log(`📡 [WebRTC - ${role}] Gathered new ICE candidate. Attempting to save to Firebase:`, candidateCollection);
          
          try {
            await addDoc(collection(roomRef, candidateCollection), {
              ...event.candidate.toJSON(),
              createdAt: Timestamp.now(),
            });
            console.log(`✅ [WebRTC - ${role}] Successfully saved candidate to Firebase:`, candidateCollection);
          } catch (err) {
            console.error(`❌ [WebRTC - ${role}] Firebase write failed for ICE candidate. Check security rules!`, err);
          }
        };

        const handleConnected = () => {
          if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed' || peer.connectionState === 'connected') {
            setStatus('connected');
          }
        };

        peer.oniceconnectionstatechange = () => {
          console.log(`[WebRTC] ICE Connection State:`, peer.iceConnectionState);
          if (peer.iceConnectionState === 'failed') {
            setStatus('error');
            setError('Could not establish a media connection. Network issue.');
          } else if (peer.iceConnectionState === 'disconnected') {
            setStatus('waiting');
          } else {
            handleConnected();
          }
        };

        peer.onconnectionstatechange = () => {
          console.log(`[WebRTC] Peer Connection State:`, peer.connectionState);
          if (peer.connectionState === 'failed') {
            setStatus('error');
            setError('Video connection failed. Check network connectivity.');
          } else if (peer.connectionState === 'disconnected') {
            setStatus('waiting');
          } else {
            handleConnected();
          }
        };

        const remoteCandidateCollection = role === 'doctor' ? 'calleeCandidates' : 'callerCandidates';

        candidateUnsubscribe = onSnapshot(
          collection(roomRef, remoteCandidateCollection),
          (snapshot) => {
            for (const change of snapshot.docChanges()) {
              if (change.type !== 'added') continue;
              if (processedCandidateIds.has(change.doc.id)) continue;
              processedCandidateIds.add(change.doc.id);
              const { createdAt: _createdAt, ...candidateData } = change.doc.data();
              console.log(`📥 [WebRTC - ${role}] Downloaded remote ICE candidate from Firebase`);
              void receiveCandidate(peer, candidateData as RTCIceCandidateInit);
            }
          }
        );

        roomUnsubscribe = onSnapshot(roomRef, async (snapshot) => {
          if (disposed || !snapshot.exists()) {
            if (role === 'patient' && !disposed && !offerHandled) setStatus('waiting');
            return;
          }

          const data = snapshot.data();

          if (data.status === 'ended') {
            setStatus('ended');
            closePeer();
            stopLocalMedia();
            return;
          }

          try {
            if (role === 'patient' && data.offer && !offerHandled) {
              console.log('🤝 [WebRTC - Patient] Offer received, setting remote description...');
              offerHandled = true;
              setStatus('connecting');
              
              await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
              remoteDescriptionReady = true;
              await flushPendingCandidates(peer);

              console.log('🤝 [WebRTC - Patient] Creating answer...');
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);

              await setDoc(
                roomRef,
                {
                  patientId: user.uid,
                  answer: { type: peer.localDescription?.type, sdp: peer.localDescription?.sdp },
                  status: 'connecting',
                  updatedAt: Timestamp.now(),
                },
                { merge: true }
              );
              console.log('✅ [WebRTC - Patient] Answer saved to Firebase');
            }

            if (role === 'doctor' && data.answer && !answerHandled) {
              console.log('🤝 [WebRTC - Doctor] Answer received, finalizing connection...');
              answerHandled = true;
              setStatus('connecting');
              
              await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
              remoteDescriptionReady = true;
              await flushPendingCandidates(peer);
            }
          } catch (err) {
            console.error('❌ [WebRTC] Room negotiation failed:', err);
            setStatus('error');
            setError('Unable to negotiate the video connection.');
          }
        });

        if (role === 'doctor') {
          console.log('🚀 [WebRTC - Doctor] Initiating room and offer...');
          await setDoc(roomRef, {
            roomId,
            appointmentId,
            doctorId: user.uid,
            status: 'waiting',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }, { merge: true });

          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer); // This triggers onicecandidate!

          await setDoc(roomRef, {
            offer: { type: peer.localDescription?.type, sdp: peer.localDescription?.sdp },
            doctorId: user.uid,
            appointmentId,
            status: 'waiting',
            updatedAt: Timestamp.now(),
          }, { merge: true });
          
          console.log('✅ [WebRTC - Doctor] Offer saved to Firebase');
          setStatus('waiting');
        } else {
          if (!offerHandled) setStatus('waiting');
        }
      } catch (err) {
        if (disposed) return;
        setStatus('error');
        const mediaError = err as DOMException;
        if (mediaError?.name === 'NotAllowedError') setError('Camera/microphone permission denied.');
        else setError('Unable to start video consultation.');
      }
    };

    void startCall();

    return () => {
      disposed = true;
      roomUnsubscribe?.();
      candidateUnsubscribe?.();
      closePeer();
      stopLocalMedia();
    };
  }, [appointmentId, roomId, role, user?.uid]);

  /* ==========================================
     MEDIA & CONTROLS
  ========================================== */

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextCameraOff = !cameraOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setCameraOff(nextCameraOff);
  }, [cameraOff]);

  const switchCameraFacing = async () => {
    try {
      const nextMode = facingMode === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];

      if (oldVideoTrack && localStreamRef.current) {
        localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
        
        if (peerRef.current) {
          const sender = peerRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newVideoTrack);
        }
        oldVideoTrack.stop();
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setFacingMode(nextMode);
      if (cameraOff) setCameraOff(false); 
    } catch (err) {
      console.error('Camera switch failed', err);
    }
  };

  const playRemoteVideo = useCallback(async () => {
    try {
      await remoteVideoRef.current?.play();
      setPlaybackBlocked(false);
    } catch (err) {
      setPlaybackBlocked(true);
    }
  }, []);

  const handleLeave = () => {
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    onEndRef.current?.();
  };

  const handleComplete = async () => {
    try {
      await setDoc(doc(db, 'videoCalls', roomId), {
        status: 'ended',
        endedAt: Timestamp.now(),
        endedBy: user?.uid || null,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } catch (err) {
      console.error('Error ending video call:', err);
    }
    peerRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (onComplete) onComplete();
    else onEndRef.current?.();
  };

  const waitMessage = role === 'patient' 
    ? 'Waiting for doctor to join...' 
    : 'Waiting for patient to join...';

  /* ==========================================
     RENDER
  ========================================== */

  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] text-white flex flex-col font-sans">
      
      {/* HEADER (Floating over video) */}
      <div className="absolute top-0 left-0 right-0 z-10 p-5 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold tracking-wide shadow-sm">
            Video Consultation
          </p>
          <div className="flex items-center gap-2 mt-1">
            {status === 'connected' ? (
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm">
                <Wifi size={10} /> Live
              </span>
            ) : status === 'waiting' || status === 'connecting' ? (
              <span className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm">
                <Loader2 size={10} className="animate-spin" /> Connecting
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-medium shadow-sm">{remoteName}</p>
          <p className="text-[11px] text-white/60 capitalize shadow-sm">
            {role === 'doctor' ? 'Patient' : 'Doctor'}
          </p>
        </div>
      </div>

      {/* VIDEO AREA */}
      <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
        
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${status === 'connected' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Loading / Waiting States */}
        {status !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-0">
            {status === 'waiting' || status === 'connecting' ? (
              <div className="text-center">
                <Loader2 size={36} className="animate-spin text-teal-500 mx-auto mb-4" />
                <p className="text-[15px] font-medium text-white/90">
                  {status === 'connecting' ? 'Connecting...' : waitMessage}
                </p>
                <p className="text-[12px] text-white/40 mt-2 max-w-[250px] mx-auto">
                  You can safely leave and come back. The consultation stays open until completed by the doctor.
                </p>
              </div>
            ) : status === 'ended' ? (
              <div className="text-center">
                <PhoneOff size={36} className="text-white/40 mx-auto mb-4" />
                <p className="text-[15px] font-medium text-white/90">Consultation Ended</p>
              </div>
            ) : (
              <p className="text-sm text-red-300 text-center px-8 bg-red-950/50 p-4 rounded-xl border border-red-500/20">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Local Video Picture-in-Picture */}
        <div className="absolute right-4 bottom-28 w-28 sm:w-40 aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden border-2 border-white/10 bg-black shadow-2xl z-10 transition-all hover:scale-105">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          {cameraOff && (
            <div className="absolute inset-0 bg-[#151515] flex items-center justify-center">
              <VideoOff size={24} className="text-white/20" />
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center gap-4 sm:gap-6 z-20">
        
        <button
          onClick={switchCameraFacing}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition active:scale-95"
        >
          <SwitchCamera size={20} />
        </button>

        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition active:scale-95 ${
            cameraOff ? 'bg-red-500/90 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {cameraOff ? <VideoOff size={20} /> : <Camera size={20} />}
        </button>

        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition active:scale-95 ${
            muted ? 'bg-red-500/90 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <div className="w-[1px] h-8 bg-white/10 mx-2"></div>

        <button
          onClick={handleLeave}
          title="Leave Room"
          className="w-12 h-12 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center transition border border-white/5 active:scale-95 text-white"
        >
          <LogOut size={20} className="-ml-1" />
        </button>

        {role === 'doctor' && (
          <button
            onClick={handleComplete}
            title="Complete Consultation"
            className="h-12 px-5 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center gap-2 transition shadow-lg shadow-red-900/50 active:scale-95 text-white font-medium text-sm"
          >
            <PhoneOff size={18} />
            <span className="hidden sm:inline">End & Complete</span>
          </button>
        )}

      </div>
    </div>
  );
}
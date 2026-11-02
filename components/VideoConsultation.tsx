'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Wifi,
  WifiOff,
  Loader2,
  SwitchCamera,
  CheckCircle2,
  LogOut
} from 'lucide-react';

import { useAuthStore } from '@/lib/store';
import { sendSignal, subscribeToSignals } from '@/lib/consultation';

interface VideoConsultationProps {
  bookingId: string;
  peerRole: 'doctor' | 'patient';
  remoteName: string;
  onLeave: () => void;
  onComplete?: () => void; // Doctor-only action
}

export default function VideoConsultation({
  bookingId,
  peerRole,
  remoteName,
  onLeave,
  onComplete,
}: VideoConsultationProps) {
  const { user } = useAuthStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const peerRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState('');
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribeSignals: (() => void) | undefined;
    let disposed = false;

    const start = async () => {
      try {
        setConnecting(true);
        setError('');

        // 1. Adaptive Quality Constraints & Initial Camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // 2. Initialize Peer
        const peer = new Peer({
          initiator: peerRole === 'doctor',
          trickle: true,
          stream,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        });

        peerRef.current = peer;

        // 3. Signaling
        peer.on('signal', async (signal) => {
          if (disposed) return;
          try {
            await sendSignal(bookingId, user.uid, signal);
          } catch (err) {
            console.error('Failed to send WebRTC signal:', err);
          }
        });

        // 4. Remote Media
        peer.on('stream', async (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            try {
              await remoteVideoRef.current.play();
              setPlaybackBlocked(false);
            } catch (err) {
              setPlaybackBlocked(true);
            }
          }
        });

        peer.on('connect', () => {
          if (disposed) return;
          setConnected(true);
          setConnecting(false);
          setError('');
        });

        // 5. Handling Disconnects WITHOUT ending the appointment
        peer.on('close', () => {
          if (disposed) return;
          // Return to waiting state so they can wait for the other person to rejoin
          setConnected(false);
          setConnecting(true);
        });

        peer.on('error', (err) => {
          if (disposed) return;
          console.error('WebRTC error:', err);
          // Don't crash the room, just wait for reconnect
          setConnected(false);
          setConnecting(true);
        });

        // 6. Subscribe to remote signals
        unsubscribeSignals = subscribeToSignals(
          bookingId,
          user.uid,
          (signal) => {
            if (disposed) return;
            try {
              peer.signal(signal);
            } catch (err) {
              console.error('Failed to process WebRTC signal:', err);
            }
          }
        );
      } catch (err: any) {
        console.error('Unable to start media:', err);
        if (disposed) return;
        setConnecting(false);
        setError(err?.name === 'NotAllowedError' 
          ? 'Camera/Microphone permission denied.' 
          : 'Unable to access hardware.');
      }
    };

    start();

    return () => {
      disposed = true;
      unsubscribeSignals?.();
      peerRef.current?.destroy();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [bookingId, peerRole, user?.uid]);

  /* ==========================================
     MEDIA CONTROLS
  ========================================== */

  const toggleMute = () => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOff(!videoTrack.enabled);
    }
  };

  // Switch between front/back camera on mobile devices seamlessly
  const switchCameraFacing = async () => {
    try {
      const nextMode = facingMode === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = streamRef.current?.getVideoTracks()[0];

      if (oldVideoTrack && streamRef.current) {
        // Replace track in local stream
        streamRef.current.removeTrack(oldVideoTrack);
        streamRef.current.addTrack(newVideoTrack);
        
        // Replace track in peer connection to update remote side without dropping call
        if (peerRef.current && connected) {
          peerRef.current.replaceTrack(oldVideoTrack, newVideoTrack, streamRef.current);
        }
        oldVideoTrack.stop();
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = streamRef.current;
      }

      setFacingMode(nextMode);
      if (cameraOff) setCameraOff(false); // Force camera on if they switch it
    } catch (err) {
      console.error('Unable to switch camera:', err);
    }
  };

  const playRemoteVideo = useCallback(async () => {
    try {
      await remoteVideoRef.current?.play();
      setPlaybackBlocked(false);
    } catch (err) {
      console.error('Unable to start remote playback:', err);
    }
  }, []);

  const handleLeave = () => {
    peerRef.current?.destroy();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onLeave(); // Temporarily leave room
  };

  const handleComplete = () => {
    peerRef.current?.destroy();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (onComplete) onComplete(); // Doctor ends the appointment
  };

  /* ==========================================
     UI HELPERS
  ========================================== */
  
  const waitMessage = peerRole === 'patient' 
    ? 'Waiting for doctor to join...' 
    : 'Waiting for patient to join...';

  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] text-white flex flex-col font-sans">
      
      {/* HEADER (Floating over video) */}
      <div className="absolute top-0 left-0 right-0 z-10 p-5 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
        <div>
          <p className="text-[15px] font-semibold tracking-wide shadow-sm">
            Video Consultation
          </p>
          <div className="flex items-center gap-2 mt-1">
            {connected ? (
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm">
                <Wifi size={10} /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-sm">
                <WifiOff size={10} /> Connecting
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-medium shadow-sm">{remoteName}</p>
          <p className="text-[11px] text-white/60 capitalize shadow-sm">
            {peerRole === 'doctor' ? 'Patient' : 'Doctor'}
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
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${connected && !cameraOff ? 'opacity-100' : 'opacity-0'}`}
        />

        {playbackBlocked && (
          <button
            onClick={playRemoteVideo}
            className="absolute z-50 bg-teal-600/90 backdrop-blur-md px-6 py-3 rounded-full font-semibold shadow-2xl hover:bg-teal-500 transition border border-teal-400/30"
          >
            Tap to enable audio & video
          </button>
        )}

        {/* Loading / Waiting States */}
        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-0">
            {connecting ? (
              <div className="text-center">
                <Loader2 size={36} className="animate-spin text-teal-500 mx-auto mb-4" />
                <p className="text-[15px] font-medium text-white/90">
                  {waitMessage}
                </p>
                <p className="text-[12px] text-white/40 mt-2 max-w-[250px] mx-auto">
                  You can safely leave and come back. The consultation stays open until completed by the doctor.
                </p>
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
            // ONLY mirror the front-facing camera. Back camera should render naturally.
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
        
        {/* Switch Camera */}
        <button
          onClick={switchCameraFacing}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition active:scale-95"
        >
          <SwitchCamera size={20} />
        </button>

        {/* Toggle Video */}
        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition active:scale-95 ${
            cameraOff ? 'bg-red-500/90 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* Toggle Audio */}
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition active:scale-95 ${
            muted ? 'bg-red-500/90 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <div className="w-[1px] h-8 bg-white/10 mx-2"></div>

        {/* Leave (Temporary) */}
        <button
          onClick={handleLeave}
          title="Leave Room"
          className="w-12 h-12 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center transition border border-white/5 active:scale-95 text-white"
        >
          <LogOut size={20} className="-ml-1" />
        </button>

        {/* Complete (Doctor Only) */}
        {peerRole === 'doctor' && (
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
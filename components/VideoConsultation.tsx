'use client';

import { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';

import { useAuthStore } from '@/lib/store';
import {
  sendSignal,
  subscribeToSignals,
} from '@/lib/consultation';

interface VideoConsultationProps {
  bookingId: string;
  peerRole: 'doctor' | 'patient';
  remoteName: string;
  onLeave: () => void;
}

export default function VideoConsultation({
  bookingId,
  peerRole,
  remoteName,
  onLeave,
}: VideoConsultationProps) {
  const { user } = useAuthStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const peerRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initializedRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid || initializedRef.current) return;

    initializedRef.current = true;

    let unsubscribeSignals: (() => void) | undefined;

    const start = async () => {
      try {
        setConnecting(true);
        setError('');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        /*
         * Doctor is the initiator.
         *
         * Patient waits for the doctor's WebRTC offer.
         */
        const isInitiator = peerRole === 'doctor';

        const peer = new Peer({
          initiator: isInitiator,
          trickle: true,
          stream,
          config: {
            iceServers: [
              {
                urls: 'stun:stun.l.google.com:19302',
              },
              {
                urls: 'stun:stun1.l.google.com:19302',
              },
            ],
          },
        });

        peerRef.current = peer;

        peer.on('signal', async signal => {
          try {
            await sendSignal(
              bookingId,
              user.uid,
              signal
            );
          } catch (err) {
            console.error('Failed to send WebRTC signal:', err);
          }
        });

        peer.on('stream', remoteStream => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });

        peer.on('connect', () => {
          setConnected(true);
          setConnecting(false);
        });

        peer.on('error', err => {
          console.error('WebRTC error:', err);
          setError(
            'The video connection failed. Please try leaving and joining again.'
          );
          setConnecting(false);
        });

        peer.on('close', () => {
          setConnected(false);
        });

        unsubscribeSignals = subscribeToSignals(
          bookingId,
          user.uid,
          signal => {
            try {
              peer.signal(signal);
            } catch (err) {
              console.error('Failed to process WebRTC signal:', err);
            }
          }
        );
      } catch (err: any) {
        console.error('Unable to start camera:', err);

        setConnecting(false);

        if (err?.name === 'NotAllowedError') {
          setError(
            'Camera or microphone permission was denied. Please allow access and try again.'
          );
        } else {
          setError(
            'Unable to access your camera or microphone.'
          );
        }
      }
    };

    start();

    return () => {
      unsubscribeSignals?.();

      peerRef.current?.destroy();
      peerRef.current = null;

      streamRef.current?.getTracks().forEach(track => {
        track.stop();
      });

      streamRef.current = null;
      initializedRef.current = false;
    };
  }, [bookingId, peerRole, user?.uid]);

  const toggleMute = () => {
    const stream = streamRef.current;
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();

    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });

    setMuted(!audioTracks[0]?.enabled);
  };

  const toggleCamera = () => {
    const stream = streamRef.current;
    if (!stream) return;

    const videoTracks = stream.getVideoTracks();

    videoTracks.forEach(track => {
      track.enabled = !track.enabled;
    });

    setCameraOff(!videoTracks[0]?.enabled);
  };

  const handleLeave = () => {
    peerRef.current?.destroy();

    streamRef.current?.getTracks().forEach(track => {
      track.stop();
    });

    onLeave();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050708] text-white flex flex-col">
      {/* Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <div>
          <p className="text-sm font-semibold">
            Video Consultation
          </p>

          <div className="flex items-center gap-2 mt-1">
            {connected ? (
              <>
                <Wifi size={12} className="text-emerald-400" />
                <span className="text-[11px] text-emerald-400">
                  Connected
                </span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-amber-400" />
                <span className="text-[11px] text-white/40">
                  Connecting...
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-[13px] font-medium">
            {remoteName}
          </p>
          <p className="text-[10px] text-white/30 capitalize">
            {peerRole === 'doctor' ? 'Patient' : 'Doctor'}
          </p>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-[#090c0e] overflow-hidden">
        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!connected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {connecting ? (
              <>
                <Loader2
                  size={32}
                  className="animate-spin text-teal-400"
                />

                <p className="mt-4 text-sm text-white/50">
                  Connecting to {remoteName}...
                </p>
              </>
            ) : (
              <p className="text-sm text-red-300 text-center px-8">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Local video */}
        <div className="absolute right-4 top-4 w-32 sm:w-48 aspect-video rounded-xl overflow-hidden border border-white/20 bg-black shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {cameraOff && (
            <div className="absolute inset-0 bg-[#111] flex items-center justify-center">
              <VideoOff size={22} className="text-white/30" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="h-24 flex items-center justify-center gap-3 border-t border-white/10 bg-[#080a0c]">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
            muted
              ? 'bg-red-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          {muted ? <MicOff size={19} /> : <Mic size={19} />}
        </button>

        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
            cameraOff
              ? 'bg-red-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/15'
          }`}
        >
          {cameraOff ? (
            <VideoOff size={19} />
          ) : (
            <Video size={19} />
          )}
        </button>

        <button
          onClick={handleLeave}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition"
        >
          <PhoneOff size={21} />
        </button>
      </div>
    </div>
  );
}
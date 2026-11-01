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
} from 'lucide-react';

interface VideoCallProps {
  appointmentId: string;
  roomId: string;
  role: 'doctor' | 'patient';
  onEnd?: () => void;
}

type CallStatus = 'connecting' | 'waiting' | 'connected' | 'ended' | 'error';

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Optional endpoint contract:
 * GET /api/webrtc/ice-servers
 * Response: { "iceServers": [ { "urls": "...", "username": "...", "credential": "..." } ] }
 *
 * Generate short-lived TURN credentials on the server. Never put permanent
 * TURN credentials in NEXT_PUBLIC_* variables or in this client component.
 */
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
    // The endpoint is optional. STUN fallback still allows suitable networks.
    console.warn('TURN configuration unavailable; using STUN only:', error);
  }

  return FALLBACK_ICE_SERVERS;
}

export default function VideoCall({
  appointmentId,
  roomId,
  role,
  onEnd,
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

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
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
        } catch (err) {
          console.error('Failed to add queued ICE candidate:', err);
        }
      }
    };

    const receiveCandidate = async (
      peer: RTCPeerConnection,
      candidateData: RTCIceCandidateInit,
    ) => {
      if (!remoteDescriptionReady || !peer.remoteDescription) {
        pendingCandidates.push(candidateData);
        return;
      }

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidateData));
      } catch (err) {
        console.error('Failed to add remote ICE candidate:', err);
      }
    };

    const startCall = async () => {
      try {
        setStatus('connecting');
        setError('');

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Camera access is unavailable. Use HTTPS or localhost and a supported browser.',
          );
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
          localVideoRef.current.play().catch((err) => {
            console.warn('Local video autoplay was blocked:', err);
          });
        }

        const peer = new RTCPeerConnection({
          iceServers,
          iceCandidatePoolSize: 10,
        });

        peerRef.current = peer;

        // Add local camera and microphone tracks before creating the offer/answer.
        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        // Receive remote audio/video. Some browsers provide no event.streams,
        // so construct a stream from the received tracks as a fallback.
        peer.ontrack = async (event) => {
          console.log('[WebRTC] Remote track received:', {
            kind: event.track.kind,
            readyState: event.track.readyState,
            muted: event.track.muted,
            streams: event.streams.length,
          });

          let remoteStream = event.streams[0];

          if (!remoteStream) {
            if (!remoteStreamRef.current) {
              remoteStreamRef.current = new MediaStream();
            }

            remoteStream = remoteStreamRef.current;

            const alreadyAdded = remoteStream
              .getTracks()
              .some((track) => track.id === event.track.id);

            if (!alreadyAdded) {
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
              console.warn('Remote video playback was blocked:', err);
              setPlaybackBlocked(true);
            }
          }
        };

        const candidateCollection =
          role === 'doctor' ? 'callerCandidates' : 'calleeCandidates';

        peer.onicecandidate = async (event) => {
          if (!event.candidate || disposed) return;

          console.log('[ICE Candidate]', {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
          });

          try {
            await addDoc(collection(roomRef, candidateCollection), {
              ...event.candidate.toJSON(),
              createdAt: Timestamp.now(),
            });
          } catch (err) {
            console.error('Failed to save local ICE candidate:', err);
          }
        };

        peer.onicecandidateerror = (event) => {
  console.error("[WebRTC] ICE candidate error details:", {
    errorCode: event.errorCode,
    errorText: event.errorText,
    url: event.url,
    address: event.address,
    port: event.port,
  });
};

        peer.oniceconnectionstatechange = () => {
          console.log('[WebRTC] ICE state:', peer.iceConnectionState);

          if (peer.iceConnectionState === 'failed') {
            setStatus('error');
            setError(
              'Could not establish a media connection. TURN relay configuration may be required.',
            );
          } else if (
            peer.iceConnectionState === 'disconnected' ||
            peer.iceConnectionState === 'checking'
          ) {
            if (peer.connectionState !== 'connected') {
              setStatus('connecting');
            }
          }
        };

        peer.onconnectionstatechange = () => {
          console.log('[WebRTC] Peer state:', peer.connectionState);

          switch (peer.connectionState) {
            case 'connected':
              setStatus('connected');
              setError('');
              break;
            case 'failed':
              setStatus('error');
              setError(
                'Video connection failed. Check network connectivity and TURN configuration.',
              );
              break;
            case 'disconnected':
              setStatus('connecting');
              setError('Connection interrupted. Trying to reconnect...');
              break;
            case 'closed':
              if (!disposed) setStatus('ended');
              break;
          }
        };

        peer.onsignalingstatechange = () => {
          console.log('[WebRTC] Signaling state:', peer.signalingState);
        };

        // Listen for the other participant's ICE candidates immediately.
        // Candidates are queued until the remote SDP description is installed.
        const remoteCandidateCollection =
          role === 'doctor' ? 'calleeCandidates' : 'callerCandidates';

        candidateUnsubscribe = onSnapshot(
          collection(roomRef, remoteCandidateCollection),
          (snapshot) => {
            for (const change of snapshot.docChanges()) {
              if (change.type !== 'added') continue;
              if (processedCandidateIds.has(change.doc.id)) continue;

              processedCandidateIds.add(change.doc.id);

              const data = change.doc.data();
              const { createdAt: _createdAt, ...candidateData } = data;

              void receiveCandidate(
                peer,
                candidateData as RTCIceCandidateInit,
              );
            }
          },
          (err) => {
            console.error('Remote ICE listener failed:', err);
            setError('Unable to receive connection information.');
          },
        );

        // Both roles listen for room changes. This also lets a patient wait
        // safely until the doctor publishes the offer.
        roomUnsubscribe = onSnapshot(
          roomRef,
          async (snapshot) => {
            if (disposed || !snapshot.exists()) {
              if (role === 'patient' && !disposed) {
                setStatus('waiting');
              }
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
                // Set the guard before awaiting to prevent duplicate answers
                // if Firestore emits another snapshot during negotiation.
                offerHandled = true;

                console.log('[WebRTC] Patient received doctor offer');

                await peer.setRemoteDescription(
                  new RTCSessionDescription(data.offer),
                );

                remoteDescriptionReady = true;
                await flushPendingCandidates(peer);

                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);

                await setDoc(
                  roomRef,
                  {
                    patientId: user.uid,
                    answer: {
                      type: peer.localDescription?.type,
                      sdp: peer.localDescription?.sdp,
                    },
                    status: 'connecting',
                    updatedAt: Timestamp.now(),
                  },
                  { merge: true },
                );

                setStatus('connecting');
                console.log('[WebRTC] Patient answer published');
              }

              if (role === 'doctor' && data.answer && !answerHandled) {
                answerHandled = true;

                console.log('[WebRTC] Doctor received patient answer');

                await peer.setRemoteDescription(
                  new RTCSessionDescription(data.answer),
                );

                remoteDescriptionReady = true;
                await flushPendingCandidates(peer);

                setStatus('connecting');
              }
            } catch (err) {
              console.error('[WebRTC] Room negotiation failed:', err);
              setStatus('error');
              setError(
                err instanceof Error
                  ? err.message
                  : 'Unable to negotiate the video connection.',
              );
            }
          },
          (err) => {
            console.error('Video room listener failed:', err);
            setStatus('error');
            setError('Unable to listen for consultation updates.');
          },
        );

        if (role === 'doctor') {
          // Create the room before writing candidates or the offer.
          await setDoc(
            roomRef,
            {
              roomId,
              appointmentId,
              doctorId: user.uid,
              status: 'waiting',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            },
            { merge: true },
          );

          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);

          await setDoc(
            roomRef,
            {
              offer: {
                type: peer.localDescription?.type,
                sdp: peer.localDescription?.sdp,
              },
              doctorId: user.uid,
              appointmentId,
              status: 'waiting',
              updatedAt: Timestamp.now(),
            },
            { merge: true },
          );

          setStatus('waiting');
          console.log('[WebRTC] Doctor offer published');
        } else {
          setStatus('waiting');
          console.log('[WebRTC] Patient waiting for doctor offer');
        }
      } catch (err) {
        console.error('[WebRTC] Video call startup failed:', err);

        if (disposed) return;

        setStatus('error');

        const mediaError = err as DOMException;

        if (mediaError?.name === 'NotAllowedError') {
          setError('Camera or microphone permission was denied.');
        } else if (mediaError?.name === 'NotFoundError') {
          setError('No camera or microphone was found on this device.');
        } else if (mediaError?.name === 'NotReadableError') {
          setError('Camera or microphone is already being used by another app.');
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to start video consultation.',
          );
        }
      }
    };

    void startCall();

    return () => {
      disposed = true;
      roomUnsubscribe?.();
      candidateUnsubscribe?.();
      closePeer();
      stopLocalMedia();

      remoteStreamRef.current = null;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [appointmentId, roomId, role, user?.uid]);

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

  const playRemoteVideo = useCallback(async () => {
    try {
      await remoteVideoRef.current?.play();
      setPlaybackBlocked(false);
    } catch (err) {
      console.error('Unable to start remote playback:', err);
      setPlaybackBlocked(true);
    }
  }, []);

  const endCall = useCallback(async () => {
    try {
      await setDoc(
        doc(db, 'videoCalls', roomId),
        {
          status: 'ended',
          endedAt: Timestamp.now(),
          endedBy: user?.uid || null,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error('Error ending video call:', err);
    }

    peerRef.current?.close();
    peerRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setStatus('ended');
    onEndRef.current?.();
  }, [roomId, user?.uid]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-white">
              Video Consultation
            </p>
            <p className="mt-1 text-[12px] text-white/60">
              {status === 'connected'
                ? 'Connected'
                : status === 'waiting'
                  ? 'Waiting for participant...'
                  : status === 'connecting'
                    ? 'Connecting...'
                    : status === 'ended'
                      ? 'Call ended'
                      : 'Connection problem'}
            </p>
          </div>

          <div
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
              status === 'connected'
                ? 'bg-green-500/20 text-green-400'
                : status === 'error'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-white/10 text-white/60'
            }`}
          >
            {status === 'connected'
              ? 'LIVE'
              : status === 'waiting'
                ? 'WAITING'
                : status === 'ended'
                  ? 'ENDED'
                  : status === 'error'
                    ? 'ERROR'
                    : 'CONNECTING'}
          </div>
        </div>
      </div>

      {/* Remote video */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#080808]">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />

        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="max-w-sm px-6 text-center">
              {status === 'error' ? (
                <AlertCircle
                  size={42}
                  className="mx-auto mb-4 text-red-400"
                />
              ) : status === 'ended' ? (
                <PhoneOff size={38} className="mx-auto mb-4 text-white/50" />
              ) : (
                <Loader2
                  size={38}
                  className="mx-auto mb-4 animate-spin text-teal-400"
                />
              )}

              <p className="font-semibold text-white">
                {status === 'waiting'
                  ? 'Waiting for the other participant'
                  : status === 'error'
                    ? 'Unable to connect'
                    : status === 'ended'
                      ? 'Consultation ended'
                      : 'Connecting...'}
              </p>

              {error && (
                <p className="mt-2 text-sm text-white/60">{error}</p>
              )}
            </div>
          </div>
        )}

        {playbackBlocked && (
          <button
            type="button"
            onClick={playRemoteVideo}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"
          >
            Tap to play remote video
          </button>
        )}

        {/* Local preview */}
        <div className="absolute bottom-24 right-4 aspect-video w-32 overflow-hidden rounded-xl border border-white/20 bg-black shadow-xl sm:w-44">
          {!cameraOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#151515]">
              <VideoOff size={22} className="text-white/40" />
            </div>
          )}

          <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
            You
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              muted
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {muted ? <MicOff size={19} /> : <Mic size={19} />}
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              cameraOff
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {cameraOff ? <VideoOff size={19} /> : <Camera size={19} />}
          </button>

          <button
            type="button"
            onClick={endCall}
            aria-label="End consultation"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            <PhoneOff size={21} />
          </button>
        </div>
      </div>
    </div>
  );
}

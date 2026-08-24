'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Camera,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface VideoCallProps {
  appointmentId: string;
  roomId: string;
  role: 'doctor' | 'patient';
  onEnd?: () => void;
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

  const processedCandidates = useRef<Set<string>>(new Set());

  const [status, setStatus] = useState<
    'connecting' | 'waiting' | 'connected' | 'ended' | 'error'
  >('connecting');

  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribeRoom: (() => void) | undefined;
    let unsubscribeCallerCandidates: (() => void) | undefined;
    let unsubscribeCalleeCandidates: (() => void) | undefined;

    const startCall = async () => {
      try {
        /*
         * 1. Get camera + microphone
         */

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        /*
         * 2. Create WebRTC connection
         */

        const peer = new RTCPeerConnection({
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302',
            },
            {
              urls: 'stun:stun1.l.google.com:19302',
            },
          ],
        });

        peerRef.current = peer;

        /*
         * 3. Add our camera/mic to WebRTC
         */

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        /*
         * 4. Receive other person's video
         */

        peer.ontrack = (event) => {
          const remoteStream = event.streams[0];

          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
          }

          setStatus('connected');
        };

        /*
         * 5. Connection status
         */

        peer.onconnectionstatechange = () => {
          if (peer.connectionState === 'connected') {
            setStatus('connected');
          }

          if (
            peer.connectionState === 'failed' ||
            peer.connectionState === 'disconnected'
          ) {
            setStatus('error');
            setError('Video connection was interrupted.');
          }

          if (peer.connectionState === 'closed') {
            setStatus('ended');
          }
        };

        const roomRef = doc(db, 'videoCalls', roomId);

        /*
         * 6. ICE candidates
         */

        peer.onicecandidate = async (event) => {
          if (!event.candidate) return;

          const collectionName =
            role === 'doctor'
              ? 'callerCandidates'
              : 'calleeCandidates';

          await addDoc(
            collection(roomRef, collectionName),
            event.candidate.toJSON()
          );
        };

        /*
         * 7. DOCTOR starts the call
         */

        if (role === 'doctor') {
          const roomSnapshot = await getDoc(roomRef);

          if (!roomSnapshot.exists()) {
            await setDoc(roomRef, {
              roomId,
              appointmentId,
              doctorId: user.uid,
              status: 'waiting',
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          }

          const offer = await peer.createOffer();

          await peer.setLocalDescription(offer);

          await setDoc(
            roomRef,
            {
              offer: {
                type: offer.type,
                sdp: offer.sdp,
              },
              doctorId: user.uid,
              appointmentId,
              status: 'waiting',
              updatedAt: Timestamp.now(),
            },
            { merge: true }
          );

          setStatus('waiting');
        }

        /*
         * 8. PATIENT joins the call
         */

        if (role === 'patient') {
          const roomSnapshot = await getDoc(roomRef);

          if (!roomSnapshot.exists()) {
            setStatus('error');
            setError(
              'The doctor has not started the consultation yet.'
            );
            return;
          }

          const roomData = roomSnapshot.data();

          if (!roomData?.offer) {
            setStatus('waiting');
            return;
          }

          await peer.setRemoteDescription(
            new RTCSessionDescription(roomData.offer)
          );

          const answer = await peer.createAnswer();

          await peer.setLocalDescription(answer);

          await setDoc(
            roomRef,
            {
              patientId: user.uid,
              answer: {
                type: answer.type,
                sdp: answer.sdp,
              },
              status: 'connected',
              updatedAt: Timestamp.now(),
            },
            { merge: true }
          );
        }

        /*
         * 9. Listen for changes to the room
         */

        unsubscribeRoom = onSnapshot(roomRef, async (snapshot) => {
          if (!snapshot.exists()) return;

          const data = snapshot.data();

          /*
           * Doctor receives patient's answer
           */

          if (
            role === 'doctor' &&
            data.answer &&
            !peer.currentRemoteDescription
          ) {
            await peer.setRemoteDescription(
              new RTCSessionDescription(data.answer)
            );

            setStatus('connected');
          }

          /*
           * Other person ended call
           */

          if (data.status === 'ended') {
            setStatus('ended');

            peer.close();
          }
        });

        /*
         * 10. Doctor listens for patient's ICE
         */

        if (role === 'doctor') {
          unsubscribeCalleeCandidates = onSnapshot(
            collection(roomRef, 'calleeCandidates'),
            async (snapshot) => {
              for (const change of snapshot.docChanges()) {
                if (change.type !== 'added') continue;

                if (
                  processedCandidates.current.has(change.doc.id)
                ) {
                  continue;
                }

                processedCandidates.current.add(change.doc.id);

                try {
                  await peer.addIceCandidate(
                    new RTCIceCandidate(change.doc.data())
                  );
                } catch (error) {
                  console.error(
                    'Error adding patient ICE candidate:',
                    error
                  );
                }
              }
            }
          );
        }

        /*
         * 11. Patient listens for doctor's ICE
         */

        if (role === 'patient') {
          unsubscribeCallerCandidates = onSnapshot(
            collection(roomRef, 'callerCandidates'),
            async (snapshot) => {
              for (const change of snapshot.docChanges()) {
                if (change.type !== 'added') continue;

                if (
                  processedCandidates.current.has(change.doc.id)
                ) {
                  continue;
                }

                processedCandidates.current.add(change.doc.id);

                try {
                  await peer.addIceCandidate(
                    new RTCIceCandidate(change.doc.data())
                  );
                } catch (error) {
                  console.error(
                    'Error adding doctor ICE candidate:',
                    error
                  );
                }
              }
            }
          );
        }
      } catch (error: any) {
        console.error('Video call error:', error);

        setStatus('error');

        if (error?.name === 'NotAllowedError') {
          setError(
            'Camera or microphone permission was denied.'
          );
        } else {
          setError(
            error?.message ||
              'Unable to start video consultation.'
          );
        }
      }
    };

    startCall();

    /*
     * Cleanup
     */

    return () => {
      unsubscribeRoom?.();
      unsubscribeCallerCandidates?.();
      unsubscribeCalleeCandidates?.();

      peerRef.current?.close();

      localStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      peerRef.current = null;
      localStreamRef.current = null;
    };
  }, [appointmentId, roomId, role, user?.uid]);

  /*
   * Mute / unmute
   */

  const toggleMute = () => {
    const stream = localStreamRef.current;

    if (!stream) return;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });

    setMuted(!muted);
  };

  /*
   * Camera on/off
   */

  const toggleCamera = () => {
    const stream = localStreamRef.current;

    if (!stream) return;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = cameraOff;
    });

    setCameraOff(!cameraOff);
  };

  /*
   * End call
   */

  const endCall = async () => {
    try {
      await updateDoc(doc(db, 'videoCalls', roomId), {
        status: 'ended',
        endedAt: Timestamp.now(),
        endedBy: user?.uid || null,
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }

    peerRef.current?.close();

    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    setStatus('ended');

    onEnd?.();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">

      {/* HEADER */}

      <div className="absolute top-0 left-0 right-0 z-20 p-5 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">

          <div>
            <p className="text-white font-semibold text-[15px]">
              Video Consultation
            </p>

            <p className="text-white/50 text-[12px] mt-1">
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
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${
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
              : 'CONNECTING'}
          </div>

        </div>
      </div>

      {/* REMOTE VIDEO */}

      <div className="flex-1 relative bg-[#080808] flex items-center justify-center">

        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center">

            <div className="text-center max-w-sm px-6">

              {status === 'error' ? (
                <AlertCircle
                  size={42}
                  className="text-red-400 mx-auto mb-4"
                />
              ) : (
                <Loader2
                  size={38}
                  className="text-teal-400 mx-auto mb-4 animate-spin"
                />
              )}

              <p className="text-white font-semibold">
                {status === 'waiting'
                  ? 'Waiting for the other participant'
                  : status === 'error'
                  ? 'Unable to connect'
                  : status === 'ended'
                  ? 'Consultation ended'
                  : 'Connecting...'}
              </p>

              {error && (
                <p className="text-white/50 text-sm mt-2">
                  {error}
                </p>
              )}

            </div>

          </div>
        )}

        {/* LOCAL VIDEO */}

        <div className="absolute right-4 bottom-24 w-32 sm:w-44 aspect-video rounded-xl overflow-hidden border border-white/20 bg-black shadow-xl">

          {!cameraOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#151515]">
              <VideoOff
                size={22}
                className="text-white/40"
              />
            </div>
          )}

          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px]">
            You
          </div>

        </div>

      </div>

      {/* CONTROLS */}

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">

        <div className="flex justify-center items-center gap-3">

          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              muted
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {muted ? (
              <MicOff size={19} />
            ) : (
              <Mic size={19} />
            )}
          </button>

          <button
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              cameraOff
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {cameraOff ? (
              <VideoOff size={19} />
            ) : (
              <Camera size={19} />
            )}
          </button>

          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
          >
            <PhoneOff size={21} />
          </button>

        </div>

      </div>

    </div>
  );
}
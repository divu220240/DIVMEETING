import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

const configuredTurnUrl = import.meta.env.VITE_TURN_URL;
const configuredTurnUsername = import.meta.env.VITE_TURN_USERNAME;
const configuredTurnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  ...(configuredTurnUrl
    ? [{
        urls: configuredTurnUrl.split(',').map((url) => url.trim()).filter(Boolean),
        username: configuredTurnUsername,
        credential: configuredTurnCredential,
      }]
    : []),
];

export default function useWebRTC(socket, roomId) {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [roomState, setRoomState] = useState({ locked: false, hostId: null });
  const peersRef = useRef({});
  const pendingUsersRef = useRef([]);
  const pendingIceCandidatesRef = useRef({});
  const remoteMediaStreamsRef = useRef({});
  const localStreamRef = useRef(null);
  const hasJoinedRoomRef = useRef(false);

  const prepareLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError('');
      return stream;
    } catch (error) {
      console.error('Unable to access microphone or camera', error);
      setMediaError('Camera and microphone access is required to join the video call.');
      throw error;
    }
  }, []);

  const updateTrackState = useCallback((muted) => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    setIsMuted(muted);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const enabled = !cameraOff;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setCameraOff(!cameraOff);
  }, [cameraOff, localStream]);

  const broadcastNewTrack = useCallback((stream) => {
    Object.values(peersRef.current).forEach(({ pc }) => {
      const senders = pc.getSenders();
      const newTrack = stream.getVideoTracks()[0];
      const sender = senders.find((s) => s.track?.kind === 'video');
      if (sender && newTrack) {
        sender.replaceTrack(newTrack);
      }
    });
  }, []);

  const stopScreenShare = useCallback(async () => {
    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = cameraStream;
    setLocalStream(cameraStream);
    broadcastNewTrack(cameraStream);
    setScreenSharing(false);
  }, [broadcastNewTrack]);

  const startScreenShare = useCallback(async () => {
    if (!localStream) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => screenStream.addTrack(track));
      localStream.getVideoTracks().forEach((track) => track.stop());
      localStreamRef.current = screenStream;
      setLocalStream(screenStream);
      broadcastNewTrack(screenStream);
      setScreenSharing(true);

      const [track] = screenStream.getVideoTracks();
      track.onended = () => stopScreenShare();
    } catch (error) {
      console.error('Screen share failed', error);
    }
  }, [broadcastNewTrack, localStream, stopScreenShare]);

  const createPeerConnection = useCallback(
    (socketId) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', { target: socketId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams[0] || remoteMediaStreamsRef.current[socketId] || new MediaStream();
        remoteMediaStreamsRef.current[socketId] = stream;

        if (!event.streams[0] && event.track && !stream.getTracks().some((track) => track.id === event.track.id)) {
          stream.addTrack(event.track);
        }

        setRemoteStreams((prev) => ({ ...prev, [socketId]: stream }));
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      return pc;
    },
    [socket]
  );

  const queueIceCandidate = useCallback((socketId, candidate) => {
    pendingIceCandidatesRef.current[socketId] = [
      ...(pendingIceCandidatesRef.current[socketId] || []),
      candidate,
    ];
  }, []);

  const flushIceCandidates = useCallback(async (socketId, pc) => {
    const queuedCandidates = pendingIceCandidatesRef.current[socketId] || [];
    if (!queuedCandidates.length || !pc.remoteDescription) return;

    delete pendingIceCandidatesRef.current[socketId];

    for (const candidate of queuedCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('Failed to add queued ICE candidate', error);
      }
    }
  }, []);

  const createOffer = useCallback(
    async (targetSocketId) => {
      if (!targetSocketId || targetSocketId === socket.id) return;

      peersRef.current[targetSocketId]?.pc.close();
      const pc = createPeerConnection(targetSocketId);
      peersRef.current[targetSocketId] = { pc, socketId: targetSocketId };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal_offer', { target: targetSocketId, caller: user, sdp: offer });
      } catch (error) {
        console.error('Failed to create WebRTC offer', error);
      }
    },
    [createPeerConnection, socket, user]
  );

  const handleNewParticipant = useCallback(
    async ({ socketId, user: remoteUser }) => {
      setParticipants((prev) => [...prev.filter((p) => p.socketId !== socketId), { socketId, user: remoteUser }]);
      await createOffer(socketId);
    },
    [createOffer]
  );

  useEffect(() => {
    if (!socket) return;

    socket.on('room_users', async ({ users, hostId, locked }) => {
      setRoomState({ hostId, locked });
      setParticipants(users.map((u) => ({ socketId: u.socketId, user: { id: u.id, name: u.name }, muted: u.muted })));

      users.forEach((existingUser) => {
        if (localStreamRef.current) {
          createOffer(existingUser.socketId);
        } else {
          pendingUsersRef.current.push(existingUser);
        }
      });
    });

    socket.on('user_joined', ({ user }) => {
      setParticipants((prev) => [...prev.filter((p) => p.socketId !== user.socketId), { socketId: user.socketId, user: { id: user.id, name: user.name }, muted: false }]);
    });

    socket.on('receive_offer', async ({ sdp, sender }) => {
      peersRef.current[sender]?.pc.close();
      const pc = createPeerConnection(sender);
      peersRef.current[sender] = { pc, socketId: sender };
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushIceCandidates(sender, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal_answer', { target: sender, sdp: answer });
      } catch (error) {
        console.error('Failed to handle WebRTC offer', error);
      }
    });

    socket.on('receive_answer', async ({ sdp, sender }) => {
      const peer = peersRef.current[sender];
      if (peer) {
        try {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushIceCandidates(sender, peer.pc);
        } catch (error) {
          console.error('Failed to handle WebRTC answer', error);
        }
      }
    });

    socket.on('ice_candidate', async ({ candidate, sender }) => {
      const peer = peersRef.current[sender];
      if (!peer || !peer.pc.remoteDescription) {
        queueIceCandidate(sender, candidate);
        return;
      }

      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('Failed to add ICE candidate', error);
      }
    });

    socket.on('participant_muted', ({ target, muted }) => {
      setParticipants((prev) => prev.map((p) => (p.socketId === target ? { ...p, muted } : p)));
      if (target === socket.id) {
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          track.enabled = !muted;
        });
        setIsMuted(muted);
      }
    });

    socket.on('user_removed', ({ target }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== target));
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[target];
        return next;
      });
      delete pendingIceCandidatesRef.current[target];
      delete remoteMediaStreamsRef.current[target];
      if (peersRef.current[target]) {
        peersRef.current[target].pc.close();
        delete peersRef.current[target];
      }
    });

    socket.on('user_left', ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      delete pendingIceCandidatesRef.current[socketId];
      delete remoteMediaStreamsRef.current[socketId];
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].pc.close();
        delete peersRef.current[socketId];
      }
    });

    socket.on('room_locked_state', ({ locked }) => {
      setRoomState((prev) => ({ ...prev, locked }));
    });

    socket.on('removed_from_room', () => {
      window.location.href = '/dashboard';
    });

    socket.on('host_changed', ({ hostId }) => {
      setRoomState((prev) => ({ ...prev, hostId }));
    });

    return () => {
      socket.off('room_users');
      socket.off('user_joined');
      socket.off('receive_offer');
      socket.off('receive_answer');
      socket.off('ice_candidate');
      socket.off('participant_muted');
      socket.off('user_removed');
      socket.off('user_left');
      socket.off('room_locked_state');
      socket.off('removed_from_room');
      socket.off('host_changed');
    };
  }, [socket, createPeerConnection, createOffer, flushIceCandidates, queueIceCandidate]);

  useEffect(() => {
    if (!localStream) return;

    Object.values(peersRef.current).forEach(({ pc }) => {
      localStream.getTracks().forEach((track) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, localStream);
        }
      });
    });

    if (pendingUsersRef.current.length && socket) {
      pendingUsersRef.current.forEach((user) => createOffer(user.socketId));
      pendingUsersRef.current = [];
    }
  }, [localStream, socket, createOffer]);

  useEffect(() => {
    if (!socket || !roomId || !localStream || hasJoinedRoomRef.current) return;
    hasJoinedRoomRef.current = true;
    socket.emit('join_room', { roomId });
  }, [socket, roomId, localStream]);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      Object.values(peersRef.current).forEach(({ pc }) => pc.close());
      peersRef.current = {};
      pendingIceCandidatesRef.current = {};
      remoteMediaStreamsRef.current = {};
      hasJoinedRoomRef.current = false;
    };
  }, []);

  return {
    user,
    localStream,
    remoteStreams,
    participants,
    roomState,
    isMuted,
    cameraOff,
    screenSharing,
    mediaError,
    prepareLocalMedia,
    updateTrackState,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    handleNewParticipant,
    setIsMuted,
    setCameraOff,
    setScreenSharing,
  };
}

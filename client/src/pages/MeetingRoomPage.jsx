import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useSocket from '../hooks/useSocket';
import useWebRTC from '../hooks/useWebRTC';
import AIInsightsPanel from '../components/AIInsightsPanel';
import ChatPanel from '../components/ChatPanel';
import HostControls from '../components/HostControls';
import ParticipantList from '../components/ParticipantList';
import SmartNotesPanel from '../components/SmartNotesPanel';
import VideoTile from '../components/VideoTile';
import { chatWithMeetingAssistant, generateMeetingInsights } from '../services/aiService';
import { getMeetingById } from '../services/meetingService';
import { formatUrl } from '../services/socketService';

export default function MeetingRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const {
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
  } = useWebRTC(socket, roomId);

  const [meetingTitle, setMeetingTitle] = useState('Meeting Room');
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState({
    content: '',
    lastEditedBy: null,
    lastEditedAt: null,
    actionItems: [],
  });
  const [roomError, setRoomError] = useState('');
  const [aiInsightsResult, setAiInsightsResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiBriefType, setAiBriefType] = useState('full');
  const [aiChatMessages, setAiChatMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask me to summarize, find risks, draft follow-ups, or explain what changed in this meeting.',
      provider: 'local',
    },
  ]);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isHost = useMemo(() => roomState.hostId === user?.id, [roomState.hostId, user]);
  const participantNamesBySocket = useMemo(
    () => Object.fromEntries(participants.map((participant) => [participant.socketId, participant.user?.name || 'Participant'])),
    [participants]
  );
  const participantCount = Math.max(participants.length, Object.keys(remoteStreams).length + (localStream ? 1 : 0));
  const elapsedTime = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [elapsedSeconds]);

  useEffect(() => {
    prepareLocalMedia().catch((error) => console.error(error));
  }, [prepareLocalMedia]);

  useEffect(() => {
    const loadMeeting = async () => {
      try {
        const data = await getMeetingById(roomId);
        setMeetingTitle(data.meeting.title);
      } catch (error) {
        console.error(error);
      }
    };
    loadMeeting();
  }, [roomId]);

  useEffect(() => {
    formatUrl(roomId).then(setInviteLink).catch(() => setInviteLink(''));
  }, [roomId]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_chat_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('room_locked', ({ message }) => {
      setRoomError(message);
    });

    socket.on('participant_joined_message', ({ message, timestamp }) => {
      setMessages((prev) => [
        ...prev,
        { sender: { name: 'System' }, message, timestamp: timestamp || new Date().toISOString() },
      ]);
    });

    socket.on('user_raised_hand', ({ user: raising }) => {
      setMessages((prev) => [
        ...prev,
        { sender: { name: 'System' }, message: `${raising.name} raised their hand`, timestamp: new Date().toISOString() },
      ]);
    });

    socket.on('room_notes_state', (nextNotes) => {
      setNotes({
        content: nextNotes?.content || '',
        lastEditedBy: nextNotes?.lastEditedBy || null,
        lastEditedAt: nextNotes?.lastEditedAt || null,
        actionItems: Array.isArray(nextNotes?.actionItems) ? nextNotes.actionItems : [],
      });
    });

    return () => {
      socket.off('new_chat_message');
      socket.off('room_locked');
      socket.off('participant_joined_message');
      socket.off('user_raised_hand');
      socket.off('room_notes_state');
    };
  }, [socket]);

  const handleSendMessage = (text) => {
    if (!socket) return;
    const payload = { roomId, message: text };
    socket.emit('chat_message', payload);
    setMessages((prev) => [...prev, { sender: { name: user.name }, message: text, timestamp: new Date().toISOString() }]);
  };

  const handleMute = (target, muted) => {
    if (!socket) return;
    socket.emit('host_toggle_mute', { roomId, target, muted });
  };

  const handleRemove = (target) => {
    if (!socket) return;
    socket.emit('host_remove_user', { roomId, target });
  };

  const handleLockToggle = (locked) => {
    if (!socket) return;
    socket.emit('host_lock_room', { roomId, locked });
  };

  const handleRaiseHand = () => {
    if (!socket) return;
    socket.emit('raise_hand', { roomId });
  };

  const handleNotesChange = useCallback((content) => {
    if (!socket) return;
    socket.emit('meeting_notes_update', { roomId, content });
  }, [roomId, socket]);

  const handleAddActionItem = useCallback((text) => {
    if (!socket) return;
    socket.emit('action_item_add', { roomId, text });
  }, [roomId, socket]);

  const handleToggleActionItem = useCallback((itemId) => {
    if (!socket) return;
    socket.emit('action_item_toggle', { roomId, itemId });
  }, [roomId, socket]);

  const handleDeleteActionItem = useCallback((itemId) => {
    if (!socket) return;
    socket.emit('action_item_delete', { roomId, itemId });
  }, [roomId, socket]);

  const handleGenerateInsights = async () => {
    setAiLoading(true);
    setAiError('');

    try {
      const result = await generateMeetingInsights({
        title: meetingTitle,
        roomId,
        notes,
        messages,
        briefType: aiBriefType,
      });
      setAiInsightsResult(result);
    } catch (error) {
      setAiError(error.message || 'Unable to generate AI insights right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAskAssistant = async (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed || aiChatLoading) return;

    setAiChatMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setAiChatLoading(true);
    setAiError('');

    try {
      const result = await chatWithMeetingAssistant({
        title: meetingTitle,
        roomId,
        notes,
        messages,
        assistantMessages: aiChatMessages,
        prompt: trimmed,
      });
      setAiChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          provider: result.provider,
          model: result.model,
        },
      ]);
    } catch (error) {
      setAiChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error.message || 'I could not answer that right now.',
          provider: 'error',
        },
      ]);
    } finally {
      setAiChatLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 1800);
    } catch {
      setCopiedInvite(false);
    }
  };

  const handleLeaveMeeting = () => {
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`soft-badge ${connected ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-300/20 bg-rose-500/10 text-rose-200'}`}>
                {connected ? 'Connected' : 'Connecting'}
              </span>
              <span className="soft-badge">{participantCount} participant{participantCount === 1 ? '' : 's'}</span>
              <span className="soft-badge">{elapsedTime}</span>
              {isHost && <span className="soft-badge border-cyan-300/20 bg-cyan-300/10 text-cyan-200">Host</span>}
            </div>
            <h1 className="text-3xl font-black text-white">{meetingTitle}</h1>
            <p className="mt-2 break-all text-sm text-slate-400">Room ID: {roomId}</p>
            {inviteLink && (
              <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
                <a href={inviteLink} className="break-all text-cyan-200 hover:text-cyan-100">{inviteLink}</a>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="secondary-button w-fit px-3 py-2 text-xs"
                >
                  {copiedInvite ? 'Copied' : 'Copy Invite'}
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => updateTrackState(!isMuted)}
              className="secondary-button"
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={toggleCamera}
              className="secondary-button"
            >
              {cameraOff ? 'Enable Camera' : 'Disable Camera'}
            </button>
            <button
              onClick={screenSharing ? stopScreenShare : startScreenShare}
              className="primary-button"
            >
              {screenSharing ? 'Stop Share' : 'Share Screen'}
            </button>
            <button
              onClick={handleRaiseHand}
              className="secondary-button"
            >
              Raise Hand
            </button>
            <button
              onClick={handleLeaveMeeting}
              className="danger-button"
            >
              Leave
            </button>
          </div>
        </div>
        {!connected && <p className="mt-4 text-sm text-rose-300">Connecting to meeting...</p>}
        {mediaError && <p className="mt-4 text-sm text-rose-300">{mediaError}</p>}
        {roomError && <p className="mt-4 text-sm text-rose-300">{roomError}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-lg font-bold">Your camera</h2>
              <VideoTile stream={localStream} label="Local Video" isLocal />
            </div>
            <div>
              <h2 className="mb-4 text-lg font-bold">Remote participants</h2>
              <div className="grid gap-4">
                {Object.entries(remoteStreams).length === 0 ? (
                  <div className="panel-compact p-8 text-slate-500">Waiting for other participants to join.</div>
                ) : (
                  Object.entries(remoteStreams).map(([key, stream]) => (
                    <VideoTile key={key} stream={stream} label={participantNamesBySocket[key] || 'Participant'} />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <ChatPanel messages={messages} onSend={handleSendMessage} />
            <div className="space-y-4">
              <HostControls
                participants={participants}
                onMute={handleMute}
                onRemove={handleRemove}
                locked={roomState.locked}
                onLockToggle={handleLockToggle}
                isHost={isHost}
              />
              <ParticipantList participants={participants} hostId={roomState.hostId} currentUserId={socket?.id} />
            </div>
          </div>

          <SmartNotesPanel
            notes={notes}
            onNotesChange={handleNotesChange}
            onAddActionItem={handleAddActionItem}
            onToggleActionItem={handleToggleActionItem}
            onDeleteActionItem={handleDeleteActionItem}
          />

          <AIInsightsPanel
            insightsResult={aiInsightsResult}
            loading={aiLoading}
            error={aiError}
            briefType={aiBriefType}
            chatMessages={aiChatMessages}
            chatLoading={aiChatLoading}
            onBriefTypeChange={setAiBriefType}
            onGenerate={handleGenerateInsights}
            onAskAssistant={handleAskAssistant}
          />
        </div>
      </div>
    </div>
  );
}

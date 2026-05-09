import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createMeeting, getMeetingHistory } from '../services/meetingService';
import MeetingCard from '../components/MeetingCard';
import { formatUrl } from '../services/socketService';

const MEETING_TEMPLATES = ['Daily Standup', 'Client Review', 'Team Sync', 'Webinar Session'];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [title, setTitle] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [status, setStatus] = useState('');
  const [joinStatus, setJoinStatus] = useState('');
  const [link, setLink] = useState('');
  const [inviteLinks, setInviteLinks] = useState({});
  const [copiedLink, setCopiedLink] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getMeetingHistory();
        setHistory(data.meetings);
        const entries = await Promise.all(data.meetings.map(async (meeting) => [meeting.roomId, await formatUrl(meeting.roomId)]));
        setInviteLinks(Object.fromEntries(entries));
      } catch (error) {
        console.error(error);
      }
    };

    loadHistory();
  }, []);

  const dashboardStats = useMemo(() => {
    const openMeetings = history.filter((meeting) => !meeting.locked).length;
    return [
      { label: 'Total rooms', value: history.length },
      { label: 'Open rooms', value: openMeetings },
      { label: 'Locked rooms', value: history.length - openMeetings },
    ];
  }, [history]);

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...history]
      .filter((meeting) => {
        const matchesTerm = !term || meeting.title?.toLowerCase().includes(term) || meeting.roomId?.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === 'all' || (statusFilter === 'open' && !meeting.locked) || (statusFilter === 'locked' && meeting.locked);
        return matchesTerm && matchesStatus;
      })
      .sort((a, b) => {
        const first = new Date(a.createdAt || 0).getTime();
        const second = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'oldest' ? first - second : second - first;
      });
  }, [history, search, sortOrder, statusFilter]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    try {
      setStatus('Creating meeting...');
      const data = await createMeeting({ title });
      const meetingLink = await formatUrl(data.meeting.roomId);
      setLink(meetingLink);
      setHistory((prev) => [data.meeting, ...prev]);
      setInviteLinks((prev) => ({ ...prev, [data.meeting.roomId]: meetingLink }));
      setTitle('');
      setStatus('Meeting created successfully');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const extractRoomId = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      const meetingIndex = segments.indexOf('meeting');
      return meetingIndex >= 0 ? segments[meetingIndex + 1] || '' : segments[segments.length - 1] || '';
    } catch {
      const segments = trimmed.split('/').filter(Boolean);
      return segments[segments.length - 1] || '';
    }
  };

  const handleJoinExisting = (event) => {
    event.preventDefault();
    const roomId = extractRoomId(joinInput);

    if (!roomId) {
      setJoinStatus('Paste a valid invite link or room ID.');
      return;
    }

    setJoinStatus('');
    navigate(`/meeting/${roomId}`);
  };

  const copyInviteLink = async (inviteLink) => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(inviteLink);
      window.setTimeout(() => setCopiedLink(''), 1800);
    } catch {
      setCopiedLink('');
    }
  };

  const shareInviteLink = async (meeting, inviteLink) => {
    if (!inviteLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: meeting.title,
          text: `Join ${meeting.title} on DivMeeting`,
          url: inviteLink,
        });
        return;
      } catch {
        return;
      }
    }

    copyInviteLink(inviteLink);
  };

  const exportHistory = () => {
    const headers = ['Title', 'Room ID', 'Status', 'Created At', 'Invite Link'];
    const rows = filteredHistory.map((meeting) => [
      meeting.title,
      meeting.roomId,
      meeting.locked ? 'Locked' : 'Open',
      meeting.createdAt ? new Date(meeting.createdAt).toLocaleString() : '',
      inviteLinks[meeting.roomId] || '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = 'divmeeting-history.csv';
    linkElement.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-8">
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-eyebrow">Meeting command center</p>
            <h1 className="mt-3 text-4xl font-black tracking-normal text-white">Welcome, {user?.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Create private rooms, rejoin previous sessions, and share clean invite links from one fast workspace.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {dashboardStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3">
                <div className="text-3xl font-black text-white">{item.value}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter meeting title"
            className="control w-full px-5 py-4"
          />
          <button className="primary-button px-6 py-4">
            Create Meeting
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {MEETING_TEMPLATES.map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => setTitle(template)}
              className="soft-badge hover:border-cyan-300/40 hover:text-cyan-100"
            >
              {template}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-400">{status}</p>
        {link && (
          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
            <div className="mb-2 section-eyebrow text-[0.65rem]">Latest invite link</div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <a href={link} className="break-all text-cyan-200 hover:text-cyan-100">{link}</a>
              <button
                type="button"
                onClick={() => copyInviteLink(link)}
                className="secondary-button shrink-0 px-4 py-2"
              >
                {copiedLink === link ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="panel">
          <h2 className="text-2xl font-black text-white">Join existing meeting</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Paste an invite link or room ID to enter a meeting.</p>
          <form onSubmit={handleJoinExisting} className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Paste invite link or room ID"
              className="control w-full px-5 py-4"
            />
            <button className="primary-button px-6 py-4">
              Join Meeting
            </button>
          </form>
          {joinStatus && <p className="mt-3 text-sm text-rose-300">{joinStatus}</p>}
        </div>

        <div className="panel">
          <h2 className="text-2xl font-black text-white">Quick tips</h2>
          <div className="mt-5 grid gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">Share the invite link before the call so guests can enter directly.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">Use lock room after everyone joins to avoid unexpected participants.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4">For Android calls, use HTTPS and allow camera and microphone permissions.</div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Meeting history</h2>
            <span className="text-sm text-slate-400">Search, filter, copy, and rejoin hosted meetings</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings"
              className="control"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="control"
            >
              <option value="all">All status</option>
              <option value="open">Open only</option>
              <option value="locked">Locked only</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="control"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button
              type="button"
              onClick={exportHistory}
              disabled={filteredHistory.length === 0}
              className="secondary-button"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {history.length === 0 ? (
            <div className="panel text-slate-400">No meetings yet.</div>
          ) : filteredHistory.length === 0 ? (
            <div className="panel text-slate-400">No meetings match your filters.</div>
          ) : (
            filteredHistory.map((meeting) => (
              <MeetingCard
                key={meeting.roomId}
                meeting={meeting}
                inviteLink={inviteLinks[meeting.roomId]}
                onCopyInvite={copyInviteLink}
                onShareInvite={shareInviteLink}
                copyLabel={copiedLink === inviteLinks[meeting.roomId] ? 'Copied' : 'Copy'}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

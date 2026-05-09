import { Link } from 'react-router-dom';

export default function MeetingCard({ meeting, inviteLink, onCopyInvite, onShareInvite, copyLabel = 'Copy' }) {
  const createdAt = meeting.createdAt ? new Date(meeting.createdAt).toLocaleString() : 'Just now';

  return (
    <div className="panel-compact transition hover:-translate-y-0.5 hover:border-cyan-300/35">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-white">{meeting.title}</h3>
          <p className="mt-1 break-all text-sm text-slate-400">Room ID: {meeting.roomId}</p>
        </div>
        <span className={`soft-badge shrink-0 ${meeting.locked ? 'border-rose-300/20 bg-rose-500/10 text-rose-200' : 'border-emerald-300/20 bg-emerald-500/10 text-emerald-200'}`}>
          {meeting.locked ? 'Locked' : 'Open'}
        </span>
      </div>
      {inviteLink && (
        <div className="mb-4 rounded-xl border border-cyan-300/15 bg-cyan-300/8 p-3 text-sm text-cyan-100">
          <div className="mb-2 section-eyebrow text-[0.65rem]">Invite link</div>
          <div className="flex flex-col gap-3">
            <a href={inviteLink} className="break-all text-cyan-200 hover:text-cyan-100">
              {inviteLink}
            </a>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onCopyInvite?.(inviteLink)}
                className="secondary-button px-3 py-2 text-xs"
              >
                {copyLabel}
              </button>
              <button
                type="button"
                onClick={() => onShareInvite?.(meeting, inviteLink)}
                className="secondary-button px-3 py-2 text-xs"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">Created {createdAt}</p>
        <Link
          to={`/meeting/${meeting.roomId}`}
          className="primary-button shrink-0 px-4 py-2.5"
        >
          Join Again
        </Link>
      </div>
    </div>
  );
}

export default function ParticipantList({ participants, hostId, currentUserId }) {
  return (
    <div className="panel-compact">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Participants</h2>
        <span className="soft-badge">{participants.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {participants.length === 0 ? (
          <p className="text-slate-500">Waiting for participants...</p>
        ) : (
          participants.map((participant) => (
            <div key={participant.socketId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/65 px-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-100">{participant.user.name}</p>
                <p className="text-xs text-slate-500">{participant.socketId === currentUserId ? 'You' : ''}</p>
              </div>
              <span className={`soft-badge shrink-0 ${hostId === participant.user.id ? 'border-cyan-300/25 bg-cyan-300 text-slate-950' : ''}`}>
                {hostId === participant.user.id ? 'Host' : 'Guest'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function HostControls({ participants, onMute, onRemove, locked, onLockToggle, isHost }) {
  return (
    <div className="panel-compact">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Host Controls</h2>
          <p className="text-sm text-slate-400">Manage room permissions and participants.</p>
        </div>
        <button
          onClick={() => onLockToggle(!locked)}
          disabled={!isHost}
          className="primary-button px-4 py-2"
        >
          {locked ? 'Unlock Room' : 'Lock Room'}
        </button>
      </div>

      <div className="space-y-3">
        {participants.length === 0 ? (
          <p className="text-slate-500">No participants yet.</p>
        ) : (
          participants.map((participant) => (
            <div key={participant.socketId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/65 px-3 py-3">
              <div>
                <p className="font-medium text-slate-100">{participant.user.name}</p>
                <p className="text-xs text-slate-500">{participant.muted ? 'Muted' : 'Active'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!isHost}
                  onClick={() => onMute(participant.socketId, !participant.muted)}
                  className="secondary-button px-3 py-2 text-xs"
                >
                  {participant.muted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  disabled={!isHost}
                  onClick={() => onRemove(participant.socketId)}
                  className="danger-button px-3 py-2 text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';

export default function SmartNotesPanel({
  notes,
  onNotesChange,
  onAddActionItem,
  onToggleActionItem,
  onDeleteActionItem,
}) {
  const [draft, setDraft] = useState(notes.content || '');
  const [actionText, setActionText] = useState('');

  const completedCount = useMemo(
    () => notes.actionItems.filter((item) => item.done).length,
    [notes.actionItems]
  );

  useEffect(() => {
    setDraft(notes.content || '');
  }, [notes.content]);

  useEffect(() => {
    if (draft === (notes.content || '')) return;

    const timeoutId = window.setTimeout(() => {
      onNotesChange(draft);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [draft, notes.content, onNotesChange]);

  const handleAddActionItem = (event) => {
    event.preventDefault();
    const trimmed = actionText.trim();
    if (!trimmed) return;

    onAddActionItem(trimmed);
    setActionText('');
  };

  return (
    <div className="panel-compact flex h-full flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Smart Notes</h2>
          <p className="text-sm text-slate-500">
            Shared notes and action items stay live for everyone in the room.
          </p>
        </div>
        <div className="soft-badge">
          {completedCount}/{notes.actionItems.length} done
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/65 p-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="scroll-area min-h-44 w-full resize-none bg-transparent text-sm leading-6 text-slate-100 placeholder:text-slate-600"
          placeholder="Capture decisions, blockers, and follow-ups while the meeting runs."
          maxLength={8000}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-slate-500">
          <span>{draft.length}/8000 characters</span>
          {notes.lastEditedBy && notes.lastEditedAt && (
            <span>
              Edited by {notes.lastEditedBy.name} at {new Date(notes.lastEditedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleAddActionItem} className="flex gap-2">
        <input
          value={actionText}
          onChange={(event) => setActionText(event.target.value)}
          className="control min-w-0 flex-1"
          placeholder="Add an action item"
          maxLength={240}
        />
        <button
          type="submit"
          className="primary-button px-4"
        >
          Add
        </button>
      </form>

      <div className="space-y-2">
        {notes.actionItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
            No action items yet.
          </p>
        ) : (
          notes.actionItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/65 p-3">
              <button
                type="button"
                onClick={() => onToggleActionItem(item.id)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                  item.done
                    ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                    : 'border-slate-700 text-transparent hover:border-cyan-300'
                }`}
                aria-label={item.done ? 'Mark action item open' : 'Mark action item done'}
              >
                OK
              </button>
              <div className="min-w-0 flex-1">
                <p className={`break-words text-sm ${item.done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                  {item.text}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Added by {item.createdBy?.name || 'Participant'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDeleteActionItem(item.id)}
                className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-rose-500/10 hover:text-rose-200"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

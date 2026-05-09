import { useMemo, useState } from 'react';

const sectionLabels = {
  agenda: 'Agenda Signals',
  keyTopics: 'Key Topics',
  highlights: 'Highlights',
  decisions: 'Decisions',
  actionItems: 'Action Items',
  risks: 'Risks',
  followUps: 'Follow-ups',
  questions: 'Open Questions',
  nextBestActions: 'Next Best Actions',
};

const briefTypes = [
  { value: 'full', label: 'Full' },
  { value: 'executive', label: 'Exec' },
  { value: 'action', label: 'Action' },
  { value: 'risk', label: 'Risk' },
];

const prioritySections = {
  executive: ['highlights', 'decisions', 'risks', 'nextBestActions'],
  action: ['actionItems', 'nextBestActions', 'followUps', 'questions'],
  risk: ['risks', 'questions', 'followUps', 'decisions'],
  full: Object.keys(sectionLabels),
};

const promptChips = [
  'Summarize this meeting',
  'What are the risks?',
  'List next actions',
  'Draft a follow-up message',
];

export default function AIInsightsPanel({
  insightsResult,
  loading,
  error,
  briefType,
  chatMessages,
  chatLoading,
  onBriefTypeChange,
  onGenerate,
  onAskAssistant,
}) {
  const [draft, setDraft] = useState('');
  const insights = insightsResult?.insights;
  const providerLabel = insightsResult?.provider === 'openai'
    ? `OpenAI ${insightsResult.model}`
    : insightsResult?.provider === 'gemini'
      ? `Gemini ${insightsResult.model}`
      : 'Local analyzer';
  const visibleSections = prioritySections[briefType] || prioritySections.full;
  const healthScore = Math.max(0, Math.min(100, Number(insights?.meetingHealth?.score) || 0));
  const scoreTone = healthScore >= 80
    ? 'text-emerald-200'
    : healthScore >= 60
      ? 'text-cyan-200'
      : 'text-amber-200';
  const lastAssistantProvider = useMemo(() => (
    [...(chatMessages || [])].reverse().find((message) => message.role === 'assistant' && message.model)
  ), [chatMessages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt) return;

    onAskAssistant(prompt);
    setDraft('');
  };

  return (
    <div className="panel-compact">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="soft-badge mb-2 border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
            AI Assistant
          </div>
          <h2 className="text-lg font-bold text-white">Meeting Intelligence</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ask anything, or generate briefs, risks, decisions, questions, and next actions from the live meeting.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="grid grid-cols-4 rounded-xl border border-white/10 bg-slate-950/65 p-1">
            {briefTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onBriefTypeChange(type.value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  briefType === type.value
                    ? 'bg-cyan-300 text-slate-950'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="primary-button w-full sm:w-auto"
          >
            {loading ? 'Thinking...' : 'Generate Brief'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {!insights && !error && (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
          No brief yet. Add notes or chat messages, then generate the AI brief.
        </div>
      )}

      {insights && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/65 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-200">Summary</h3>
              <span className="soft-badge">{providerLabel}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{insights.summary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs text-slate-500">Meeting health</p>
                <p className={`mt-1 text-sm font-semibold ${scoreTone}`}>
                  {insights.meetingHealth?.status || 'Focused'} - {healthScore}%
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs text-slate-500">Tone</p>
                <p className="mt-1 text-sm font-semibold text-cyan-200">{insights.sentiment || 'Neutral'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs text-slate-500">Confidence</p>
                <p className="mt-1 text-sm font-semibold text-slate-200">{insights.confidence || 'Medium'}</p>
              </div>
            </div>
            {insights.meetingHealth?.rationale && (
              <p className="mt-3 text-xs leading-5 text-slate-500">{insights.meetingHealth.rationale}</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {visibleSections.map((key) => (
              <div key={key} className="rounded-xl border border-white/10 bg-slate-950/65 p-4">
                <h3 className="text-sm font-bold text-slate-200">{sectionLabels[key]}</h3>
                {insights[key]?.length ? (
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {insights[key].map((item, index) => (
                      <li key={`${key}-${index}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">Nothing detected yet.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/65 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Ask Assistant</h3>
            <p className="mt-1 text-xs text-slate-500">Ask general questions or chat with your meeting context.</p>
          </div>
          {lastAssistantProvider && (
            <span className="soft-badge">
              {lastAssistantProvider.provider === 'gemini' ? `Gemini ${lastAssistantProvider.model}` : lastAssistantProvider.model}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {promptChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onAskAssistant(chip)}
              disabled={chatLoading}
              className="soft-badge hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="scroll-area mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {(chatMessages || []).map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'bg-cyan-300 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-200'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="control min-w-0 flex-1"
            placeholder="Ask anything, or ask about decisions, risks, and follow-ups"
            maxLength={800}
          />
          <button
            type="submit"
            disabled={chatLoading || !draft.trim()}
            className="primary-button px-5"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}

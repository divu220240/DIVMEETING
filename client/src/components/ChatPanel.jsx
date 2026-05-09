import { useState } from 'react';

export default function ChatPanel({ messages, onSend }) {
  const [text, setText] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="panel-compact flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Live Chat</h2>
        <span className="soft-badge">{messages.length}</span>
      </div>
      <div className="scroll-area flex-1 space-y-3 overflow-y-auto pr-2 text-sm text-slate-300">
        {messages.length === 0 ? (
          <p className="text-slate-500">Chat is empty. Start the conversation.</p>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="rounded-xl border border-white/10 bg-slate-950/65 p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-300">{message.sender.name}</span>
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="mt-1 text-slate-100">{message.message}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="control min-w-0 flex-1"
          placeholder="Send a message"
        />
        <button type="submit" className="primary-button px-4">
          Send
        </button>
      </form>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';

export default function ChatAssistant({ messages, onSend, loading, onClose, isOpen }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 w-[min(100vw-2.5rem,22rem)] card shadow-float flex flex-col overflow-hidden z-50 max-h-[min(85vh,28rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="font-medium text-text-primary text-sm">Assistant</h3>
          <p className="text-xs text-text-secondary">Help with scenes and publishing</p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Close chat">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px]">
        {messages.length === 0 ? (
          <p className="text-text-secondary text-sm leading-relaxed">
            Ask for help refining a scene, adjusting narration, or preparing publishing materials.
          </p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-white' : 'bg-surface-muted border border-border text-text-primary'}`}>
                <p className="whitespace-pre-wrap">
                  {m.content}
                  {loading && i === messages.length - 1 && m.role === 'assistant' && (
                    <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-current animate-pulse align-middle" aria-hidden />
                  )}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-surface-muted border border-border rounded-lg px-3 py-2 text-text-secondary text-sm">Working…</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-surface">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={loading}
            className="input-field !py-2 text-sm flex-1"
            aria-label="Chat message"
          />
          <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-3.5 text-sm">Send</button>
        </div>
      </form>
    </div>
  );
}

export function ChatFab({ onClick }) {
  return (
    <div className="fixed bottom-5 right-5 z-40 group">
      <span className="absolute bottom-full right-0 mb-2 px-2 py-1 rounded-md bg-text-primary text-white text-[11px] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Assistant
      </span>
      <button
        type="button"
        onClick={onClick}
        className="w-12 h-12 rounded-full bg-primary text-white shadow-float hover:bg-primary-dark active:scale-[0.98] transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Open assistant"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>
  );
}

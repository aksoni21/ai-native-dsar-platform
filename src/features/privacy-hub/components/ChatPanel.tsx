'use client';

// Minimal chat UI for the Privacy Hub agent. Self-contained — uses no
// shadcn primitives or AgentMessage components from src/components/. Once
// the visual port is ready (map, sidebar, scorecards), this panel gets
// embedded inside the larger view; for now it's the whole page so the
// agent stack can be smoke-tested end-to-end.

import { useEffect, useRef, useState, FormEvent } from 'react';
import { useAgent } from '../hooks/useAgent';

export function ChatPanel() {
  const { messages, isLoading, sendMessage, clearMessages } = useAgent();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isLoading) return;
    sendMessage(text);
    setDraft('');
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Gemma · Privacy Hub</h2>
          <p className="text-xs text-zinc-500">
            US state laws · AI provider policies
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-zinc-500 space-y-2">
            <p>Ask about a state law or an AI provider policy.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>How does CCPA compare to VCDPA on DSAR deadlines?</li>
              <li>Which states require GPC?</li>
              <li>Does ChatGPT Enterprise train on my prompts?</li>
              <li>Compare Claude API and OpenAI API on retention.</li>
            </ul>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
              {m.role}
            </div>
            {m.toolCalls && m.toolCalls.length > 0 && (
              <div className="mb-2 space-y-1">
                {m.toolCalls.map((tc) => (
                  <div
                    key={tc.id}
                    className="rounded border border-zinc-200 dark:border-zinc-800 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 font-mono"
                  >
                    {tc.status === 'calling' ? '⟳' : '✓'} {tc.name}
                  </div>
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isLoading}
          placeholder="Ask Gemma…"
          className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <button
          type="submit"
          disabled={isLoading || !draft.trim()}
          className="rounded bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

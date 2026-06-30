'use client';

import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { Send, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  suggestedQueries?: string[];
  /**
   * Drop-in text from outside (header preset buttons). The nonce changes on
   * every click so the same preset can be re-fired; the text is what we set
   * the textarea to. Caller is responsible for sending — we only populate.
   */
  prefillRequest?: { text: string; nonce: number } | null;
}

export function AgentInput({ onSend, isLoading, suggestedQueries, prefillRequest }: AgentInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When a preset button fires, sync the textarea, focus it, and resize to fit.
  useEffect(() => {
    if (!prefillRequest) return;
    setValue(prefillRequest.text);
    const el = textareaRef.current;
    if (el) {
      el.focus();
      // Defer the resize one tick so the new value is in the DOM first.
      requestAnimationFrame(() => {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      });
    }
  }, [prefillRequest?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Suggested query chips */}
      {suggestedQueries && suggestedQueries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {suggestedQueries.map((q) => (
            <button
              key={q}
              onClick={() => onSend(q)}
              disabled={isLoading}
              className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/30 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask me anything about this request..."
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          style={{ maxHeight: '120px' }}
        />
        <button
          type="button"
          onClick={() => {}}
          disabled={isLoading}
          aria-label="Voice input"
          className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <Mic className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          className={cn(
            'flex-shrink-0 rounded-lg p-1.5 transition-colors',
            value.trim() && !isLoading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, Trash2 } from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { useAgent } from '@/hooks/useAgent';
import { AgentMessage } from './AgentMessage';
import { AgentInput } from './AgentInput';
import { ActionConfirmModal } from './ActionConfirmModal';

// Demo shortcut prompts — the two queries the buyer drives during the meeting.
// Header buttons "1" and "2" prefill the input box (review-then-send, not auto-send).
const DEMO_PRESETS = [
  'Find me Status of all pending requests. Where I have to respond to a customer. Give me a draft for each response.',
  'Great. Now Create a PowerPoint report For these requests. save them to my documents folder. Then send an email to Mary With those PowerPoints.',
];

export function AgentPanel() {
  const { activeScenario, proactiveTrigger } = useDemoContext();
  const { messages, isLoading, sendMessage, clearMessages } = useAgent();
  const scrollRef = useRef<HTMLDivElement>(null);
  const firedTriggerRef = useRef<number | null>(null);

  // Action chip → confirmation modal → execution-pipeline stub
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Header preset buttons populate the input box without sending. The nonce
  // forces re-fire even when the same preset is clicked twice in a row.
  const [prefillRequest, setPrefillRequest] = useState<{ text: string; nonce: number } | null>(null);

  // Reset chat on scenario change. Proactive messages no longer auto-fire —
  // the buyer drives the conversation via suggested queries or free input.
  useEffect(() => {
    if (!proactiveTrigger) return;
    if (firedTriggerRef.current === proactiveTrigger.timestamp) return;
    firedTriggerRef.current = proactiveTrigger.timestamp;
    clearMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proactiveTrigger]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (content: string) => {
    sendMessage(content, buildScenarioContext(activeScenario));
  };

  const handleActionRequest = (text: string) => setPendingAction(text);

  const handleActionConfirm = () => {
    const text = pendingAction;
    setPendingAction(null);
    if (!text) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(`Routed to execution pipeline: ${text}`);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Cleanup the toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Izzy</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Instrata&apos;s privacy compliance co-pilot</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {DEMO_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => setPrefillRequest({ text: preset, nonce: Date.now() })}
              title={preset}
              aria-label={`Preset ${i + 1}`}
              className="rounded-md border border-border px-2 py-0.5 text-[11px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={clearMessages}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="thin-scroll flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
              <Bot className="h-5 w-5 text-primary/70" />
            </div>
            <p className="text-sm font-medium text-foreground">Select a scenario to get started</p>
            <p className="text-xs mt-1.5 max-w-[240px] leading-relaxed">
              Izzy will proactively surface findings and let you ask follow-ups.
            </p>
            <p className="text-[11px] mt-4 opacity-70">
              Tip: press <kbd className="rounded border border-border bg-muted px-1 font-mono">1</kbd>–<kbd className="rounded border border-border bg-muted px-1 font-mono">5</kbd> to switch scenarios
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <AgentMessage
            key={msg.id}
            message={msg}
            isStreaming={isLoading && idx === messages.length - 1 && msg.role === 'assistant'}
            onSuggestionClick={handleSend}
            onActionRequest={handleActionRequest}
          />
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border px-3 py-3">
        <AgentInput
          onSend={handleSend}
          isLoading={isLoading}
          suggestedQueries={messages.length > 0 ? undefined : activeScenario.suggestedQueries}
          prefillRequest={prefillRequest}
        />
      </div>

      {/* Toast — appears after action confirmation */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-[90%] items-start gap-2 rounded-lg border border-primary/30 bg-background px-3 py-2 text-xs shadow-lg">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">{toast}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                In production this dispatches to the email/write service. Demo stub.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action confirmation modal — opens when an action chip is clicked */}
      <ActionConfirmModal
        open={pendingAction !== null}
        actionText={pendingAction ?? ''}
        onConfirm={handleActionConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

function buildScenarioContext(scenario: { id: number; label: string; requestId: string; description: string }) {
  return `Active scenario: ${scenario.label} (${scenario.requestId}) — ${scenario.description}`;
}

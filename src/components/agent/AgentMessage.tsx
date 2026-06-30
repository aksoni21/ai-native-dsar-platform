'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AgentMessage as AgentMessageType,
  PipelineManifest,
  PipelineArtifact,
  PipelineEmail,
} from '@/types';
import { PipelineExecutionBubble } from './PipelineExecutionBubble';
import { ArtifactPreviewModal } from './ArtifactPreviewModal';

type Preview =
  | { kind: 'pptx'; artifact: PipelineArtifact }
  | { kind: 'email'; email: PipelineEmail };

interface AgentMessageProps {
  message: AgentMessageType;
  isStreaming?: boolean;
  /** Fires when a next-steps query chip is clicked — sends as the next user message. */
  onSuggestionClick?: (text: string) => void;
  /** Fires when a next-steps action chip is clicked — opens the confirmation modal. */
  onActionRequest?: (text: string) => void;
}

export function AgentMessage({
  message,
  isStreaming,
  onSuggestionClick,
  onActionRequest,
}: AgentMessageProps) {
  const isAssistant = message.role === 'assistant';
  // Demo placeholder: random per-message counts. Stable per mount via lazy init.
  const [fakeStats] = useState(() => ({
    agents: Math.floor(Math.random() * 7) + 1,
    tools: Math.floor(Math.random() * 8) + 1,
  }));
  const [preview, setPreview] = useState<Preview | null>(null);

  // Pipeline tool calls get the rich receipt bubble; everything else falls
  // through to the generic activity summary line. There should be at most
  // one pipeline call per message in practice (the system prompt forbids
  // splitting), but we tolerate >1 by rendering each.
  const pipelineCalls =
    (message.toolCalls ?? []).filter(
      (tc) =>
        tc.name === 'execute_post_approval_pipeline' &&
        tc.status === 'done' &&
        !!tc.result &&
        typeof tc.result === 'object' &&
        'manifest' in (tc.result as object) &&
        (tc.result as { manifest: unknown }).manifest !== null,
    );

  return (
    <div className={cn('flex flex-col gap-1', isAssistant ? 'items-start' : 'items-end')}>
      {/* Pipeline receipt bubbles take priority over the generic summary */}
      {isAssistant &&
        pipelineCalls.map((tc) => (
          <PipelineExecutionBubble
            key={tc.id}
            manifest={(tc.result as { manifest: PipelineManifest }).manifest}
            onOpenArtifact={(artifact) => setPreview({ kind: 'pptx', artifact })}
            onViewEmail={(email) => setPreview({ kind: 'email', email })}
          />
        ))}

      {/* Per-message activity summary — only when no pipeline call */}
      {isAssistant &&
        pipelineCalls.length === 0 &&
        message.toolCalls &&
        message.toolCalls.length > 0 && (
          <div className="my-1 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-primary">
            {fakeStats.agents} {fakeStats.agents === 1 ? 'agent' : 'agents'} called.{' '}
            {fakeStats.tools} {fakeStats.tools === 1 ? 'tool' : 'tools'} used
          </div>
        )}

      {/* Artifact preview modal — opens when Open / View email is clicked */}
      <ArtifactPreviewModal preview={preview} onClose={() => setPreview(null)} />

      {/* Message bubble */}
      {message.content && (
        <div
          className={cn(
            'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isAssistant
              ? 'bg-muted text-foreground rounded-tl-sm'
              : 'bg-primary text-primary-foreground rounded-tr-sm',
          )}
        >
          <MessageContent
            content={message.content}
            isStreaming={isStreaming && isAssistant}
            isAssistant={isAssistant}
            onSuggestionClick={onSuggestionClick}
            onActionRequest={onActionRequest}
          />
        </div>
      )}
    </div>
  );
}

function MessageContent({
  content,
  isStreaming,
  isAssistant,
  onSuggestionClick,
  onActionRequest,
}: {
  content: string;
  isStreaming?: boolean;
  isAssistant: boolean;
  onSuggestionClick?: (text: string) => void;
  onActionRequest?: (text: string) => void;
}) {
  // User messages stay plain text (no markdown rendering — keeps echoes verbatim).
  if (!isAssistant) {
    return (
      <div className={cn('whitespace-pre-wrap text-sm', isStreaming && 'typing-cursor')}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn('agent-prose text-sm', isStreaming && !content.endsWith(' ') && 'typing-cursor')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings — color-differentiated so sections read at a glance.
          // ### in markdown is the canonical section heading per the prompt rules.
          h1: ({ children }) => (
            <h3 className="mt-4 mb-1.5 text-[14px] font-semibold text-[hsl(var(--primary))] first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mt-4 mb-1.5 text-[14px] font-semibold text-[hsl(var(--primary))] first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-1.5 text-[14px] font-semibold text-[hsl(var(--primary))] first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          // Inline + block code
          code: ({ className, children, ...props }) => {
            // Custom block: ```next-steps fenced block renders as a clickable
            // recommended-next + alternatives card, NOT as a code block.
            if (className?.includes('language-next-steps')) {
              return (
                <NextStepsBlock
                  raw={String(children)}
                  onQueryClick={onSuggestionClick}
                  onActionClick={onActionRequest}
                />
              );
            }
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <pre className="my-2 overflow-x-auto rounded-md bg-background/60 p-2.5 text-[11px] font-mono leading-snug">
                  <code {...props}>{children}</code>
                </pre>
              );
            }
            return (
              <code className="rounded bg-background/60 px-1 py-0.5 text-[11.5px] font-mono">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          // Tables — header bg + zebra rows + auto status pills in cells.
          // Scrollable on small widths so wide tables don't break the bubble.
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-md border border-border/40">
              <table className="w-full border-collapse text-[12px] [&_tbody_tr:nth-child(even)]:bg-muted/30">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border/30 last:border-0">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 align-top">{maybeStatusPill(children)}</td>
          ),
          hr: () => <hr className="my-3 border-border/40" />,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border/60 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Cell-content patterns we render as colored status pills inside markdown tables.
 * Color choices match the workflow-pane components (DispositionPlan, ApproveRejectPanel)
 * so the visual register is consistent across the app.
 */
const STATUS_PILLS: Array<{ pattern: RegExp; className: string }> = [
  // Dispositions — successful action / clean delete
  {
    pattern: /^full\s*delete$/i,
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  // Dispositions — masked / anonymized
  {
    pattern: /^mask\s*\/?\s*anonymize$/i,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  // Dispositions — retained under exemption
  {
    pattern: /^retain\s*\(?\s*exempt\s*\)?$/i,
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  // Match decisions
  {
    pattern: /^auto[\s_]?included$/i,
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  {
    pattern: /^agent[\s_]?included$/i,
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  {
    pattern: /^ambiguous$/i,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  {
    pattern: /^excluded$/i,
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  // Priority labels (open-items)
  {
    pattern: /^critical$/i,
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  {
    pattern: /^high$/i,
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  {
    pattern: /^medium$/i,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  {
    pattern: /^low$/i,
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  // Request statuses
  {
    pattern: /^completed$/i,
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  {
    pattern: /^pending\s*review$/i,
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  {
    pattern: /^approved$/i,
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  {
    pattern: /^rejected$/i,
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  // Overdue / urgency on deadlines
  {
    pattern: /^overdue$/i,
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  {
    pattern: /^on\s*track$/i,
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
];

/**
 * Renders the agent's closing `next-steps` fenced block as a clickable card:
 * one recommended chip on top, 0–2 alternative chips below. Each chip is tagged
 * `query` or `action`. Query chips fire onQueryClick (sends as next user message).
 * Action chips fire onActionClick (opens confirmation modal — represents the
 * post-approval execution pipeline that lives outside the MCP boundary).
 *
 * Wire format produced by the model:
 *   **Recommended:** Send the 2 drafted responses · action
 *   - Show me the audit trail for REQ-002 · query
 *   - Pull the disposition plan with both emails factored in · query
 *
 * Defensive on partial input — while the block streams in token-by-token we may
 * see a raw with no recommended line yet; render a placeholder rather than
 * throwing.
 */
interface NextStep {
  text: string;
  type: 'query' | 'action';
}

function parseNextSteps(raw: string): { recommended: NextStep | null; alternatives: NextStep[] } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  let recommended: NextStep | null = null;
  const alternatives: NextStep[] = [];

  for (const line of lines) {
    // Strip the **Recommended:** prefix (also handles **Recommended**: variant)
    const recMatch = line.match(/^\*\*Recommended:?\*\*:?\s*(.*)$/i);
    if (recMatch) {
      recommended = parseStep(recMatch[1]);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const step = parseStep(line.slice(2));
      if (step) alternatives.push(step);
    }
  }

  return { recommended, alternatives };
}

function parseStep(s: string): NextStep | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  // Type marker is the trailing token after the LAST " · " — case-insensitive.
  const lastSep = trimmed.lastIndexOf(' · ');
  if (lastSep === -1) {
    return { text: trimmed, type: 'query' };
  }
  const tail = trimmed.slice(lastSep + 3).trim().toLowerCase();
  if (tail === 'action' || tail === 'query') {
    return { text: trimmed.slice(0, lastSep).trim(), type: tail };
  }
  return { text: trimmed, type: 'query' };
}

function NextStepsBlock({
  raw,
  onQueryClick,
  onActionClick,
}: {
  raw: string;
  onQueryClick?: (text: string) => void;
  onActionClick?: (text: string) => void;
}) {
  const { recommended, alternatives } = parseNextSteps(raw);

  if (!recommended && alternatives.length === 0) {
    return <span className="text-[11px] text-muted-foreground">…</span>;
  }

  const handle = (step: NextStep) => {
    if (step.type === 'action') onActionClick?.(step.text);
    else onQueryClick?.(step.text);
  };

  // Hairline divider sets the chips apart from the message body without
  // the heaviness of a full bordered card. Hierarchy comes from weight + icon.
  return (
    <div className="mt-3 space-y-1.5 border-t border-border/40 pt-2.5">
      {recommended && (
        <div>
          <button
            onClick={() => handle(recommended)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              recommended.type === 'action'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-primary/10 text-primary hover:bg-primary/15',
            )}
          >
            <StepIcon type={recommended.type} prominent />
            {recommended.text}
          </button>
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {alternatives.map((alt, i) => (
            <button
              key={`${alt.text}-${i}`}
              onClick={() => handle(alt)}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <StepIcon type={alt.type} />
              {alt.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepIcon({ type, prominent }: { type: 'query' | 'action'; prominent?: boolean }) {
  const Icon = type === 'action' ? Zap : ArrowRight;
  return (
    <Icon
      className={cn(
        'h-3 w-3 flex-shrink-0',
        prominent ? '' : 'opacity-70',
      )}
      aria-label={type}
    />
  );
}

function maybeStatusPill(children: React.ReactNode): React.ReactNode {
  // Only badge cells whose entire content is a single string. Mixed content
  // (e.g. "REC-019 — Retain (Exempt)" with code + text) keeps its original render.
  let text: string | null = null;
  if (typeof children === 'string') text = children;
  else if (Array.isArray(children) && children.length === 1 && typeof children[0] === 'string') {
    text = children[0];
  }
  if (text === null) return children;

  const trimmed = text.trim();
  for (const { pattern, className } of STATUS_PILLS) {
    if (pattern.test(trimmed)) {
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
            className,
          )}
        >
          {trimmed}
        </span>
      );
    }
  }
  return children;
}

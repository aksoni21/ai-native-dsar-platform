'use client';

import { motion } from 'framer-motion';
import { Zap, FileText, FolderCheck, Mail, CheckCircle2 } from 'lucide-react';
import type { PipelineManifest, PipelineArtifact, PipelineEmail } from '@/types';

interface PipelineExecutionBubbleProps {
  manifest: PipelineManifest;
  onOpenArtifact: (artifact: PipelineArtifact) => void;
  onViewEmail: (email: PipelineEmail) => void;
}

const STAGGER_SECONDS = 0.35;

export function PipelineExecutionBubble({
  manifest,
  onOpenArtifact,
  onViewEmail,
}: PipelineExecutionBubbleProps) {
  const rows: Array<{ key: string; render: (delay: number) => React.ReactNode }> = [];

  manifest.artifacts.forEach((artifact) => {
    rows.push({
      key: `artifact-${artifact.request_id}`,
      render: (delay) => (
        <ArtifactRow
          key={`artifact-${artifact.request_id}`}
          artifact={artifact}
          delay={delay}
          onOpen={() => onOpenArtifact(artifact)}
        />
      ),
    });
  });

  if (manifest.saved_to_documents && manifest.artifacts.length > 0) {
    rows.push({
      key: 'saved',
      render: (delay) => <SaveRow key="saved" delay={delay} count={manifest.artifacts.length} />,
    });
  }

  if (manifest.email) {
    const email = manifest.email;
    rows.push({
      key: 'email',
      render: (delay) => (
        <EmailRow key="email" email={email} delay={delay} onView={() => onViewEmail(email)} />
      ),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-1 w-full max-w-[92%] overflow-hidden rounded-lg border border-border bg-muted/50 text-[12px]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 leading-tight">
          <div className="text-[12px] font-semibold text-foreground">Execution pipeline</div>
          <div className="text-[10.5px] font-mono text-muted-foreground">
            {manifest.pipeline_id} · {formatTime(manifest.completed_at)}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10.5px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </span>
      </div>

      {/* Authorization quote */}
      {manifest.authorization_quote && (
        <div className="border-b border-border/40 px-3 py-1.5 text-[10.5px] text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">Authorized by:</span>{' '}
          <span className="italic">&ldquo;{manifest.authorization_quote}&rdquo;</span>
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-border/40">
        {rows.map((row, i) => row.render(i * STAGGER_SECONDS))}
      </div>
    </motion.div>
  );
}

function ArtifactRow({
  artifact,
  delay,
  onOpen,
}: {
  artifact: PipelineArtifact;
  delay: number;
  onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-3 px-3 py-2"
    >
      <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
      <div className="flex-1 min-w-0 leading-tight">
        <div className="truncate text-[12px] font-medium text-foreground">{artifact.filename}</div>
        <div className="truncate text-[10.5px] font-mono text-muted-foreground">
          {artifact.path} · {formatBytes(artifact.size_bytes)}
        </div>
      </div>
      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600 dark:text-green-400" />
      <button
        onClick={onOpen}
        className="flex-shrink-0 rounded-md border border-border px-2 py-1 text-[10.5px] font-medium text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        Open
      </button>
    </motion.div>
  );
}

function SaveRow({ delay, count }: { delay: number; count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-3 px-3 py-2"
    >
      <FolderCheck className="h-4 w-4 flex-shrink-0 text-primary" />
      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-[12px] font-medium text-foreground">
          Saved {count} file{count === 1 ? '' : 's'} to Documents
        </div>
        <div className="text-[10.5px] font-mono text-muted-foreground">~/Documents/Instrata/</div>
      </div>
      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600 dark:text-green-400" />
    </motion.div>
  );
}

function EmailRow({
  email,
  delay,
  onView,
}: {
  email: PipelineEmail;
  delay: number;
  onView: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-3 px-3 py-2"
    >
      <Mail className="h-4 w-4 flex-shrink-0 text-primary" />
      <div className="flex-1 min-w-0 leading-tight">
        <div className="truncate text-[12px] font-medium text-foreground">
          Sent to {email.to_name}{' '}
          <span className="font-mono text-[10.5px] text-muted-foreground">&lt;{email.to}&gt;</span>
        </div>
        <div className="truncate text-[10.5px] text-muted-foreground">
          {email.subject} · {email.attachments.length} attachment
          {email.attachments.length === 1 ? '' : 's'}
        </div>
      </div>
      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600 dark:text-green-400" />
      <button
        onClick={onView}
        className="flex-shrink-0 rounded-md border border-border px-2 py-1 text-[10.5px] font-medium text-foreground hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        View email
      </button>
    </motion.div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

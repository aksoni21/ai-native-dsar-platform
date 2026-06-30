// Privacy Hub stub page — agent-only for now. The full visual port (map,
// sidebar, scorecards, comparison) lands in a follow-up; this page exists
// so the agent stack can be smoke-tested end-to-end at /tools/privacy-hub.

import type { Metadata } from 'next';
import { ChatPanel } from '@/features/privacy-hub/components/ChatPanel';

export const metadata: Metadata = {
  title: 'Privacy Hub — Gemma',
};

export default function PrivacyHubPage() {
  return (
    <div className="h-dvh">
      <ChatPanel />
    </div>
  );
}

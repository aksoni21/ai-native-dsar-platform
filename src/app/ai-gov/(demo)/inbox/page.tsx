'use client';

import { InboxList } from '@/components/ai-gov/demo/InboxList';
import { useVertical } from '@/context/ai-gov/VerticalContext';
import { VERTICAL_LABELS } from '@/lib/ai-gov/constants';

export default function InboxPage() {
  const { vertical } = useVertical();
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <header>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Monday · 8:14 AM · {VERTICAL_LABELS[vertical]}
        </div>
        <h1 className="font-serif text-3xl mt-1">An AG notice just landed.</h1>
      </header>

      <InboxList />
    </div>
  );
}

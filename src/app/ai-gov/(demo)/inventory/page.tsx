'use client';

import { useMemo, useRef, useState } from 'react';
import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getContractScan, getInventory } from '@/lib/ai-gov/data';
import { DiscoveredUseCaseRow } from '@/components/ai-gov/demo/DiscoveredUseCaseRow';
import { ContractScanPanel } from '@/components/ai-gov/demo/ContractScanPanel';
import { DISCOVERY_CHANNEL_LABELS, INTEGRATIONS } from '@/lib/ai-gov/constants';
import type { DiscoveryChannel } from '@/types/ai-gov';

const CHANNEL_ORDER: DiscoveryChannel[] = [
  'saas_integration',
  'contract_scan',
  'bu_intake',
  'warehouse_scan',
  'model_registry',
];

export default function InventoryPage() {
  const { vertical } = useVertical();
  const useCases = getInventory(vertical);
  const contractScan = getContractScan(vertical);
  const [selected, setSelected] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const counts = useMemo(() => {
    const total = useCases.length;
    const undocumented = useCases.filter((u) => u.status === 'undocumented').length;
    const classified = useCases.filter((u) => u.status === 'classified').length;
    const inReview = useCases.filter((u) => u.status === 'in_review').length;
    return { total, undocumented, classified, inReview };
  }, [useCases]);

  const channelCounts = useMemo(() => {
    const c: Record<DiscoveryChannel, number> = {
      saas_integration: 0,
      contract_scan: 0,
      bu_intake: 0,
      warehouse_scan: 0,
      model_registry: 0,
    };
    for (const u of useCases) c[u.discovery_channel] += 1;
    return c;
  }, [useCases]);

  function handleFindingClick(useCaseId: string) {
    setSelected(useCaseId);
    const el = rowRefs.current[useCaseId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header>
        <h1 className="font-serif text-3xl">AI inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Auto-discovered across {INTEGRATIONS[vertical].slice(0, 3).join(', ')} and more.
          {counts.undocumented > 0 && (
            <>
              {' '}
              <span className="text-foreground">
                {counts.undocumented} weren't on the prior list.
              </span>
            </>
          )}
        </p>
        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
          {CHANNEL_ORDER.map((ch) => (
            <span
              key={ch}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5"
            >
              <span className="font-mono text-foreground">{channelCounts[ch]}</span>
              <span>{DISCOVERY_CHANNEL_LABELS[ch]}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Discovered" value={counts.total} />
        <Stat label="Newly found" value={counts.undocumented} accent />
        <Stat label="In review" value={counts.inReview} />
        <Stat label="Classified" value={counts.classified} />
      </div>

      <ContractScanPanel data={contractScan} onFindingClick={handleFindingClick} />

      <div className="space-y-2">
        {useCases.map((uc) => (
          <div
            key={uc.id}
            ref={(el) => {
              rowRefs.current[uc.id] = el;
            }}
          >
            <DiscoveredUseCaseRow
              useCase={uc}
              selected={selected === uc.id}
              onSelect={(id) => setSelected(id === selected ? null : id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-md border bg-card px-3 py-2.5 ${
        accent ? 'border-accent/50 bg-accent/5' : ''
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-serif text-2xl ${accent ? 'text-accent' : ''}`}>{value}</div>
    </div>
  );
}

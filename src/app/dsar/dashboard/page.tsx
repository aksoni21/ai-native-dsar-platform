'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppBar } from '@/components/dsar/shared/AppBar';
import { StatCard } from '@/components/dsar/shared/StatCard';
import { FilterBar, type FilterValue } from '@/components/dsar/dashboard/FilterBar';
import { RequestTable } from '@/components/dsar/dashboard/RequestTable';
import { QUEUE_ROWS, BUCKET_BY_FILTER } from '@/components/dsar/dashboard/queueData';

export default function DsarDashboardPage() {
  const [filter, setFilter] = useState<FilterValue>('All');

  const rows = useMemo(() => {
    const bucket = BUCKET_BY_FILTER[filter];
    return bucket ? QUEUE_ROWS.filter((r) => r.bucket === bucket) : QUEUE_ROWS;
  }, [filter]);

  const stats = useMemo(
    () => ({
      open: QUEUE_ROWS.filter((r) => r.bucket !== 'completed').length,
      awaitingApproval: QUEUE_ROWS.filter((r) => r.bucket === 'approval').length,
      dueSoon: QUEUE_ROWS.filter((r) => r.slaDays <= 7).length,
      completed: QUEUE_ROWS.filter((r) => r.bucket === 'completed').length,
    }),
    [],
  );

  return (
    <>
      <AppBar
        right={
          <div className="flex items-center gap-3">
            <Link
              href="/dsar/intake"
              className="rounded-[9px] border border-[#2A2E3A] px-3 py-2 text-[13.5px] font-semibold text-[#B7BDCC] hover:border-[#3A4152] hover:text-white"
            >
              + New intake
            </Link>
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
              OP
            </span>
          </div>
        }
      />

      <main className="mx-auto max-w-[1320px] px-7 py-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-[27px] font-extrabold tracking-[-0.02em] text-foreground">Request queue</h1>
            <p className="mt-1.5 text-[14.5px] text-muted-foreground">
              DSAR requests across all connected source systems.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <StatCard label="Open" value={String(stats.open)} />
          <StatCard label="Awaiting approval" value={String(stats.awaitingApproval)} valueColor="hsl(var(--warning))" />
          <StatCard label="Due ≤ 7 days" value={String(stats.dueSoon)} valueColor="hsl(var(--destructive))" />
          <StatCard label="Completed" value={String(stats.completed)} valueColor="hsl(var(--success))" />
        </div>

        <FilterBar active={filter} onChange={setFilter} countLabel={`${rows.length} of ${QUEUE_ROWS.length} requests`} />

        <RequestTable rows={rows} />
      </main>
    </>
  );
}

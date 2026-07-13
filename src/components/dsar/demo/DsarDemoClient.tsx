'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppBar } from '@/components/dsar/shared/AppBar';
import { RequestDetailsCard } from './RequestDetailsCard';
import { ConnectedSourcesCard } from './ConnectedSourcesCard';
import { AgentPanel } from './AgentPanel';
import { ApprovalGateCard, type GatePhase } from './ApprovalGateCard';
import { AuditTrailCard } from './AuditTrailCard';
import { buildDsarDemoViewModel, DEFAULT_REQUEST_ID } from './realData';

export function DsarDemoClient() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request_id') ?? DEFAULT_REQUEST_ID;

  const vm = useMemo(() => buildDsarDemoViewModel(requestId), [requestId]);
  const [phase, setPhase] = useState<GatePhase>(vm?.initialPhase ?? 'pending');

  // Reset local phase when switching to a different request via ?request_id=.
  useEffect(() => {
    setPhase(vm?.initialPhase ?? 'pending');
  }, [requestId, vm?.initialPhase]);

  if (!vm) {
    return (
      <>
        <AppBar crumbs={[{ label: 'Dashboard', href: '/dsar/dashboard' }]} />
        <div className="mx-auto max-w-[1360px] px-7 py-16 text-center text-muted-foreground">
          No request found for &quot;{requestId}&quot;. Try one of the seeded scenarios, e.g.{' '}
          <code className="font-mono text-foreground">?request_id=REQ-002</code>.
        </div>
      </>
    );
  }

  // TODO: approve/reject/reset only flip local component state. The real
  // ApproveRejectPanel (src/components/requests/RequestDetail/ApproveRejectPanel.tsx)
  // has the same limitation today — neither persists a decision anywhere.
  // Wiring a real decision means POSTing to a new endpoint that updates
  // naica_demo.intake_requests.status and appends an audit_trail row, then
  // re-fetching rather than optimistically flipping local state.
  const approve = () => setPhase('approved');
  const reject = () => setPhase('rejected');
  const reset = () => setPhase(vm.initialPhase);

  const statusLabel = phase === 'pending' ? 'Awaiting approval' : phase === 'approved' ? 'Completed' : 'Rejected';

  return (
    <>
      <AppBar
        crumbs={[
          { label: 'Dashboard', href: '/dsar/dashboard' },
          { label: vm.requestId },
        ]}
        right={
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[hsl(var(--success-on-dark))]">
            <span className="dsar-livepulse h-1.5 w-1.5 rounded-full bg-[hsl(var(--success-on-dark))]" />
            LIVE · {vm.typeLabel}
          </div>
        }
      />

      <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-start gap-[22px] px-7 py-6 lg:grid-cols-[300px_1fr_320px]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-5">
          <RequestDetailsCard
            requestId={vm.requestId}
            consumerName={vm.consumerName}
            consumerEmail={vm.consumerEmail}
            typeLabel={vm.typeLabel}
            jurisdictionLabel={vm.jurisdictionLabel}
            submittedLabel={vm.submittedLabel}
            identityVerified={vm.identityVerified}
            slaDaysLeft={vm.slaDaysLeft}
            slaTone={vm.slaTone}
          />
          <ConnectedSourcesCard sources={vm.sources} />
        </aside>

        <main>
          <AgentPanel
            statusLabel={statusLabel}
            operatorMessage={vm.operatorMessage}
            matches={vm.matches}
            reasoning={vm.reasoning}
            includedCount={vm.includedCount}
            reviewCount={vm.reviewCount}
            proposedActionText={vm.proposedActionText}
          />
        </main>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-5">
          <ApprovalGateCard
            phase={phase}
            title={vm.gateTitle}
            description={vm.gateDescription}
            facts={vm.gateFacts}
            executedSummary={vm.executedSummary}
            onApprove={approve}
            onReject={reject}
            onReset={reset}
          />
          <AuditTrailCard rows={vm.audit} />
        </aside>
      </div>
    </>
  );
}

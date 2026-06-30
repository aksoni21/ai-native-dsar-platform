'use client';

import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getVendorPackets } from '@/lib/ai-gov/data';
import { VendorPacketCard } from '@/components/ai-gov/demo/VendorPacketCard';
import { DiffAlertToast } from '@/components/ai-gov/demo/DiffAlertToast';

export default function VendorVaultPage() {
  const { vertical } = useVertical();
  const packets = getVendorPackets(vertical);
  const withDiff = packets.find((p) => !!p.pending_diff);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Vendor packets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          §1702 / LL 144 documentation. Diff alerts on material updates.
        </p>
      </header>

      <div className="space-y-4">
        {packets.map((p) => (
          <VendorPacketCard key={p.vendor_id} packet={p} />
        ))}
      </div>

      {withDiff && <DiffAlertToast packet={withDiff} />}
    </div>
  );
}

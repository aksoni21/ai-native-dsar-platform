'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import type { VendorPacket } from '@/types/ai-gov';
import { Button } from '@/components/ai-gov/ui/button';

interface Props {
  packet: VendorPacket;
}

export function DiffAlertToast({ packet }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!packet.pending_diff) return;
    const t = setTimeout(() => setVisible(true), packet.pending_diff.triggered_at_offset_ms);
    return () => clearTimeout(t);
  }, [packet]);

  if (!packet.pending_diff) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed right-4 bottom-20 z-40 w-[360px] rounded-lg border border-warning bg-card shadow-xl"
        >
          <div className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider text-warning font-semibold">
                  §1702(2) Material Update — {packet.vendor_name}
                </div>
                <div className="text-sm mt-1">{packet.pending_diff.summary}</div>
                <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  {packet.pending_diff.fields_changed.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setVisible(false)}>
                    Review later
                  </Button>
                  <Button size="sm" onClick={() => setVisible(false)}>
                    Open diff
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

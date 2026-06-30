'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Lock, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { VendorPacket } from '@/types/ai-gov';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Badge } from '@/components/ai-gov/ui/badge';
import { cn, formatDate } from '@/lib/ai-gov/utils';

const SECTION_ICON: Record<string, typeof FileText> = {
  intended_use: FileText,
  training_data: FileText,
  known_limitations: FileText,
  risk_mitigation: FileText,
  trade_secret_withheld: Lock,
};

const STATUS_META: Record<string, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  received: { icon: CheckCircle2, cls: 'text-success', label: 'Received' },
  pending: { icon: Clock, cls: 'text-warning', label: 'Pending' },
  redacted: { icon: Lock, cls: 'text-muted-foreground', label: 'Redacted' },
};

export function VendorPacketCard({ packet }: { packet: VendorPacket }) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">{packet.vendor_name}</CardTitle>
          <div className="text-[11px] font-mono text-muted-foreground">
            v{packet.packet_version} · {formatDate(packet.last_updated)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {packet.sections.map((s) => {
          const meta = STATUS_META[s.status];
          const SectionIcon = SECTION_ICON[s.key] ?? FileText;
          const StatusIcon = meta.icon;
          const isOpen = openSection === s.key;
          return (
            <div key={s.key}>
              <button
                onClick={() => setOpenSection(isOpen ? null : s.key)}
                className="w-full text-left flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <SectionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm flex-1">{s.label}</span>
                <span className={cn('text-xs flex items-center gap-1', meta.cls)}>
                  <StatusIcon className="h-3 w-3" />
                  {meta.label}
                </span>
                {s.file_size && (
                  <Badge variant="outline" className="text-[10px]">
                    {s.file_size}
                  </Badge>
                )}
                {s.excerpt && (isOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ))}
              </button>
              {isOpen && s.excerpt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="px-3 pb-2 pl-9 text-xs text-muted-foreground leading-relaxed"
                >
                  {s.excerpt}
                </motion.div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

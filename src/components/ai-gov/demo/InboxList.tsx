'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Mail, ChevronRight } from 'lucide-react';
import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getInbox } from '@/lib/ai-gov/data';
import { ROUTE_PREFIX } from '@/lib/ai-gov/constants';
import { cn, timeAgo } from '@/lib/ai-gov/utils';
import { Badge } from '@/components/ai-gov/ui/badge';
import { Button } from '@/components/ai-gov/ui/button';
import { Separator } from '@/components/ai-gov/ui/separator';

export function InboxList() {
  const { vertical } = useVertical();
  const data = getInbox(vertical);
  const [openId, setOpenId] = useState<string | null>(
    data.items.find((i) => i.is_ag_notice)?.id || null
  );

  const openItem = data.items.find((i) => i.id === openId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4 rounded-xl border bg-card overflow-hidden">
      <div className="border-r bg-muted/30">
        <div className="px-4 py-3 border-b">
          <div className="text-sm font-medium">{data.inbox_owner}</div>
          <div className="text-xs text-muted-foreground">{data.inbox_owner_role}</div>
        </div>
        <ul className="divide-y">
          {data.items.map((item) => {
            const active = item.id === openId;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setOpenId(item.id)}
                  className={cn(
                    'group w-full text-left px-4 py-3 transition-colors',
                    active ? 'bg-background' : 'hover:bg-background/60'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {item.is_ag_notice ? (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={cn(
                            'text-xs truncate',
                            item.is_ag_notice ? 'font-semibold' : 'text-muted-foreground'
                          )}
                        >
                          {item.from}
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(item.received_at)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'text-sm truncate mt-0.5',
                          item.is_ag_notice && 'font-medium'
                        )}
                      >
                        {item.subject}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.preview}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-h-[480px] flex flex-col">
        <AnimatePresence mode="wait">
          {openItem ? (
            <motion.div
              key={openItem.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col"
            >
              <div className="px-6 py-4 border-b">
                <div className="flex items-center gap-2 mb-2">
                  {openItem.is_ag_notice && (
                    <Badge variant="destructive" className="uppercase tracking-wider">
                      AG Notice
                    </Badge>
                  )}
                  {openItem.priority === 'high' && (
                    <Badge variant="warning">High Priority</Badge>
                  )}
                </div>
                <h2 className="text-lg font-semibold">{openItem.subject}</h2>
                <div className="text-xs text-muted-foreground mt-1">
                  From {openItem.from}
                  {openItem.from_role ? ` — ${openItem.from_role}` : ''} ·{' '}
                  {timeAgo(openItem.received_at)}
                </div>
              </div>
              <div className="flex-1 px-6 py-5 overflow-y-auto text-sm leading-relaxed whitespace-pre-line">
                {openItem.body || openItem.preview}
              </div>
              {openItem.is_ag_notice && openItem.opens_route && (
                <>
                  <Separator />
                  <div className="px-6 py-4 bg-muted/30 flex items-center justify-between gap-4">
                    <div className="text-xs text-muted-foreground">
                      Instrata detected an AG/regulator notice. Open the cohort that matches the
                      inquiry to begin assembling your response.
                    </div>
                    <Button asChild>
                      <Link href={`${ROUTE_PREFIX}${openItem.opens_route}`}>
                        Open response workspace
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

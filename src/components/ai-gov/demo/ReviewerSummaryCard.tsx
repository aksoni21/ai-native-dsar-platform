'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCcw, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Button } from '@/components/ai-gov/ui/button';
import { Skeleton } from '@/components/ai-gov/ui/skeleton';
import { HeroClaudeIndicator } from '@/components/ai-gov/shared/HeroClaudeIndicator';
import { API_PREFIX } from '@/lib/ai-gov/constants';
import type { ReviewerSummaryResponse, Vertical } from '@/types/ai-gov';

interface Props {
  applicantId: string;
  vertical: Vertical;
}

export function ReviewerSummaryCard({ applicantId, vertical }: Props) {
  const [resp, setResp] = useState<ReviewerSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setResp(null);
    try {
      const res = await fetch(`${API_PREFIX}/reviewer-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant_id: applicantId, vertical }),
      });
      const data = (await res.json()) as ReviewerSummaryResponse;
      setResp(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setResp(null);
  }, [applicantId, vertical]);

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Reviewer briefing
          </CardTitle>
          {resp && <HeroClaudeIndicator fallback={!!resp.fallback} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!resp && !loading && (
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <p className="text-xs text-muted-foreground min-w-0">
              Condenses the decision into a reviewer briefing — what to re-check first.
            </p>
            <Button onClick={generate} size="sm" className="shrink-0">
              Generate briefing
            </Button>
          </div>
        )}
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[95%]" />
            <Skeleton className="h-3 w-[80%]" />
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        )}
        <AnimatePresence>
          {resp && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-sm leading-relaxed">{resp.summary}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {resp.top_factors.map((f) => (
                  <div key={f.name} className="rounded-md border bg-muted/30 p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {f.name}
                    </div>
                    <div className="text-xs mt-0.5">{f.value}</div>
                    <div className="mt-1.5 h-1 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(100, f.weight * 100 * 2.5)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                      weight {f.weight.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {resp.reviewer_prompts?.length > 0 && (
                <div className="rounded-md bg-accent/5 border border-accent/20 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-accent flex items-center gap-1 mb-2">
                    <Lightbulb className="h-3 w-3" />
                    Next steps
                  </div>
                  <ul className="text-xs space-y-1">
                    {resp.reviewer_prompts.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground font-mono">{i + 1}.</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={generate} size="sm" variant="ghost">
                  <RefreshCcw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

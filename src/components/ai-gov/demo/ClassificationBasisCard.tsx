'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Button } from '@/components/ai-gov/ui/button';
import { Skeleton } from '@/components/ai-gov/ui/skeleton';
import { HeroClaudeIndicator } from '@/components/ai-gov/shared/HeroClaudeIndicator';
import { API_PREFIX } from '@/lib/ai-gov/constants';
import type { ClassificationBasisResponse, Vertical } from '@/types/ai-gov';

interface Props {
  useCaseId: string;
  useCaseName: string;
  vertical: Vertical;
}

export function ClassificationBasisCard({ useCaseId, useCaseName, vertical }: Props) {
  const [resp, setResp] = useState<ClassificationBasisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResp(null);
    try {
      const res = await fetch(`${API_PREFIX}/classification-basis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_case_id: useCaseId, vertical }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data: ClassificationBasisResponse = await res.json();
      setResp(data);
    } catch (e) {
      setError('Could not generate basis. Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setResp(null);
    setError(null);
  }, [useCaseId, vertical]);

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-accent shrink-0" />
            <span className="truncate">"Materially influence" basis</span>
          </CardTitle>
          {resp && <HeroClaudeIndicator fallback={!!resp.fallback} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!resp && !loading && (
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <p className="text-xs text-muted-foreground min-w-0">
              §1706(5)(b) basis for <span className="text-foreground">{useCaseName}</span>.
            </p>
            <Button onClick={generate} size="sm" className="shrink-0">
              <Sparkles className="h-4 w-4 mr-1.5" />
              Generate
            </Button>
          </div>
        )}
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[90%]" />
            <Skeleton className="h-3 w-[75%]" />
            <Skeleton className="h-3 w-[60%]" />
          </div>
        )}
        <AnimatePresence>
          {resp && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-sm leading-relaxed">{resp.basis}</p>
              {resp.citations?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="uppercase tracking-wider">Citations:</span>
                  {resp.citations.map((c, i) => (
                    <span key={i} className="font-mono bg-muted px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Confidence: <span className="font-mono">{Math.round(resp.confidence * 100)}%</span>
                </div>
                <Button onClick={generate} size="sm" variant="ghost">
                  <RefreshCcw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {error && <div className="text-xs text-destructive">{error}</div>}
      </CardContent>
    </Card>
  );
}

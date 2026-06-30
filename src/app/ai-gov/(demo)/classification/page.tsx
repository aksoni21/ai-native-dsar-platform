'use client';

import { useState, useMemo } from 'react';
import { useVertical } from '@/context/ai-gov/VerticalContext';
import { getClassificationRules } from '@/lib/ai-gov/data';
import { JurisdictionBadge } from '@/components/ai-gov/demo/JurisdictionBadge';
import { ClassificationBasisCard } from '@/components/ai-gov/demo/ClassificationBasisCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ai-gov/ui/tabs';
import { cn } from '@/lib/ai-gov/utils';

export default function ClassificationPage() {
  const { vertical } = useVertical();
  const rules = getClassificationRules(vertical);
  const [selected, setSelected] = useState(rules[0]?.use_case_id);

  const current = useMemo(
    () => rules.find((r) => r.use_case_id === selected) ?? rules[0],
    [rules, selected]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <header>
        <h1 className="font-serif text-3xl">Per-jurisdiction classification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One control set, mapped to every state regime.
        </p>
      </header>

      <Tabs
        defaultValue={current.use_case_id}
        value={current.use_case_id}
        onValueChange={(v) => setSelected(v)}
      >
        <TabsList className="flex flex-wrap h-auto">
          {rules.map((r) => (
            <TabsTrigger key={r.use_case_id} value={r.use_case_id} className="text-xs">
              {r.use_case_name}
            </TabsTrigger>
          ))}
        </TabsList>

        {rules.map((r) => (
          <TabsContent key={r.use_case_id} value={r.use_case_id} className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{r.use_case_name}</CardTitle>
                <div className="text-xs text-muted-foreground">{r.vendor}</div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {r.jurisdictions.map((j) => (
                    <div key={j.state} className="space-y-1.5">
                      <JurisdictionBadge rule={j} />
                      <div className="text-[11px] text-muted-foreground leading-relaxed px-0.5">
                        {j.basis_short}
                      </div>
                      <div className="px-0.5">
                        <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className={cn(
                              'h-full',
                              j.status === 'covered' && 'bg-destructive',
                              j.status === 'in_scope' && 'bg-warning',
                              j.status === 'exempt' && 'bg-success',
                              j.status === 'edge' && 'bg-muted-foreground'
                            )}
                            style={{ width: `${j.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <ClassificationBasisCard
              useCaseId={r.use_case_id}
              useCaseName={r.use_case_name}
              vertical={vertical}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

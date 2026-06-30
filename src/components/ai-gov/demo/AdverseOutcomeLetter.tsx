'use client';

import { Sparkles, FileText, Mail } from 'lucide-react';
import type { DisclosureContent } from '@/types/ai-gov';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ai-gov/ui/card';
import { Badge } from '@/components/ai-gov/ui/badge';
import { Separator } from '@/components/ai-gov/ui/separator';

interface Props {
  notice: DisclosureContent;
}

export function AdverseOutcomeLetter({ notice }: Props) {
  const bridge = notice.adverse_outcome.federal_bridge;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {notice.adverse_outcome.headline}
          </CardTitle>
          {bridge && (
            <Badge variant="secondary" className="text-[10px]">
              <FileText className="h-3 w-3 mr-1" />
              Bridge: {bridge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-card p-4 text-sm leading-relaxed">
          <p>{notice.adverse_outcome.body}</p>
          <Separator className="my-3" />
          <div className="rounded-md bg-accent/10 border border-accent/30 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
                  ADMT augmentation — appended, not duplicated
                </div>
                <p className="text-sm">{notice.adverse_outcome.appended_ai_line}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

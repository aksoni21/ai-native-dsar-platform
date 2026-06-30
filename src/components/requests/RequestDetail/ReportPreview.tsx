"use client";

import { Fragment } from 'react';
import { FileCheck, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReportPreviewProps {
  reportText: string;
}

// Section labels in the seeded compliance reports follow a fixed shape:
//   ALL-CAPS WORDS (with spaces, /, and ampersands), terminated by a colon.
// e.g. "SUMMARY:", "DATA SOURCES SEARCHED:", "PERSONAL INFORMATION DISCLOSED:".
const SECTION_LABEL_RE = /^([A-Z][A-Z0-9 /&-]{2,}):(\s|$)/;

const TITLE_RE = /^PRIVACY COMPLIANCE REPORT(\b|\s|-)/;

// "Consumer: ... | State: ..." style metadata lines that sit just below the title.
const META_LINE_RE = /^(Consumer|Request Type|Filed|Report Date|Reviewer):/;

const BULLET_RE = /^[-•]\s+/;

interface ParsedLine {
  kind: 'title' | 'meta' | 'section' | 'bullet' | 'body' | 'blank';
  text: string;
  /** For section lines, the body that came after the colon on the same line. */
  inline?: string;
}

function parseReport(raw: string): ParsedLine[] {
  return raw.split('\n').map<ParsedLine>((line) => {
    const trimmed = line.trim();
    if (!trimmed) return { kind: 'blank', text: '' };
    if (TITLE_RE.test(trimmed)) return { kind: 'title', text: trimmed };
    const sectionMatch = trimmed.match(SECTION_LABEL_RE);
    if (sectionMatch) {
      const label = sectionMatch[1];
      const inline = trimmed.slice(label.length + 1).trim();
      return { kind: 'section', text: label, inline: inline || undefined };
    }
    if (META_LINE_RE.test(trimmed)) return { kind: 'meta', text: trimmed };
    if (BULLET_RE.test(trimmed)) return { kind: 'bullet', text: trimmed.replace(BULLET_RE, '') };
    return { kind: 'body', text: trimmed };
  });
}

/**
 * Render the meta header — the "Consumer: ... | State: ..." line. Splits on
 * "|" so each field becomes a small badge-style chip for quick scan.
 */
function MetaLine({ text }: { text: string }) {
  const parts = text.split('|').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {parts.map((part, i) => {
        const [label, ...rest] = part.split(':');
        const value = rest.join(':').trim();
        return (
          <span key={i} className="inline-flex items-baseline gap-1">
            <span className="font-semibold text-muted-foreground/80">{label.trim()}:</span>
            <span className="text-foreground">{value}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function ReportPreview({ reportText }: ReportPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  const lines = parseReport(reportText);

  return (
    <Card data-tour="report-preview">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileCheck className="h-5 w-5" />
          Compliance Report
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-1.5 h-4 w-4" />
          Print
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-950">
          <div className="space-y-2 text-sm leading-relaxed">
            {lines.map((line, i) => {
              switch (line.kind) {
                case 'title':
                  return (
                    <h2
                      key={i}
                      className="border-b border-primary/20 pb-2 text-base font-bold tracking-tight text-primary dark:text-primary"
                    >
                      {line.text}
                    </h2>
                  );
                case 'meta':
                  return <MetaLine key={i} text={line.text} />;
                case 'section':
                  return (
                    <div key={i} className="pt-3">
                      <h3
                        className={cn(
                          'inline-block rounded-sm bg-primary/10 px-1.5 py-0.5',
                          'text-[11px] font-bold uppercase tracking-wider text-primary',
                          'dark:bg-primary/20',
                        )}
                      >
                        {line.text}
                      </h3>
                      {line.inline && (
                        <p className="mt-1.5 text-foreground/90">{line.inline}</p>
                      )}
                    </div>
                  );
                case 'bullet':
                  return (
                    <div key={i} className="flex gap-2 pl-3 text-foreground/90">
                      <span className="select-none text-primary/60">•</span>
                      <span className="flex-1">{line.text}</span>
                    </div>
                  );
                case 'body':
                  return (
                    <p key={i} className="text-foreground/90">
                      {line.text}
                    </p>
                  );
                case 'blank':
                  return <Fragment key={i} />;
              }
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface Bullet {
  label?: string;
  text: string;
}

interface Explanation {
  title: string;
  bullets: Bullet[];
}

const EXPLANATIONS: Record<string, Explanation> = {
  'REQ-001': {
    title: 'Your baseline DSAR, end-to-end, zero human touches',
    bullets: [
      {
        label: 'Today',
        text: 'even a clean CCPA right-to-know touches 3 systems and 6+ manual handoffs (intake → search → decode → rules → report → review). Most of the 45-day clock is consumed before anyone makes a real judgment call.',
      },
      {
        label: 'Here',
        text: 'Maria Chen, three 5/5 matches, no exemptions, pipeline runs end-to-end without a single human decision. Minutes, not days.',
      },
      {
        label: 'Why this tab is first',
        text: 'every other scenario is this picture with one assumption broken (federal preemption, namesake collision, cross-state, coded fields, regulator audit). If the baseline doesn\'t land, the edge cases don\'t either.',
      },
    ],
  },
  'REQ-010': {
    title: 'When TDPSA "delete everything" meets CAN-SPAM "retain that one row"',
    bullets: [
      {
        label: 'Today',
        text: 'someone manually opens TDPSA, opens 16 CFR 316.5, does the date math (5-year retention from the spam complaint), reconciles the conflict by hand. May miss this entirely and cause compliance liability.',
      },
      {
        label: 'Here',
        text: 'engine flags the suppression row as federally-required retention, reports to delete everything else after approval, writes "16 CFR 316.5, retain until 2029-11-10" directly into the audit trail.',
      },
      {
        label: 'Why it matters',
        text: 'over-deletion of CAN-SPAM evidence can lead to FTC probe. This makes the response defensible by design, not by memo written under deadline.',
      },
    ],
  },
  'REQ-016': {
    title: 'The single highest-stakes failure mode, caught before sign-off',
    bullets: [
      {
        label: 'Today',
        text: 'name match returns 4 "John Browns." Analyst disambiguates by eyeballing email/state/phone. One bad day, wrong John gets the disclosure → consumer complaint → AG inquiry → potentially a notifiable breach.',
      },
      {
        label: 'Here',
        text: 'engine excludes the FL John using email + state + phone divergence, with explicit reasoning, and logs the exclusion so we can later prove we saw him and chose not to disclose.',
      },
      {
        label: 'Why it matters',
        text: 'what regulators want isn\'t "we matched correctly", it\'s the negative-case audit: "we considered, we excluded, here\'s why." That\'s exactly what gets recorded.',
      },
    ],
  },
  'REQ-015': {
    title: 'One request, two statutes, three records, per-record law, not per-request law',
    bullets: [
      {
        label: 'Today',
        text: 'Thomas (CA, CCPA) requests delete; one account is joint with Linda (VA, VCDPA). Today\'s choice is binary: delete it all and breach Linda\'s VCDPA rights, or under-respond to Thomas to play safe. No manual playbook scales this past ~50 requests/month.',
      },
      {
        label: 'Here',
        text: 'sole-owner profile → CCPA full-delete; joint loyalty + shared dealer purchase → VCDPA-aware mask-anonymize. Thomas gets his rights, Linda\'s data and warranty stay intact, both statutes cited per record.',
      },
      {
        label: 'Why it matters',
        text: 'this is where exposure compounds quietly. A wrong call on a joint record under VCDPA is a separate violation from any CCPA error, and nobody on the team will catch it until a regulator does.',
      },
    ],
  },
  'REQ-009': {
    title: '30–45 minutes per record returned to the privacy team, with §1798.110 conformance baked in',
    bullets: [
      {
        label: 'Today',
        text: '8 coded fields per record (INC_LVL, OCC_CD, EDU_LVL, SEG_VEH…). The privacy team opens cipher tables, decodes by hand, pastes into the disclosure. 30–45 min per record × every record with demographics.',
      },
      {
        label: 'Here',
        text: 'same record, same 8 fields, decoded into plain English in seconds — "INC_LVL=D" → "Income $75K–$100K" — with the source code preserved for the audit.',
      },
      {
        label: 'Why it matters',
        text: '§1798.110 and CTDPA both require inferences in plain English, not raw codes, regulators have explicitly called out raw-code disclosures as non-compliant. The compliance side is conformance; the operational side is the privacy team\'s day back.',
      },
    ],
  },
  'REQ-003': {
    title: 'The document you hand the regulator, citation-correct by state',
    bullets: [
      {
        label: 'Today',
        text: 'when a regulator or opposing counsel asks for the file, the team assembles it from logs, ticket comments, email threads. Citation is hand-picked, and on a Connecticut request, muscle memory often produces a CCPA citation.',
      },
      {
        label: 'Here',
        text: 'every AI decision, every rule, every vendor notification is timestamped and tagged against CTDPA Section 6(a) (not CCPA), with the 15-business-day vendor-notification window proven inline.',
      },
      {
        label: 'Why it matters',
        text: 'this is not a log file, it\'s the litigation defense document, generated as the request runs. A wrong-statute citation in an audit is the kind of thing that turns a clean response into a finding.',
      },
    ],
  },
};

export function ScenarioExplanation({ requestId }: { requestId: string }) {
  const data = EXPLANATIONS[requestId];
  if (!data) return null;

  return (
    <Card className="border-[hsl(var(--info)/0.3)] bg-[hsl(var(--info)/0.04)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--info))]" />
          What this scenario demonstrates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs font-medium text-foreground mb-2">{data.title}</div>
        <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          {data.bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-[hsl(var(--info))]" />
              <span>
                {b.label && (
                  <span className="font-semibold text-foreground">{b.label}: </span>
                )}
                {b.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

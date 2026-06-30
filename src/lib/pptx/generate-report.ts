// Generate a real PPTX compliance report for a DSAR request.
//
// Used by the post-approval pipeline tool when the operator authorizes the
// generate_pptx action. The output is a real .pptx file on disk that can
// be attached to the outbound email or opened directly from the Documents
// folder.
//
// Server-side only (Node fs).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import pptxgen from 'pptxgenjs';

import {
  getRequestById,
  getMatchesForRequest,
  getRecordById,
  getComplianceRules,
  getAuditTrailForRequest,
} from '@/lib/data';
import { getPool } from '@/lib/db';
import { buildLiveMatchesForRequest } from '@/lib/live-matches';
import { requestTypeLabel } from '@/lib/utils';
import type { MatchData, RecordData, RequestData } from '@/types';

export interface PptxGenerationResult {
  filename: string;
  path: string;
  sizeBytes: number;
}

interface IntakeRow {
  request_id: string;
  request_types: unknown;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  status: string;
  deadline_at: string | null;
  created_at: string;
}

/**
 * Look up a request by id across BOTH sources:
 * 1. Pre-baked seed JSON (REQ-001 through REQ-016 + named demos)
 * 2. Live intake submissions in `naica_demo.intake_requests` (REQ-1xxxxx)
 *
 * Returns a RequestData-shaped object so downstream code (PPTX gen, pipeline)
 * doesn't have to care which source it came from. Live-intake requests have
 * sparse fields (no matches yet, no report_text) — the consuming code
 * should handle empty arrays gracefully.
 */
export async function loadRequestForReport(
  requestId: string,
): Promise<RequestData | null> {
  // Try seed first — fast path.
  const seed = getRequestById(requestId);
  if (seed) return seed;

  // Fall back to live intake table.
  const { rows } = await getPool().query<IntakeRow>(
    `SELECT request_id, request_types, first_name, last_name, email, phone,
            state, status, deadline_at, created_at
     FROM naica_demo.intake_requests
     WHERE request_id = $1
     LIMIT 1`,
    [requestId],
  );
  const row = rows[0];
  if (!row) return null;

  // request_types is a JSON array (e.g. ["right_to_correct","right_to_delete"]).
  // Use the first entry as the canonical request_type; the others get joined
  // for display elsewhere.
  let requestType = 'unknown';
  if (Array.isArray(row.request_types) && row.request_types.length > 0) {
    requestType = String(row.request_types[0]);
  } else if (typeof row.request_types === 'string') {
    requestType = row.request_types;
  }

  const consumerName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.email || requestId;

  return {
    id: row.request_id,
    consumer_name: consumerName,
    consumer_email: row.email,
    consumer_phone: row.phone,
    consumer_state: row.state ?? '',
    request_type: requestType,
    status: row.status,
    duplicate_of_id: null,
    deadline_at: row.deadline_at ?? row.created_at,
    report_text: null,
    created_at: row.created_at,
    demo_scenario: 'live_intake',
  };
}

/**
 * Re-read the intake row in the shape buildLiveMatchesForRequest expects.
 * Used only for live-intake requests (REQ-1xxxxx) where matches/records
 * need to be synthesized at PPTX time — they aren't persisted anywhere.
 */
async function loadLiveIntakeForMatching(
  requestId: string,
): Promise<{
  request_id: string;
  request_type: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  state: string;
} | null> {
  const { rows } = await getPool().query<{
    request_id: string;
    request_types: unknown;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    state: string;
  }>(
    `SELECT request_id, request_types,
            first_name, last_name, email::text AS email, phone, state
       FROM naica_demo.intake_requests
      WHERE request_id = $1
      LIMIT 1`,
    [requestId],
  );
  const row = rows[0];
  if (!row) return null;
  let requestType = 'right_to_know';
  if (Array.isArray(row.request_types) && row.request_types.length > 0) {
    requestType = String(row.request_types[0]);
  } else if (typeof row.request_types === 'string') {
    requestType = row.request_types;
  }
  return {
    request_id: row.request_id,
    request_type: requestType,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    state: row.state,
  };
}

function getOutputDir(): string {
  const configured = process.env.PIPELINE_OUTPUT_DIR;
  if (configured) return configured;
  return path.join(os.homedir(), 'Documents', 'Instrata');
}

function slugForFilename(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a compliance report PPTX for one DSAR request and write it to disk.
 * Returns the absolute path + actual file size so the pipeline manifest
 * carries real numbers.
 *
 * If the request isn't found in the JSON seed, throws — caller should have
 * filtered to valid request_ids before calling.
 */
export async function generateComplianceReportPptx(
  requestId: string,
): Promise<PptxGenerationResult> {
  const request = await loadRequestForReport(requestId);
  if (!request) {
    throw new Error(`generateComplianceReportPptx: unknown request_id ${requestId}`);
  }

  // Seed-path data — populated for REQ-001…REQ-016 + named demos. For
  // live-intake requests (REQ-1xxxxx) these come back empty and we synthesize
  // from probes below.
  let matches: MatchData[] = getMatchesForRequest(requestId);
  const auditEntries = getAuditTrailForRequest(requestId);

  // Live records returned alongside synthesized matches — keyed by record_id
  // so the records slide can look up data_source without hitting the seed.
  const liveRecordsById = new Map<string, RecordData>();

  if (request.demo_scenario === 'live_intake' && matches.length === 0) {
    const intake = await loadLiveIntakeForMatching(requestId);
    if (intake) {
      try {
        const live = await buildLiveMatchesForRequest(intake);
        matches = live.matches;
        for (const rec of live.records) liveRecordsById.set(rec.id, rec);
      } catch (err) {
        console.error('[pptx] live match synthesis failed for', requestId, err);
      }
    }
  }

  const rule = getComplianceRules(request.consumer_state, request.request_type);

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33" × 7.5"
  pres.author = 'Izzy · Instrata privacy compliance agent';
  pres.company = 'Instrata';
  pres.title = `Compliance Report — ${request.id}`;

  // ─── Design system ─────────────────────────────────────────────────
  const palette = {
    bg: '0B1226',         // deep navy canvas
    surface: '141E36',    // panel/card bg
    surface2: '1B2747',   // table zebra alt
    border: '263352',     // subtle dividers
    fg: 'F4F4F5',         // primary text
    fgSecondary: 'CBD5E1',// secondary text
    muted: '94A3B8',      // labels, muted body
    dim: '64748B',        // very dim, captions
    accent: '60A5FA',     // brand sky-blue
    accentDeep: '2563EB', // pressed/darker brand
    danger: 'F87171',
    ok: '34D399',
    warn: 'FBBF24',
  };

  const dispositionStyle = (disp: string | null): { color: string; label: string } => {
    if (!disp) return { color: palette.muted, label: 'pending' };
    if (disp === 'full_delete') return { color: palette.danger, label: 'full delete' };
    if (disp === 'mask' || disp === 'redact') return { color: palette.warn, label: disp };
    if (disp === 'retain_exempt') return { color: palette.warn, label: 'retain (exempt)' };
    if (disp === 'disclose' || disp === 'fulfill') return { color: palette.ok, label: disp };
    return { color: palette.accent, label: disp.replace(/_/g, ' ') };
  };

  // ─── Slide masters: TITLE (full-bleed) + CONTENT (header/footer) ───
  // NOTE: background must be set on each slide instance below, not on the
  // master. PowerPoint and Keynote silently ignore layout-level backgrounds
  // on slides created with masterName — the slide just renders white. Masters
  // here only carry the repeating decorative objects (stripes, header strip,
  // footer text).
  pres.defineSlideMaster({
    title: 'TITLE',
    objects: [
      // Left vertical brand stripe
      { rect: { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: palette.accent } } },
      // Diagonal accent block (very subtle, lower-right)
      { rect: { x: 11.5, y: 6.6, w: 1.5, h: 0.04, fill: { color: palette.accent } } },
    ],
  });

  const footerLeft = `${request.id} · ${request.consumer_name}`;
  pres.defineSlideMaster({
    title: 'CONTENT',
    objects: [
      // Top header strip
      { rect: { x: 0, y: 0, w: 13.33, h: 0.32, fill: { color: palette.surface } } },
      { rect: { x: 0, y: 0, w: 0.18, h: 0.32, fill: { color: palette.accent } } },
      {
        text: {
          text: 'INSTRATA · PRIVACY COMPLIANCE',
          options: {
            x: 0.4, y: 0, w: 6, h: 0.32,
            fontSize: 9, color: palette.fgSecondary, bold: true, charSpacing: 3, valign: 'middle',
          },
        },
      },
      {
        text: {
          text: `${request.id}  ·  ${requestTypeLabel(request.request_type)}  ·  ${request.consumer_state}`,
          options: {
            x: 7, y: 0, w: 6.2, h: 0.32,
            fontSize: 9, color: palette.muted, align: 'right', valign: 'middle',
          },
        },
      },
      // Bottom footer strip
      { rect: { x: 0, y: 7.18, w: 13.33, h: 0.32, fill: { color: palette.surface } } },
      {
        text: {
          text: footerLeft,
          options: {
            x: 0.4, y: 7.18, w: 8, h: 0.32,
            fontSize: 9, color: palette.muted, valign: 'middle',
          },
        },
      },
      {
        text: {
          text: 'Confidential · Regulator-ready',
          options: {
            x: 8.5, y: 7.18, w: 4.5, h: 0.32,
            fontSize: 9, color: palette.dim, align: 'right', valign: 'middle', italic: true,
          },
        },
      },
    ],
    slideNumber: { x: 12.85, y: 7.18, w: 0.4, h: 0.32, fontSize: 9, color: palette.muted, align: 'right', valign: 'middle' },
  });

  // ─── Small helpers ─────────────────────────────────────────────────
  type Slide = ReturnType<typeof pres.addSlide>;

  const drawSlideTitle = (s: Slide, title: string, subtitle?: string) => {
    s.addText(title, {
      x: 0.5, y: 0.55, w: 12.3, h: 0.6,
      fontSize: 26, color: palette.fg, bold: true,
    });
    // 4px accent underline
    s.addShape(pres.ShapeType.rect, {
      x: 0.5, y: 1.18, w: 0.6, h: 0.05, fill: { color: palette.accent }, line: { color: palette.accent, width: 0 },
    });
    if (subtitle) {
      s.addText(subtitle, {
        x: 0.5, y: 1.28, w: 12.3, h: 0.35,
        fontSize: 12, color: palette.muted,
      });
    }
  };

  const drawPanel = (s: Slide, x: number, y: number, w: number, h: number, opts?: { label?: string }) => {
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h,
      fill: { color: palette.surface },
      line: { color: palette.border, width: 0.75 },
      rectRadius: 0.1,
    });
    if (opts?.label) {
      s.addText(opts.label, {
        x: x + 0.25, y: y + 0.15, w: w - 0.5, h: 0.3,
        fontSize: 10, color: palette.accent, bold: true, charSpacing: 2,
      });
    }
  };

  const drawPill = (s: Slide, x: number, y: number, label: string, color: string) => {
    // Approximate width based on label length (rough fitter)
    const w = Math.max(0.85, Math.min(2.4, 0.18 + label.length * 0.085));
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h: 0.32,
      fill: { color: palette.bg },
      line: { color, width: 1.25 },
      rectRadius: 0.05,
    });
    s.addText(label, {
      x, y, w, h: 0.32,
      fontSize: 10, color, bold: true, align: 'center', valign: 'middle',
    });
    return w;
  };

  const drawScoreBar = (s: Slide, x: number, y: number, score: number, max = 4) => {
    const totalW = 1.1;
    const segW = totalW / max;
    for (let i = 0; i < max; i++) {
      const filled = i < score;
      s.addShape(pres.ShapeType.rect, {
        x: x + i * (segW + 0.04), y, w: segW, h: 0.18,
        fill: { color: filled ? palette.accent : palette.border },
        line: { color: palette.border, width: 0 },
      });
    }
  };

  // ─── Slide 1: title ─────────────────────────────────────────────────
  const titleSlide = pres.addSlide({ masterName: 'TITLE' });
  titleSlide.background = { color: palette.bg };
  titleSlide.addText('PRIVACY COMPLIANCE REPORT', {
    x: 1.0, y: 1.2, w: 11, h: 0.4,
    fontSize: 12, color: palette.accent, bold: true, charSpacing: 6,
  });
  titleSlide.addText(request.consumer_name || request.id, {
    x: 1.0, y: 1.75, w: 11.5, h: 1.4,
    fontSize: 54, color: palette.fg, bold: true,
  });
  titleSlide.addText(requestTypeLabel(request.request_type), {
    x: 1.0, y: 3.25, w: 11, h: 0.5,
    fontSize: 22, color: palette.fgSecondary,
  });

  // Metadata chips row
  const chipY = 4.2;
  let chipX = 1.0;
  const writeChip = (text: string, color = palette.accent) => {
    const w = drawPill(titleSlide, chipX, chipY, text, color);
    chipX += w + 0.18;
  };
  writeChip(request.id);
  writeChip(request.consumer_state || 'state n/a', palette.fgSecondary);
  writeChip(`Filed ${new Date(request.created_at).toLocaleDateString()}`, palette.muted);
  writeChip(`Due ${new Date(request.deadline_at).toLocaleDateString()}`, palette.warn);
  writeChip(`${matches.length} record${matches.length === 1 ? '' : 's'}`, palette.ok);

  // Status line
  titleSlide.addText(
    [
      { text: 'STATUS  ', options: { color: palette.muted, fontSize: 10, bold: true, charSpacing: 3 } },
      { text: request.status.toUpperCase(), options: { color: palette.fg, fontSize: 10, bold: true } },
    ],
    { x: 1.0, y: 4.85, w: 11, h: 0.4 },
  );

  // Bottom attribution block
  titleSlide.addShape(pres.ShapeType.rect, {
    x: 1.0, y: 6.4, w: 0.4, h: 0.04, fill: { color: palette.accent }, line: { color: palette.accent, width: 0 },
  });
  titleSlide.addText(
    `Generated ${new Date().toLocaleString()}`,
    { x: 1.0, y: 6.5, w: 11, h: 0.3, fontSize: 10, color: palette.fgSecondary },
  );
  titleSlide.addText(
    'Izzy · Instrata privacy compliance agent',
    { x: 1.0, y: 6.8, w: 11, h: 0.3, fontSize: 10, color: palette.muted, italic: true },
  );

  // ─── Slide 2: summary ──────────────────────────────────────────────
  const summarySlide = pres.addSlide({ masterName: 'CONTENT' });
  summarySlide.background = { color: palette.bg };
  drawSlideTitle(summarySlide, 'Summary', 'Request snapshot and controlling statute');

  // Left column — Request facts panel
  drawPanel(summarySlide, 0.5, 1.85, 6.0, 5.0, { label: 'REQUEST' });
  const factRows: Array<[string, string]> = [
    ['Consumer', request.consumer_name || '—'],
    ['Email', request.consumer_email ?? '—'],
    ['State', request.consumer_state || '—'],
    ['Request type', requestTypeLabel(request.request_type)],
    ['Filed', new Date(request.created_at).toLocaleDateString()],
    ['Deadline', new Date(request.deadline_at).toLocaleDateString()],
    ['Status', request.status],
    ['Records matched', `${matches.length} across source systems`],
  ];
  factRows.forEach(([k, v], i) => {
    const y = 2.4 + i * 0.5;
    summarySlide.addText(k.toUpperCase(), {
      x: 0.75, y, w: 1.9, h: 0.4,
      fontSize: 9, color: palette.muted, bold: true, charSpacing: 2, valign: 'middle',
    });
    summarySlide.addText(v, {
      x: 2.65, y, w: 3.7, h: 0.4,
      fontSize: 13, color: palette.fg, valign: 'middle',
    });
  });

  // Right column — Controlling statute panel
  drawPanel(summarySlide, 6.8, 1.85, 6.0, 5.0, { label: 'CONTROLLING STATUTE' });
  if (rule) {
    summarySlide.addText(`${request.consumer_state} · ${requestTypeLabel(request.request_type)}`, {
      x: 7.05, y: 2.35, w: 5.5, h: 0.5, fontSize: 18, color: palette.fg, bold: true,
    });
    // Deadline pill
    summarySlide.addShape(pres.ShapeType.roundRect, {
      x: 7.05, y: 2.95, w: 1.9, h: 0.45,
      fill: { color: palette.bg }, line: { color: palette.accent, width: 1.25 }, rectRadius: 0.05,
    });
    summarySlide.addText(`${rule.deadline_days}-day response`, {
      x: 7.05, y: 2.95, w: 1.9, h: 0.45,
      fontSize: 11, color: palette.accent, bold: true, align: 'center', valign: 'middle',
    });

    summarySlide.addText('REQUIRED DISCLOSURES', {
      x: 7.05, y: 3.65, w: 5.5, h: 0.3,
      fontSize: 9, color: palette.muted, bold: true, charSpacing: 2,
    });
    const disclosures = rule.required_disclosures.length > 0
      ? rule.required_disclosures.slice(0, 4).map((d) => `•  ${d}`).join('\n')
      : '•  None enumerated by statute';
    summarySlide.addText(disclosures, {
      x: 7.05, y: 3.95, w: 5.5, h: 1.5,
      fontSize: 11, color: palette.fgSecondary, lineSpacingMultiple: 1.25,
    });

    summarySlide.addText('STATUTORY EXCEPTIONS', {
      x: 7.05, y: 5.55, w: 5.5, h: 0.3,
      fontSize: 9, color: palette.muted, bold: true, charSpacing: 2,
    });
    summarySlide.addText(
      `${rule.exceptions?.length ?? 0} carve-out${rule.exceptions?.length === 1 ? '' : 's'} considered during disposition planning`,
      { x: 7.05, y: 5.85, w: 5.5, h: 0.7, fontSize: 11, color: palette.fgSecondary, lineSpacingMultiple: 1.25 },
    );
  } else {
    summarySlide.addText(`No rule found for ${request.consumer_state} / ${requestTypeLabel(request.request_type)}.`, {
      x: 7.05, y: 2.5, w: 5.5, h: 0.5, fontSize: 13, color: palette.muted, italic: true,
    });
  }

  // ─── Slide 3: matched records ─────────────────────────────────────
  const recordsSlide = pres.addSlide({ masterName: 'CONTENT' });
  recordsSlide.background = { color: palette.bg };
  drawSlideTitle(recordsSlide, 'Matched records', `Identity probes across source systems returned ${matches.length} record${matches.length === 1 ? '' : 's'}`);

  if (matches.length === 0) {
    drawPanel(recordsSlide, 0.5, 2.0, 12.3, 1.5);
    recordsSlide.addText('No records matched in the source systems for this request.', {
      x: 0.75, y: 2.0, w: 11.8, h: 1.5,
      fontSize: 14, color: palette.muted, italic: true, align: 'center', valign: 'middle',
    });
  } else {
    // Stat strip — totals
    const sourcesHit = new Set(
      matches.map((m) => (getRecordById(m.record_id) ?? liveRecordsById.get(m.record_id))?.data_source ?? 'unknown'),
    );
    const ambiguousCount = matches.filter((m) => m.match_decision === 'ambiguous').length;
    const stats: Array<[string, string, string]> = [
      [`${matches.length}`, 'RECORDS', palette.fg],
      [`${sourcesHit.size}`, 'SOURCES', palette.accent],
      [`${ambiguousCount}`, 'AMBIGUOUS', ambiguousCount > 0 ? palette.warn : palette.muted],
    ];
    stats.forEach(([num, label, color], i) => {
      const sx = 0.5 + i * 1.55;
      drawPanel(recordsSlide, sx, 1.85, 1.4, 0.85);
      recordsSlide.addText(num, {
        x: sx, y: 1.9, w: 1.4, h: 0.45, fontSize: 22, color, bold: true, align: 'center',
      });
      recordsSlide.addText(label, {
        x: sx, y: 2.35, w: 1.4, h: 0.3, fontSize: 8, color: palette.muted, bold: true, charSpacing: 2, align: 'center',
      });
    });

    // Records table
    const headerCell = (text: string): pptxgen.TableCell => ({
      text,
      options: {
        bold: true, color: palette.accent, fill: { color: palette.surface },
        fontSize: 10, align: 'left', valign: 'middle',
      },
    });
    const rows: pptxgen.TableRow[] = [
      [headerCell('SOURCE'), headerCell('RECORD ID'), headerCell('MATCH SCORE'), headerCell('DISPOSITION')],
    ];
    matches.slice(0, 10).forEach((m, i) => {
      const rec = getRecordById(m.record_id) ?? liveRecordsById.get(m.record_id);
      const disp = dispositionStyle(m.disposition);
      const zebra = i % 2 === 0 ? palette.bg : palette.surface2;
      const cell = (text: string, color: string, opts?: { mono?: boolean }): pptxgen.TableCell => ({
        text,
        options: {
          color,
          fontSize: 11,
          fontFace: opts?.mono ? 'Menlo' : undefined,
          fill: { color: zebra },
          valign: 'middle',
        },
      });
      rows.push([
        cell(rec?.data_source ?? '—', palette.fg),
        cell(m.record_id, palette.fgSecondary, { mono: true }),
        cell(`${m.match_score}/4`, palette.fg, { mono: true }),
        cell(disp.label, disp.color, { mono: true }),
      ]);
    });
    recordsSlide.addTable(rows, {
      x: 0.5, y: 3.05, w: 12.3, colW: [3.0, 4.3, 1.8, 3.2],
      border: { type: 'solid', color: palette.border, pt: 0.5 },
      rowH: 0.38,
    });

    if (matches.length > 10) {
      recordsSlide.addText(`+ ${matches.length - 10} additional record${matches.length - 10 === 1 ? '' : 's'} not shown`, {
        x: 0.5, y: 6.85, w: 12.3, h: 0.25,
        fontSize: 10, color: palette.dim, italic: true, align: 'right',
      });
    }
  }

  // ─── Slide 4: disposition / report body ───────────────────────────
  const reportSlide = pres.addSlide({ masterName: 'CONTENT' });
  reportSlide.background = { color: palette.bg };
  drawSlideTitle(reportSlide, 'Disposition & reasoning', 'Regulator-ready narrative for the audit file');

  let reportBody: string;
  if (request.report_text) {
    reportBody = request.report_text.slice(0, 2200);
  } else if (matches.length > 0) {
    const dispCounts = matches.reduce<Record<string, number>>((acc, m) => {
      const k = m.disposition ?? 'pending';
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const dispLines = Object.entries(dispCounts)
      .map(([k, v]) => `  •  ${v} record(s) → ${k}`)
      .join('\n');
    const sourceCounts = matches.reduce<Record<string, number>>((acc, m) => {
      const rec = getRecordById(m.record_id) ?? liveRecordsById.get(m.record_id);
      const src = rec?.data_source ?? 'unknown';
      acc[src] = (acc[src] ?? 0) + 1;
      return acc;
    }, {});
    const sourceLines = Object.entries(sourceCounts)
      .map(([k, v]) => `  •  ${k}: ${v} match(es)`)
      .join('\n');
    const ruleLine = rule
      ? `Controlling rule: ${request.consumer_state} ${requestTypeLabel(request.request_type)} — respond within ${rule.deadline_days} days; ${rule.required_disclosures.length} required disclosure(s); ${rule.exceptions?.length ?? 0} statutory exception(s) considered.`
      : `No controlling rule found for ${request.consumer_state} / ${requestTypeLabel(request.request_type)}.`;
    reportBody = [
      `Consumer ${request.consumer_name} (${request.consumer_email ?? 'no email on file'}) filed a ${requestTypeLabel(request.request_type)} request under ${request.consumer_state} law on ${new Date(request.created_at).toLocaleDateString()}.`,
      ``,
      ruleLine,
      ``,
      `Identity probes across the operator's source systems returned ${matches.length} match(es):`,
      sourceLines,
      ``,
      `Preview disposition (projected from statutory rule, not yet operator-approved):`,
      dispLines,
      ``,
      `This deck reflects the pipeline state at the time of generation. Rerun the live pipeline to capture the report-generator sub-agent narrative into the audit chain before delivery.`,
    ].join('\n');
  } else {
    reportBody =
      'No matched records and no persisted narrative for this request. Re-run the pipeline to materialize matches and the agent-generated report text before regenerating this deck.';
  }
  drawPanel(reportSlide, 0.5, 1.85, 12.3, 5.0);
  reportSlide.addText(reportBody, {
    x: 0.85, y: 2.05, w: 11.6, h: 4.6,
    fontSize: 12, color: palette.fgSecondary, fontFace: 'Calibri',
    valign: 'top', lineSpacingMultiple: 1.35, paraSpaceAfter: 4,
  });

  // ─── Slide 5: audit chain summary ─────────────────────────────────
  const auditSlide = pres.addSlide({ masterName: 'CONTENT' });
  auditSlide.background = { color: palette.bg };
  drawSlideTitle(auditSlide, 'Audit chain', `${auditEntries.length} timestamped entr${auditEntries.length === 1 ? 'y' : 'ies'} in the chain of custody`);

  if (auditEntries.length === 0) {
    drawPanel(auditSlide, 0.5, 2.0, 12.3, 1.5);
    auditSlide.addText('No audit entries recorded for this request yet.', {
      x: 0.75, y: 2.0, w: 11.8, h: 1.5,
      fontSize: 14, color: palette.muted, italic: true, align: 'center', valign: 'middle',
    });
  } else {
    const auditHeader = (text: string): pptxgen.TableCell => ({
      text,
      options: {
        bold: true, color: palette.accent, fill: { color: palette.surface },
        fontSize: 10, valign: 'middle',
      },
    });
    const auditRows: pptxgen.TableRow[] = [
      [auditHeader('TIMESTAMP'), auditHeader('ACTOR'), auditHeader('ACTION')],
    ];
    auditEntries.slice(-12).forEach((e, i) => {
      const zebra = i % 2 === 0 ? palette.bg : palette.surface2;
      const isAgent = /^agent/i.test(e.actor);
      const isSystem = /^system/i.test(e.actor);
      const actorColor = isAgent ? palette.accent : isSystem ? palette.muted : palette.fg;
      auditRows.push([
        {
          text: new Date(e.created_at).toISOString().slice(0, 19).replace('T', ' '),
          options: { color: palette.fgSecondary, fontSize: 10, fontFace: 'Menlo', fill: { color: zebra }, valign: 'middle' },
        },
        {
          text: e.actor,
          options: { color: actorColor, fontSize: 10, bold: isAgent, fill: { color: zebra }, valign: 'middle' },
        },
        {
          text: e.action,
          options: { color: palette.fg, fontSize: 10, fill: { color: zebra }, valign: 'middle' },
        },
      ]);
    });
    auditSlide.addTable(auditRows, {
      x: 0.5, y: 1.85, w: 12.3, colW: [2.5, 4.0, 5.8],
      border: { type: 'solid', color: palette.border, pt: 0.5 },
      rowH: 0.36,
    });
  }

  // ─── Save ─────────────────────────────────────────────────────────
  const outDir = getOutputDir();
  await fs.promises.mkdir(outDir, { recursive: true });
  const filename = `${request.id}-${slugForFilename(request.consumer_name)}-Compliance-Report.pptx`;
  const absPath = path.join(outDir, filename);
  await pres.writeFile({ fileName: absPath });

  const stat = await fs.promises.stat(absPath);
  return { filename, path: absPath, sizeBytes: stat.size };
}

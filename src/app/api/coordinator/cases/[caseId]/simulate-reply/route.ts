import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { persistExtractedFacts } from '@/lib/coordinator-db';
import factsJson from '@/data/communication_extracted_facts.json';
import type { CommunicationExtractedFacts } from '@/types';

export const runtime = 'nodejs';

interface CannedReply {
  message_id: string;
  facts_id: string;
  sender: string;
  recipient: string;
  recipient_name: string;
  subject: string;
  body: string;
}

/**
 * Canned-reply fallback. Each entry corresponds to one (case_id, turn) pair.
 * Sender domains use yourcompany.com for the demo personas.
 */
const CANNED: Record<string, Record<string, CannedReply>> = {
  'CASE-VIN-001': {
    '1': {
      message_id: 'MSG-VIN-IN-001',
      facts_id: 'FACTS-VIN-IN-001',
      sender: 'shivi.sharma@yourcompany.com',
      recipient: process.env.SMTP_USER ?? 'izzy@example.com',
      recipient_name: 'Privacy Operations',
      subject: 'RE: Legacy CRM archive lookup — VIN JT4567890ABCDEFGH',
      body:
        "Hi —\n\nNot finding this VIN in archive_legacy_crm_2018 on my side. The migration log shows it was flagged for routing to the dealer-network archive group instead — Eric Park's team owns the pre-2019 dealer-sourced records that bypassed our central archive.\n\nFor your VIN, you'll want Eric Park <eric.park@yourcompany.com>, Dealer Network Archives. He has dealer-sourced retail records back to 2015 in dealer_network_archive_2018, including the Dallas-area dealers that match your geo-cluster.\n\nHappy to help further if Eric can't locate it either.\n\n— Shivi Sharma\nLegacy CRM Data & Migration Archive",
    },
    '2': {
      message_id: 'MSG-VIN-IN-002',
      facts_id: 'FACTS-VIN-IN-002',
      sender: 'shivi.sharma@yourcompany.com',
      recipient: process.env.SMTP_USER ?? 'izzy@example.com',
      recipient_name: 'Privacy Operations',
      subject: 'RE: Dealer-network archive lookup — VIN JT4567890ABCDEFGH (referred by Shivi Sharma)',
      body:
        "Hi —\n\nFound it. VIN JT4567890ABCDEFGH is in dealer_network_archive_2018 under dealer record DNA-44712. Original retail purchase from a Dallas dealer 2018-09-15.\n\nName: Kenji Fukushima\nEmail: k.fukushima@example.com\nPhone: 469-555-2210\nState: TX\nLast dealer-network activity: 2019-03-15\n\nThe migration job (mig-2019-q1-crm) flagged this record with a phone-format mismatch that broke the matching key during transform — record didn't carry forward to current Customer Master and was never replayed into the central CRM archive either, which is why Shivi didn't see it on her side. Common pattern; we have ~3,400 affected VINs in dealer-network archives in similar shape.\n\nLet me know if you need the migration log or other archive lookups.\n\n— Eric Park\nDealer Network Archives",
    },
  },
  // CASE-MC-001 (Consumer Reply scenario) has no offline fallback — that
  // scenario runs end-to-end on live Gmail replies. Only OUT-001 (DSAR
  // confirmation) is seeded; everything after is drafted live by the parser +
  // cascade.
};

/**
 * Insert a canned inbound reply (and its pre-baked extracted_facts row) for a
 * case that's awaiting a reply. Used as a no-IMAP fallback when the demo
 * machine can't reach the live mailbox.
 *
 *   POST /api/coordinator/cases/CASE-VIN-001/simulate-reply?turn=1
 */
export async function POST(req: NextRequest, ctx: { params: { caseId: string } }) {
  const { caseId } = ctx.params;
  const url = new URL(req.url);
  const turn = url.searchParams.get('turn') ?? '1';

  const canned = CANNED[caseId]?.[turn];
  if (!canned) {
    return NextResponse.json(
      { error: `No canned reply defined for caseId=${caseId} turn=${turn}` },
      { status: 404 },
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query<{ id: string }>(
      `SELECT id FROM comm_coordinator.messages WHERE id = $1`,
      [canned.message_id],
    );

    if (exists.rows.length === 0) {
      await client.query(
        `INSERT INTO comm_coordinator.messages
           (id, case_id, direction, channel, sender, recipient, recipient_name,
            subject, body, sent_at, received_at, agent_drafted,
            approved_by, approved_at)
         VALUES ($1, $2, 'inbound', 'email', $3, $4, $5, $6, $7, NULL, NOW(), false, NULL, NULL)`,
        [
          canned.message_id,
          caseId,
          canned.sender,
          canned.recipient,
          canned.recipient_name,
          canned.subject,
          canned.body,
        ],
      );
    }

    await client.query(
      `UPDATE comm_coordinator.cases
       SET state = 'reply_received', updated_at = NOW()
       WHERE id = $1`,
      [caseId],
    );

    await client.query('COMMIT');

    // Persist the canned facts row outside the transaction. persistExtractedFacts
    // uses the pool directly and is idempotent (UPSERT on facts.id).
    const facts = (factsJson as unknown as CommunicationExtractedFacts[]).find(
      (f) => f.id === canned.facts_id,
    );
    if (facts) {
      await persistExtractedFacts(facts);
    }

    return NextResponse.json({
      case_id: caseId,
      message_id: canned.message_id,
      facts_id: canned.facts_id,
      simulated: true,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

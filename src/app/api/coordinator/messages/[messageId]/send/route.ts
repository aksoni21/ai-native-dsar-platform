import { NextRequest, NextResponse } from 'next/server';

import { getPool } from '@/lib/db';
import { buildMessageId, sendEmail } from '@/lib/email/smtp';

export const runtime = 'nodejs';

interface SendBody {
  approved_by?: string;
}

/**
 * Approve + send a Coordinator outbound draft.
 *
 * Server-side representation of the operator clicking "Approve" in
 * OutboundDraftReview. Loads the draft from comm_coordinator.messages,
 * sends via SMTP, captures the assigned Message-ID, marks the row sent.
 */
export async function POST(req: NextRequest, ctx: { params: { messageId: string } }) {
  const { messageId } = ctx.params;
  const body = (await req.json().catch(() => ({}))) as SendBody;
  const approvedBy = body.approved_by || 'operator@instrata.com';

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{
      id: string;
      case_id: string;
      direction: string;
      recipient: string | null;
      recipient_name: string | null;
      subject: string | null;
      body: string;
      sent_at: string | null;
      rfc822_message_id: string | null;
    }>(
      `SELECT id, case_id, direction, recipient, recipient_name, subject, body,
              sent_at, rfc822_message_id
       FROM comm_coordinator.messages
       WHERE id = $1
       FOR UPDATE`,
      [messageId],
    );
    const draft = rows[0];

    if (!draft) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: `Message ${messageId} not found` }, { status: 404 });
    }
    if (draft.direction !== 'outbound') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Message ${messageId} is not an outbound draft (direction=${draft.direction})` },
        { status: 400 },
      );
    }
    if (draft.sent_at) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Message ${messageId} already sent at ${draft.sent_at}`, message_id: draft.rfc822_message_id },
        { status: 409 },
      );
    }
    if (!draft.recipient) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: `Message ${messageId} has no recipient set` }, { status: 400 });
    }

    const rfc822 = buildMessageId(draft.case_id, draft.id);

    const sendResult = await sendEmail({
      to: draft.recipient,
      toName: draft.recipient_name ?? undefined,
      subject: draft.subject ?? '(no subject)',
      body: draft.body,
      messageId: rfc822,
    });

    const sentAt = new Date().toISOString();
    await client.query(
      `UPDATE comm_coordinator.messages
       SET rfc822_message_id = $1,
           sent_at = $2,
           approved_by = $3,
           approved_at = $2
       WHERE id = $4`,
      [sendResult.messageId, sentAt, approvedBy, messageId],
    );

    await client.query(
      `UPDATE comm_coordinator.cases
       SET state = 'awaiting_reply',
           updated_at = NOW()
       WHERE id = $1 AND state IN ('open', 'awaiting_reply')`,
      [draft.case_id],
    );

    await client.query('COMMIT');

    return NextResponse.json({
      message_id: messageId,
      rfc822_message_id: sendResult.messageId,
      delivered_to: sendResult.deliveredTo,
      original_recipient: sendResult.originalRecipient,
      sent_at: sentAt,
      approved_by: approvedBy,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    // Surface the full error to the dev-server terminal so SMTP failures
    // (auth, DNS, throttling) don't have to be debugged from the browser.
    console.error('[coordinator/messages/send] failed:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * Smoke test for src/lib/email/smtp.ts — sends one tiny test email
 * (subject to EMAIL_OVERRIDE_TO redirect).
 *
 * Usage: npx tsx scripts/smoke_smtp.ts
 */
import { config as loadEnv } from 'dotenv';
import { buildMessageId, sendEmail } from '../src/lib/email/smtp';

loadEnv({ path: '.env.local' });

async function main() {
  const messageId = buildMessageId('CASE-SMOKE', 'MSG-SMOKE-001');
  console.log(`Sending with Message-ID: ${messageId}`);

  const result = await sendEmail({
    to: 'somewhere-original@example.com',
    toName: 'Demo Recipient',
    subject: 'Instrata Coordinator — SMTP smoke test',
    body:
      'Hi,\n\n' +
      "This is a smoke test from the Communication Coordinator's new SMTP module.\n" +
      "If you received this, the wiring works end-to-end (env vars, nodemailer, Gmail App Password, override redirect).\n\n" +
      "You can reply to this email to test the IMAP ingestion worker once it's running.\n\n" +
      'Thanks,\n' +
      'Instrata Privacy Operations',
    messageId,
  });

  console.log('Sent.');
  console.log('  delivered_to       :', result.deliveredTo);
  console.log('  original_recipient :', result.originalRecipient);
  console.log('  rfc822_message_id  :', result.messageId);
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});

/**
 * Smoke test: invoke parse_inbound_reply on a live IMAP-ingested message.
 * The first call should spawn the sub-agent + persist; the second should
 * return the cached row instantly.
 *
 * Usage: npx tsx scripts/smoke_inbound_parser.ts <messageId>
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const messageId = process.argv[2];
if (!messageId) {
  console.error('usage: tsx scripts/smoke_inbound_parser.ts <messageId>');
  process.exit(1);
}

async function main() {
  const { executeTool } = await import('../src/lib/tools');

  console.time('first call (sub-agent runs)');
  const r1 = await executeTool('parse_inbound_reply', { message_id: messageId });
  console.timeEnd('first call (sub-agent runs)');
  console.log(JSON.stringify(r1, null, 2));

  console.log('');
  console.time('second call (cached)');
  const r2 = await executeTool('parse_inbound_reply', { message_id: messageId });
  console.timeEnd('second call (cached)');
  console.log('classification (cached):', (r2 as { classification?: string }).classification);
}

main().catch((err) => {
  console.error('failed:', err);
  process.exit(1);
});

/**
 * One-off diagnostic: print the most-recent N inbox messages with their
 * From / Subject / In-Reply-To / Message-ID — used to debug why the
 * Coordinator IMAP cron isn't matching a reply to a case.
 *
 * Usage: npx tsx scripts/peek_imap_recent.ts [count]
 */
import { config as loadEnv } from 'dotenv';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

loadEnv({ path: '.env.local' });

const count = Number(process.argv[2] ?? 5);

async function main() {
  const imap = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: { user: process.env.IMAP_USER!, pass: process.env.IMAP_PASS! },
    logger: false,
  });
  await imap.connect();
  const lock = await imap.getMailboxLock('INBOX');
  try {
    const all = (await imap.search({ all: true }, { uid: true })) as number[] | false;
    if (!all || !Array.isArray(all)) {
      console.log('no messages');
      return;
    }
    const recent = all.slice(-count);
    for (const uid of recent) {
      const msg = await imap.fetchOne(
        String(uid),
        { source: true, internalDate: true, flags: true },
        { uid: true },
      );
      if (!msg || !msg.source) continue;
      const parsed = await simpleParser(msg.source);
      const fromValue = Array.isArray(parsed.from?.value)
        ? parsed.from!.value[0]
        : undefined;
      const seen = (msg.flags as Set<string>)?.has?.('\\Seen') ? 'seen' : 'unread';
      console.log('───────────────────────────────────────');
      console.log(`uid: ${uid}  [${seen}]  internalDate: ${msg.internalDate}`);
      console.log(`from: ${fromValue?.address ?? ''}`);
      console.log(`subject: ${parsed.subject ?? ''}`);
      console.log(`message-id: ${parsed.messageId ?? ''}`);
      console.log(`in-reply-to: ${parsed.inReplyTo ?? ''}`);
      const refsRaw = (parsed.headers as Map<string, unknown>).get?.('references');
      console.log(`references: ${refsRaw ?? ''}`);
      console.log(`body preview: ${(parsed.text ?? '').slice(0, 120).replace(/\n/g, ' ')}`);
    }
  } finally {
    lock.release();
    await imap.logout();
  }
}

main().catch((err) => {
  console.error('failed:', err);
  process.exit(1);
});

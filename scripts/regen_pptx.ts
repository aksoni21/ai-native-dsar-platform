import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { generateComplianceReportPptx } from '../src/lib/pptx/generate-report';

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('usage: tsx scripts/regen_pptx.ts <REQ-ID> [REQ-ID ...]');
  process.exit(1);
}

(async () => {
  for (const id of ids) {
    try {
      const out = await generateComplianceReportPptx(id);
      console.log(`${id}: ${out.filename}  ${out.sizeBytes} bytes  → ${out.path}`);
    } catch (e) {
      console.log(`${id}: FAILED — ${(e as Error).message}`);
    }
  }
  process.exit(0);
})();

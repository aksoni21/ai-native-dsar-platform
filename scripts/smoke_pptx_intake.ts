import { config } from 'dotenv';
config({ path: '.env.local' });

import { generateComplianceReportPptx, loadRequestForReport } from '../src/lib/pptx/generate-report';

(async () => {
  const id = process.argv[2] ?? 'REQ-100014';
  console.log('Looking up', id);
  const r = await loadRequestForReport(id);
  if (!r) {
    console.error('Not found in seed or intake_requests.');
    process.exit(1);
  }
  console.log('found:', r.consumer_name, '·', r.consumer_state, '·', r.request_type, '·', r.status);
  console.log('generating pptx...');
  const out = await generateComplianceReportPptx(id);
  console.log('OK:', out.path, '(' + out.sizeBytes + ' bytes)');
  process.exit(0);
})();

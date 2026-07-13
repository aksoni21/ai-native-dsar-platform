import { Suspense } from 'react';
import { DsarDemoClient } from '@/components/dsar/demo/DsarDemoClient';

export default function DsarDemoPage() {
  return (
    <Suspense fallback={null}>
      <DsarDemoClient />
    </Suspense>
  );
}

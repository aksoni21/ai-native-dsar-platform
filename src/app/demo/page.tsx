import { Suspense } from 'react';
import { DemoProvider } from '@/context/DemoContext';
import { DemoLayout } from '@/components/demo/DemoLayout';

export default function DemoPage() {
  return (
    <Suspense fallback={null}>
      <DemoProvider>
        <DemoLayout />
      </DemoProvider>
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle2, FileArchive } from 'lucide-react';
import { Button } from '@/components/ai-gov/ui/button';
import { Progress } from '@/components/ai-gov/ui/progress';

const STEPS = [
  'Gathering AI inventory…',
  'Compiling §1702 packets…',
  'Joining decision audit…',
  'Generating §1704 disclosures…',
  'Encrypting for AG portal…',
];

export function ExportPacketButton() {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  function start() {
    if (state !== 'idle') {
      setState('idle');
      setStep(0);
      setProgress(0);
      return;
    }
    setState('running');
    let s = 0;
    let pct = 0;
    const interval = setInterval(() => {
      pct += 8;
      setProgress(Math.min(100, pct));
      const nextStep = Math.min(STEPS.length - 1, Math.floor(pct / (100 / STEPS.length)));
      setStep(nextStep);
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => setState('done'), 300);
      }
    }, 220);
  }

  return (
    <div className="rounded-lg border bg-accent/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-2">
            <FileArchive className="h-4 w-4" />
            AG-ready response packet
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Inventory · packets · decisions · disclosures — one signed export.
          </div>
        </div>
        <Button onClick={start} variant={state === 'done' ? 'outline' : 'default'} className="shrink-0">
          {state === 'idle' && (
            <>
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </>
          )}
          {state === 'running' && <>Generating…</>}
          {state === 'done' && (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1.5 text-success" />
              Re-export
            </>
          )}
        </Button>
      </div>
      <AnimatePresence>
        {state !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Progress value={progress} className="h-2" />
            <div className="text-xs font-mono text-muted-foreground">
              {state === 'done' ? 'ag-response-2026-05-18.zip · 4.2 MB' : STEPS[step]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

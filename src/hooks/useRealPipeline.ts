'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { StepStatus, UsePipelineAnimationReturn } from './usePipelineAnimation';
import { allRequests, getMatchesForRequest, getOwnershipsForConsumer } from '@/lib/data';
import { PIPELINE_STEPS } from '@/lib/constants';

export interface UseRealPipelineReturn extends UsePipelineAnimationReturn {
  stepResults: Record<string, unknown>;
  errorMessage: string | null;
}

const STATIC_STEP_MS = 650;

export function useRealPipeline(requestId: string): UseRealPipelineReturn {
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepResults, setStepResults] = useState<Record<string, unknown>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset everything if the active request changes
  useEffect(() => {
    abortRef.current?.abort();
    setCurrentStep(-1);
    setIsRunning(false);
    setCompletedSteps(new Set());
    setStepResults({});
    setErrorMessage(null);
  }, [requestId]);

  const resetPipeline = useCallback(() => {
    abortRef.current?.abort();
    setCurrentStep(-1);
    setIsRunning(false);
    setCompletedSteps(new Set());
    setStepResults({});
    setErrorMessage(null);
  }, []);

  const startPipeline = useCallback(async () => {
    if (isRunning) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsRunning(true);
    setCurrentStep(-1);
    setCompletedSteps(new Set());
    setStepResults({});
    setErrorMessage(null);

    // ── Static-scenario branch ────────────────────────────────────────────
    // If the requestId is in the static demo set (REQ-001, REQ-VIN-001, etc.),
    // drive a local timed slideshow through PIPELINE_STEPS instead of hitting
    // /api/pipeline/run (which only knows about live intake requests). VIN
    // pipeline steps are skipped for scenarios without ownership data so the
    // animation matches the rail's view-availability gating.
    const staticReq = allRequests.find((r) => r.id === requestId);
    if (staticReq) {
      const matches = getMatchesForRequest(requestId);
      const ownerships = getOwnershipsForConsumer(staticReq.consumer_name);
      const hasVinData = ownerships.length > 0;
      const stepIsApplicable = (idx: number): boolean => {
        const id = PIPELINE_STEPS[idx]?.id;
        if (id === 'vin_expand' || id === 'vin_search') return hasVinData;
        return true;
      };

      try {
        for (let i = 0; i < PIPELINE_STEPS.length; i++) {
          if (abort.signal.aborted) return;
          if (!stepIsApplicable(i)) continue;
          setCurrentStep(i);
          await new Promise<void>((resolve, reject) => {
            const t = window.setTimeout(resolve, STATIC_STEP_MS);
            abort.signal.addEventListener(
              'abort',
              () => {
                window.clearTimeout(t);
                reject(new DOMException('Aborted', 'AbortError'));
              },
              { once: true },
            );
          });
          setCompletedSteps((prev) => {
            const next = new Set(prev);
            next.add(i);
            return next;
          });
          const stepId = PIPELINE_STEPS[i].id;
          setStepResults((prev) => ({
            ...prev,
            [stepId]: {
              static: true,
              records_seen:
                stepId === 'search'
                  ? matches.length
                  : stepId === 'score'
                    ? matches.length
                    : undefined,
            },
          }));
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setErrorMessage((err as Error).message);
        }
      } finally {
        setIsRunning(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
        signal: abort.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          if (event.type === 'step_started') {
            setCurrentStep(event.step as number);
          } else if (event.type === 'step_completed') {
            const step = event.step as number;
            const id = event.id as string;
            setCompletedSteps((prev) => {
              const next = new Set(prev);
              next.add(step);
              return next;
            });
            setStepResults((prev) => ({ ...prev, [id]: event.result }));
          } else if (event.type === 'error') {
            setErrorMessage((event.message as string) ?? 'Pipeline error');
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, requestId]);

  const getStepStatus = useCallback(
    (index: number): StepStatus => {
      if (completedSteps.has(index)) return 'completed';
      if (index === currentStep && isRunning) return 'running';
      return 'pending';
    },
    [completedSteps, currentStep, isRunning],
  );

  return {
    currentStep,
    isRunning,
    completedSteps,
    startPipeline,
    resetPipeline,
    getStepStatus,
    stepResults,
    errorMessage,
  };
}

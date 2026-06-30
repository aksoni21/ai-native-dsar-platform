"use client";

import { useEffect } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PIPELINE_STEPS } from '@/lib/constants';
import type { UsePipelineAnimationReturn } from '@/hooks/usePipelineAnimation';

interface PipelineAnimationProps extends UsePipelineAnimationReturn {
  onStepChange?: (step: number) => void;
}

export default function PipelineAnimation({
  currentStep,
  isRunning,
  completedSteps,
  startPipeline,
  resetPipeline,
  getStepStatus,
  onStepChange,
}: PipelineAnimationProps) {
  const totalSteps = PIPELINE_STEPS.length;
  const progress =
    currentStep < 0
      ? 0
      : Math.round(((completedSteps.size) / totalSteps) * 100);

  useEffect(() => {
    if (onStepChange && currentStep >= 0) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  return (
    <div
      className="flex flex-wrap items-center gap-4"
      data-tour="pipeline-animation"
    >
      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isRunning && currentStep < 0 && (
          <Button onClick={startPipeline}>
            <Play className="mr-1.5 h-4 w-4" />
            Run Pipeline
          </Button>
        )}
        {!isRunning && currentStep >= 0 && (
          <>
            <Button variant="outline" onClick={resetPipeline}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={startPipeline}>
              <Play className="mr-1.5 h-4 w-4" />
              Re-run
            </Button>
          </>
        )}
        {isRunning && (
          <Button variant="outline" disabled>
            Running...
          </Button>
        )}
      </div>

      {/* Step counter */}
      {currentStep >= 0 && (
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}
          </span>
          <Progress value={progress} className="h-2 flex-1" />
        </div>
      )}
    </div>
  );
}

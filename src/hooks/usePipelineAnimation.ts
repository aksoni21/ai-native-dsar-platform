// Pipeline step status + hook return shape. The original
// `usePipelineAnimation` hook (a setTimeout slideshow) was replaced by
// `useRealPipeline`, which drives steps from real /api/pipeline/run events.
// These type exports remain because PipelineAnimation/WorkflowTimeline still
// consume them.

export type StepStatus = 'completed' | 'running' | 'pending';

export interface UsePipelineAnimationReturn {
  currentStep: number;
  isRunning: boolean;
  completedSteps: Set<number>;
  startPipeline: () => void;
  resetPipeline: () => void;
  getStepStatus: (index: number) => StepStatus;
}

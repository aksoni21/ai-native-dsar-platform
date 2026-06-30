"use client";

import {
  Check,
  FileText,
  Copy,
  Search,
  BarChart3,
  Brain,
  Key,
  Scale,
  ClipboardList,
  FileCheck,
  UserCheck,
  Zap,
} from 'lucide-react';
import { PIPELINE_STEPS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { StepStatus } from '@/hooks/usePipelineAnimation';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Copy,
  Search,
  BarChart3,
  Brain,
  Key,
  Scale,
  ClipboardList,
  FileCheck,
  UserCheck,
  Zap,
};

interface WorkflowTimelineProps {
  currentStep: number;
  getStepStatus: (index: number) => StepStatus;
}

export default function WorkflowTimeline({
  currentStep,
  getStepStatus,
}: WorkflowTimelineProps) {
  return (
    <div
      className="overflow-x-auto pb-2"
      data-tour="workflow-timeline"
    >
      <div className="flex min-w-max items-center gap-0 md:flex-wrap md:min-w-0">
        {PIPELINE_STEPS.map((step, index) => {
          const status = getStepStatus(index);
          const IconComponent = ICON_MAP[step.icon] || FileText;

          return (
            <div
              key={step.id}
              className="flex items-center"
              data-tour={`pipeline-step-${step.id}`}
            >
              {/* Step */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    status === 'completed' &&
                      'border-green-500 bg-green-500 text-white',
                    status === 'running' &&
                      'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 animate-pulse',
                    status === 'pending' &&
                      'border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <IconComponent className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    status === 'completed' && 'text-green-700 dark:text-green-400',
                    status === 'running' && 'text-blue-700 dark:text-blue-400',
                    status === 'pending' && 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < PIPELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-1 h-0.5 w-6 flex-shrink-0 transition-colors duration-300',
                    status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

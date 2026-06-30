'use client';

import { useDemoContext } from '@/context/DemoContext';
import { ScenarioTabs } from './ScenarioTabs';
import RequestDetailView from '@/components/requests/RequestDetailView';

export function WorkflowPane() {
  const { activeScenario } = useDemoContext();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Scenario nav strip */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm px-3 sm:px-4 py-2">
        <ScenarioTabs />
      </div>

      {/* Detail area — owns its full layout (rail + scrolling stage) */}
      <div className="flex-1 overflow-hidden">
        <RequestDetailView key={activeScenario.requestId} id={activeScenario.requestId} />
      </div>
    </div>
  );
}

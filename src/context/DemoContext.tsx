'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LayoutMode, ScenarioConfig } from '@/types';
import { SCENARIOS, DEFAULT_SCENARIO_ID } from '@/lib/constants';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'naica-demo-theme';

/** Synthetic scenario id reserved for live-request mode. Never collides with
 * the static SCENARIOS entries (1-6). */
export const LIVE_SCENARIO_ID = 0;

function buildLiveScenario(requestId: string): ScenarioConfig {
  return {
    id: LIVE_SCENARIO_ID,
    label: 'Live request',
    shortLabel: requestId,
    requestId,
    description: `Live request ${requestId} submitted via /intake. Source-system data was auto-seeded; click Run to drive the pipeline against it.`,
    proactiveMessage: `You're looking at ${requestId} — a live request submitted through the Privacy Rights Portal. The pipeline hasn't run yet. Click Run on the rail to see how the AI agent searches every connected system, scores matches, decodes coded fields, and applies state-specific rules to this request.`,
    suggestedQueries: [
      'Walk me through what will happen when I click Run',
      'What systems will the search probe?',
      'Which compliance rules apply here?',
      'Why is the rail mostly empty before Run?',
    ],
    momentViewId: 'search',
    momentHeadline: `${requestId} · live request — click Run to drive the pipeline.`,
  };
}

interface DemoContextValue {
  activeScenario: ScenarioConfig;
  layoutMode: LayoutMode;
  theme: Theme;
  proactiveTrigger: { scenarioId: number; timestamp: number } | null;
  setActiveScenario: (id: number) => void;
  setActiveLiveRequestId: (requestId: string) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setTheme: (theme: Theme) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRequestId = searchParams.get('request_id');

  // Compute initial state from the URL synchronously so SSR + first paint
  // already reflect ?request_id=… instead of flashing the default scenario.
  const initialStaticMatch = urlRequestId
    ? SCENARIOS.find((s) => s.requestId === urlRequestId)
    : undefined;

  const [activeScenarioId, setActiveScenarioId] = useState<number>(
    initialStaticMatch?.id ?? DEFAULT_SCENARIO_ID,
  );
  const [liveScenario, setLiveScenario] = useState<ScenarioConfig | null>(() =>
    urlRequestId && !initialStaticMatch ? buildLiveScenario(urlRequestId) : null,
  );
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('full-ui');
  const [theme, setThemeState] = useState<Theme>('light');
  const [proactiveTrigger, setProactiveTrigger] = useState<{ scenarioId: number; timestamp: number } | null>(null);

  // Hydrate theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
      }
    } catch {
      /* ignore storage failures */
    }
  }, []);

  // Re-sync state when the URL changes after mount (e.g. browser back/forward).
  useEffect(() => {
    if (!urlRequestId) {
      // ?request_id was removed — drop the live scenario but keep the
      // currently selected static one.
      setLiveScenario(null);
      return;
    }
    const matchingStatic = SCENARIOS.find((s) => s.requestId === urlRequestId);
    if (matchingStatic) {
      if (liveScenario) setLiveScenario(null);
      if (activeScenarioId !== matchingStatic.id) {
        setActiveScenarioId(matchingStatic.id);
        setProactiveTrigger({ scenarioId: matchingStatic.id, timestamp: Date.now() });
      }
      return;
    }
    if (!liveScenario || liveScenario.requestId !== urlRequestId) {
      const synthetic = buildLiveScenario(urlRequestId);
      setLiveScenario(synthetic);
      setProactiveTrigger({ scenarioId: LIVE_SCENARIO_ID, timestamp: Date.now() });
    }
  }, [urlRequestId, liveScenario, activeScenarioId]);

  const activeScenario = useMemo<ScenarioConfig>(() => {
    if (liveScenario) return liveScenario;
    return SCENARIOS.find((s) => s.id === activeScenarioId) ?? SCENARIOS[0];
  }, [liveScenario, activeScenarioId]);

  const setActiveScenario = useCallback(
    (id: number) => {
      setLiveScenario(null);
      setActiveScenarioId(id);
      setProactiveTrigger({ scenarioId: id, timestamp: Date.now() });
      // Drop any stale ?request_id from the URL when jumping to a static tab.
      if (urlRequestId) {
        router.replace('/demo');
      }
    },
    [router, urlRequestId],
  );

  const setActiveLiveRequestId = useCallback(
    (requestId: string) => {
      const matchingStatic = SCENARIOS.find((s) => s.requestId === requestId);
      if (matchingStatic) {
        setLiveScenario(null);
        setActiveScenarioId(matchingStatic.id);
        setProactiveTrigger({ scenarioId: matchingStatic.id, timestamp: Date.now() });
        router.replace(`/demo?request_id=${encodeURIComponent(requestId)}`);
        return;
      }
      const synthetic = buildLiveScenario(requestId);
      setLiveScenario(synthetic);
      setProactiveTrigger({ scenarioId: LIVE_SCENARIO_ID, timestamp: Date.now() });
      router.replace(`/demo?request_id=${encodeURIComponent(requestId)}`);
    },
    [router],
  );

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore storage failures */
    }
  }, []);

  return (
    <DemoContext.Provider
      value={{
        activeScenario,
        layoutMode,
        theme,
        proactiveTrigger,
        setActiveScenario,
        setActiveLiveRequestId,
        setLayoutMode,
        setTheme,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoContext must be used inside DemoProvider');
  return ctx;
}

'use client';

import * as React from 'react';
import type { Vertical } from '@/types/ai-gov';

interface VerticalContextValue {
  vertical: Vertical;
  setVertical: (v: Vertical) => void;
  hydrated: boolean;
}

const VerticalContext = React.createContext<VerticalContextValue | undefined>(
  undefined
);

const STORAGE_KEY = 'naica_vertical';
const COOKIE_KEY = 'naica_vertical';

export function useVertical(): VerticalContextValue {
  const ctx = React.useContext(VerticalContext);
  if (!ctx) throw new Error('useVertical must be used within VerticalProvider');
  return ctx;
}

function writeCookie(value: Vertical) {
  if (typeof document === 'undefined') return;
  // 30-day cookie, lax. Demo only — no security implications.
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function VerticalProvider({ children }: { children: React.ReactNode }) {
  const [vertical, setVerticalState] = React.useState<Vertical>('automotive');
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Vertical | null;
      if (stored === 'lending' || stored === 'hr' || stored === 'automotive') {
        setVerticalState(stored);
        writeCookie(stored);
      } else {
        writeCookie('automotive');
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const setVertical = React.useCallback((v: Vertical) => {
    setVerticalState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore
    }
    writeCookie(v);
  }, []);

  return (
    <VerticalContext.Provider value={{ vertical, setVertical, hydrated }}>
      {children}
    </VerticalContext.Provider>
  );
}

'use client';

import { useEffect, useState } from 'react';

const SELECTOR = '[data-tour="header-controls"]';
const SEEN_KEY = 'naica-tour-seen-v1';
const SHOW_MS = 5000;
const ARROW_BOX = 84;
const TIP_INSET = 6;
const GAP = 12;

interface Anchor {
  arrowLeft: number;
  arrowTop: number;
}

function computeAnchor(rect: DOMRect): Anchor {
  // Arrow points UP at the header controls. Tip near the target's bottom-center;
  // body extends down. SVG is 84×84 with tip at (42, 6) — no rotation needed.
  const tipX = rect.left + rect.width / 2;
  const tipY = rect.bottom + GAP;
  return {
    arrowLeft: tipX - ARROW_BOX / 2,
    arrowTop: tipY - TIP_INSET,
  };
}

export function TourOverlay() {
  const [visible, setVisible] = useState<boolean>(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(SEEN_KEY)) return;

    let cancelled = false;
    const tryShow = (attempt: number) => {
      if (cancelled) return;
      const el = document.querySelector(SELECTOR) as HTMLElement | null;
      if (!el) {
        if (attempt < 20) setTimeout(() => tryShow(attempt + 1), 100);
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        if (attempt < 20) setTimeout(() => tryShow(attempt + 1), 100);
        return;
      }
      setAnchor(computeAnchor(rect));
      setVisible(true);
      window.localStorage.setItem(SEEN_KEY, '1');
      setTimeout(() => setVisible(false), SHOW_MS);
    };
    const startTimer = setTimeout(() => tryShow(0), 600);

    const onResize = () => {
      const el = document.querySelector(SELECTOR) as HTMLElement | null;
      if (!el) return;
      setAnchor(computeAnchor(el.getBoundingClientRect()));
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  if (!visible || !anchor) return null;

  return (
    <div
      className="pointer-events-none fixed z-[60] tour-arrow-up"
      style={{
        left: anchor.arrowLeft,
        top: anchor.arrowTop,
        width: ARROW_BOX,
        height: ARROW_BOX,
      }}
    >
      <svg width={ARROW_BOX} height={ARROW_BOX} viewBox="0 0 84 84" aria-hidden="true">
        <path
          d="M 42 6 L 70 36 L 56 36 L 56 78 L 28 78 L 28 36 L 14 36 Z"
          fill="hsl(var(--primary))"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

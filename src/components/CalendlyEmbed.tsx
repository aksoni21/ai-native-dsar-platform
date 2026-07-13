'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js';
const STYLES_HREF = 'https://assets.calendly.com/assets/external/widget.css';

interface CalendlyEmbedProps {
  /** Full Calendly event URL, e.g. https://calendly.com/your-handle/30min */
  url: string;
  /** Pixel height of the inline widget. Calendly recommends ~700 for 30-min slots. */
  height?: number;
  /** Force light/dark — Calendly's iframe theme. */
  hideEventTypeDetails?: boolean;
  /** Brand color override (hex without #) for the iframe accents. */
  primaryColor?: string;
  /** Iframe background color override (hex without #). Defaults to the original dark embed's color. */
  backgroundColor?: string;
  /** Iframe text color override (hex without #). Defaults to the original dark embed's color. */
  textColor?: string;
  className?: string;
}

/**
 * Inline Calendly date-picker. Loads the Calendly widget script on first mount,
 * lets Calendly render its iframe into the slot div. Cleans up on unmount.
 *
 * Calendly's script auto-scans the DOM for .calendly-inline-widget and
 * mounts widgets there, so we just render a div with the right data-url
 * and hand off control.
 */
export function CalendlyEmbed({
  url,
  height = 720,
  hideEventTypeDetails = false,
  primaryColor = '2563eb',
  backgroundColor = '0f1626',
  textColor = 'ffffff',
  className,
}: CalendlyEmbedProps) {
  useEffect(() => {
    // Inject stylesheet (idempotent)
    const cssId = 'calendly-widget-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = STYLES_HREF;
      document.head.appendChild(link);
    }

    // Inject script (idempotent — Calendly handles re-init internally)
    const scriptId = 'calendly-widget-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Calendly reads URL parameters from the data-url attribute, including theme/color overrides
  const params = new URLSearchParams();
  if (hideEventTypeDetails) params.set('hide_event_type_details', '1');
  params.set('background_color', backgroundColor);
  params.set('text_color', textColor);
  params.set('primary_color', primaryColor);
  const dataUrl = `${url}?${params.toString()}`;

  return (
    <div
      className={cn('calendly-inline-widget w-full overflow-hidden rounded-xl border border-border', className)}
      data-url={dataUrl}
      style={{ minWidth: 320, height }}
    />
  );
}

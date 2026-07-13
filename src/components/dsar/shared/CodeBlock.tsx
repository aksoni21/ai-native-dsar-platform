import { cn } from '@/lib/utils';

/** Dark code panel. Accepts children rather than a plain string so callers
 * can hand-color specific tokens (as the Homepage open-source snippet does)
 * while the Docs code blocks just pass preformatted plain text. */
export function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-x-auto whitespace-pre-wrap rounded-xl bg-[hsl(var(--foreground))] p-[18px] font-mono text-[12.5px] leading-[1.7] text-[#C6CBD8]',
        className
      )}
    >
      {children}
    </div>
  );
}

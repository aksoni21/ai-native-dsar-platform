interface LogoMarkProps {
  /** 'onLight' = ink square (nav on white bg); 'onDark' = white square (app bars, footer) */
  variant?: 'onLight' | 'onDark';
  size?: number;
}

/** The rotated-square Instrata glyph — reused across every /dsar nav and app bar. */
export function LogoMark({ variant = 'onLight', size = 26 }: LogoMarkProps) {
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-[7px]"
      style={{
        width: size,
        height: size,
        background: variant === 'onDark' ? '#fff' : 'hsl(var(--foreground))',
      }}
    >
      <span
        className="rounded-[3px] bg-[hsl(var(--primary))]"
        style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42), transform: 'rotate(45deg)' }}
      />
    </span>
  );
}

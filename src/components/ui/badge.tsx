import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Tint-style chips (tint bg + tint border + colored text) used by the
        // /dsar screens — additive, doesn't touch the variants above.
        accent: 'border-[hsl(var(--accent-tint-border))] bg-[hsl(var(--accent-tint))] text-[hsl(var(--accent-foreground))]',
        success: 'border-[hsl(var(--success-tint-border))] bg-[hsl(var(--success-tint))] text-[hsl(var(--success))]',
        warn: 'border-[hsl(var(--warn-tint-border))] bg-[hsl(var(--warn-tint))] text-[hsl(var(--warning))]',
        danger: 'border-[hsl(var(--danger-tint-border))] bg-[hsl(var(--danger-tint))] text-[hsl(var(--destructive))]',
        neutral: 'border-[hsl(var(--neutral-tint-border))] bg-[hsl(var(--neutral-tint))] text-[hsl(var(--neutral-text))]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

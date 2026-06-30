import { cn } from '@/lib/ai-gov/utils';

interface Props {
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ title, description, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed bg-muted/30 p-8 text-center',
        className
      )}
    >
      <div className="font-medium">{title}</div>
      {description && (
        <div className="text-sm text-muted-foreground mt-1">{description}</div>
      )}
    </div>
  );
}

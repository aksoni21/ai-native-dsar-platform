import { CodeBlock } from '../shared/CodeBlock';

export interface DocSectionData {
  id: string;
  n: string;
  title: string;
  body: string;
  tone: 'dark' | 'accent' | 'success';
  code?: string;
  items?: { k: string; v: string }[];
}

const TONE_CLASSES: Record<DocSectionData['tone'], string> = {
  dark: 'bg-[hsl(var(--foreground))] text-white',
  accent: 'bg-[hsl(var(--accent-tint))] text-[hsl(var(--accent-foreground))]',
  success: 'bg-[hsl(var(--success-tint))] text-[hsl(var(--success-hover))]',
};

export function DocSection({ section }: { section: DocSectionData }) {
  return (
    <div id={section.id} className="mt-11 border-t border-[hsl(var(--line-soft-3))] pt-2">
      <div className="mt-6 flex items-center gap-3">
        <span
          className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg font-mono text-[13px] font-semibold ${TONE_CLASSES[section.tone]}`}
        >
          {section.n}
        </span>
        <h2 className="text-[23px] font-extrabold tracking-[-0.015em] text-foreground">{section.title}</h2>
      </div>
      <p className="mt-3.5 max-w-[62ch] text-[15.5px] leading-[1.6] text-[hsl(var(--text-body))]">{section.body}</p>

      {section.code && <CodeBlock className="mt-4">{section.code}</CodeBlock>}

      {section.items && (
        <div className="mt-4 flex flex-col gap-2.5">
          {section.items.map((it) => (
            <div key={it.k} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-[hsl(var(--text-secondary))]">
              <span className="mt-0.5 flex-none text-primary">•</span>
              <span>
                <b className="text-foreground">{it.k}</b> — {it.v}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

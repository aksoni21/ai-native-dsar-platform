'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { ThemeToggle } from '@/components/demo/ThemeToggle';
import { cn } from '@/lib/utils';
import type { Theme } from '@/context/DemoContext';

const THEME_STORAGE_KEY = 'naica-demo-theme';

type Person = {
  name: string;
  role: string;
  team: string;
  email: string;
  phone: string;
  location: string;
  /** Optional flag to highlight a contact already wired into the demo flow. */
  demoNote?: string;
};

const PEOPLE: Person[] = [
  // Privacy & Compliance
  {
    name: 'Mary Alston',
    role: 'Director, Privacy & Compliance',
    team: 'Privacy & Compliance',
    email: 'mary.alston@yourcompany.com',
    phone: '+1 (615) 725-0142',
    location: 'Franklin, TN',
    demoNote: 'Pipeline report recipient · "mary"',
  },
  {
    name: 'Harry Velazquez',
    role: 'Senior Privacy Counsel',
    team: 'Privacy & Compliance',
    email: 'harry.velazquez@yourcompany.com',
    phone: '+1 (615) 725-0188',
    location: 'Franklin, TN',
    demoNote: 'Pipeline report recipient · "harry"',
  },
  {
    name: 'Aisha Bello',
    role: 'DSAR Operations Lead',
    team: 'Privacy & Compliance',
    email: 'aisha.bello@yourcompany.com',
    phone: '+1 (615) 725-0210',
    location: 'Franklin, TN',
  },

  // Legal
  {
    name: 'Shameak Rosenfield',
    role: 'Associate General Counsel',
    team: 'Legal',
    email: 'shameak.rosenfeld@yourcompany.com',
    phone: '+1 (310) 555-0148',
    location: 'Los Angeles, CA',
  },
  {
    name: 'Colton Driver',
    role: 'Compliance Attorney, State Privacy',
    team: 'Legal',
    email: 'colton.driver@yourcompany.com',
    phone: '+1 (615) 725-0354',
    location: 'Franklin, TN',
  },

  // Customer Operations
  {
    name: 'Linda Park',
    role: 'Director, Customer Operations',
    team: 'Customer Operations',
    email: 'linda.park@yourcompany.com',
    phone: '+1 (615) 725-1102',
    location: 'Franklin, TN',
  },
  {
    name: 'Brian Costa',
    role: 'Intake & Triage Manager',
    team: 'Customer Operations',
    email: 'brian.costa@yourcompany.com',
    phone: '+1 (615) 725-1147',
    location: 'Franklin, TN',
  },

  // Dealer Network
  {
    name: 'Eric Park',
    role: 'Records Lead, Dealer Network Archives',
    team: 'Dealer Network',
    email: 'eric.park@yourcompany.com',
    phone: '+1 (214) 555-0317',
    location: 'Dallas, TX',
    demoNote: 'Orphan VIN redirect target · scenario 7',
  },
  {
    name: 'Kenji Fukushima',
    role: 'Dealer Operations Manager',
    team: 'Dealer Network',
    email: 'kenji.fukushima@yourcompany.com',
    phone: '+1 (214) 555-0488',
    location: 'Dallas, TX',
    demoNote: 'Attribution target · scenario 7',
  },
  {
    name: 'Sylvia Mendoza',
    role: 'Legacy CRM Archivist',
    team: 'Dealer Network',
    email: 'sylvia.mendoza@yourcompany.com',
    phone: '+1 (615) 725-0972',
    location: 'Franklin, TN',
    demoNote: 'Outreach #1 responder · scenario 7',
  },

  // Data Engineering
  {
    name: 'Jordan Reyes',
    role: 'Data Platform Lead',
    team: 'Data Engineering',
    email: 'jordan.reyes@yourcompany.com',
    phone: '+1 (615) 725-2010',
    location: 'Franklin, TN',
  },
  {
    name: 'Priya Sundaram',
    role: 'Senior Engineer, Identity Graph',
    team: 'Data Engineering',
    email: 'priya.sundaram@yourcompany.com',
    phone: '+1 (615) 725-2044',
    location: 'Franklin, TN',
  },

  // Vehicle Services
  {
    name: 'Anya Petrov',
    role: 'Telematics Operations',
    team: 'Vehicle Services',
    email: 'anya.petrov@yourcompany.com',
    phone: '+1 (615) 725-3120',
    location: 'Franklin, TN',
  },
  {
    name: 'Carlos Mendes',
    role: 'Vehicle Services Engineer',
    team: 'Vehicle Services',
    email: 'carlos.mendes@yourcompany.com',
    phone: '+1 (615) 725-3187',
    location: 'Franklin, TN',
  },

  // Marketing Operations
  {
    name: 'Rebecca Hsu',
    role: 'CAN-SPAM Compliance Lead',
    team: 'Marketing Operations',
    email: 'rebecca.hsu@yourcompany.com',
    phone: '+1 (615) 725-4488',
    location: 'Franklin, TN',
  },
  {
    name: 'Tim Whitley',
    role: 'Email Operations Manager',
    team: 'Marketing Operations',
    email: 'tim.whitley@yourcompany.com',
    phone: '+1 (615) 725-4521',
    location: 'Franklin, TN',
  },

  // Information Security
  {
    name: 'Daniel O’Connell',
    role: 'Director, Identity & Access Management',
    team: 'Information Security',
    email: 'daniel.oconnell@yourcompany.com',
    phone: '+1 (615) 725-5012',
    location: 'Franklin, TN',
  },
  {
    name: 'Maya Robinson',
    role: 'CISO',
    team: 'Information Security',
    email: 'maya.robinson@yourcompany.com',
    phone: '+1 (615) 725-5050',
    location: 'Franklin, TN',
  },
];

const TEAM_ORDER = [
  'Privacy & Compliance',
  'Legal',
  'Customer Operations',
  'Dealer Network',
  'Data Engineering',
  'Vehicle Services',
  'Marketing Operations',
  'Information Security',
];

const ALL = 'All teams';

export default function AddressBookPage() {
  const [theme, setTheme] = useState<Theme>('light');
  const [query, setQuery] = useState('');
  const [activeTeam, setActiveTeam] = useState<string>(ALL);

  // Hydrate theme from localStorage so it matches the rest of /demo.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSetTheme = (t: Theme) => {
    setTheme(t);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PEOPLE.filter((p) => {
      if (activeTeam !== ALL && p.team !== activeTeam) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    });
  }, [query, activeTeam]);

  const grouped = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const t of TEAM_ORDER) map.set(t, []);
    for (const p of filtered) {
      if (!map.has(p.team)) map.set(p.team, []);
      map.get(p.team)!.push(p);
    }
    return Array.from(map.entries()).filter(([, ppl]) => ppl.length > 0);
  }, [filtered]);

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-background text-foreground transition-colors',
        theme === 'dark' && 'dark',
      )}
    >
      {/* Header — mirrors DemoLayout for visual continuity */}
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 py-2 sm:px-4 z-10">
        <Link
          href="/demo"
          className="group flex flex-shrink-0 items-center gap-1.5 rounded-md outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to demo"
          title="Back to demo"
        >
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground">N</span>
          </div>
          <span className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">
            instrata
          </span>
        </Link>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Link
            href="/demo"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to demo
          </Link>
          <ThemeToggle theme={theme} onChange={handleSetTheme} />
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
          {/* Title */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Organization
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Team address book
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Privacy, legal, dealer-network, and platform partners Izzy
                routes to when a request needs a human in the loop.
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              {PEOPLE.length} contacts · {TEAM_ORDER.length} teams
            </div>
          </div>

          {/* Search + team chips */}
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, role, team, or email…"
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                aria-label="Search the address book"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <TeamChip
                label={ALL}
                count={PEOPLE.length}
                active={activeTeam === ALL}
                onClick={() => setActiveTeam(ALL)}
              />
              {TEAM_ORDER.map((team) => {
                const count = PEOPLE.filter((p) => p.team === team).length;
                return (
                  <TeamChip
                    key={team}
                    label={team}
                    count={count}
                    active={activeTeam === team}
                    onClick={() => setActiveTeam(team)}
                  />
                );
              })}
            </div>
          </div>

          {/* Grouped people */}
          {grouped.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
              No teammates match your search.
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([team, members]) => (
                <section key={team}>
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                      {team}
                    </h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {members.length}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((p) => (
                      <PersonCard key={p.email} person={p} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TeamChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 py-px text-[10px] tabular-nums',
          active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function PersonCard({ person }: { person: Person }) {
  const initials = person.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <article className="group flex flex-col rounded-lg border border-border bg-background p-4 transition-colors hover:border-foreground/20 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-semibold text-[12px] tabular-nums',
            colorForName(person.name),
          )}
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {person.name}
          </h3>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {person.role}
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-[12px]">
        <Row icon={<Mail className="h-3.5 w-3.5" />}>
          <a
            href={`mailto:${person.email}`}
            className="truncate text-foreground/90 hover:text-primary hover:underline"
            title={person.email}
          >
            {person.email}
          </a>
        </Row>
        <Row icon={<Phone className="h-3.5 w-3.5" />}>
          <span className="text-muted-foreground tabular-nums">{person.phone}</span>
        </Row>
        <Row icon={<MapPin className="h-3.5 w-3.5" />}>
          <span className="text-muted-foreground">{person.location}</span>
        </Row>
      </dl>

      {person.demoNote && (
        <div className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-[hsl(var(--info)/0.1)] px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--info))]">
          <ShieldCheck className="h-3 w-3" />
          {person.demoNote}
        </div>
      )}
    </article>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Stable per-name avatar tint using a hash of the name. */
function colorForName(name: string): string {
  const palette = [
    'bg-[hsl(217_91%_60%/0.15)] text-[hsl(217_91%_45%)]',
    'bg-[hsl(142_71%_45%/0.15)] text-[hsl(142_71%_35%)]',
    'bg-[hsl(38_92%_50%/0.18)] text-[hsl(38_92%_38%)]',
    'bg-[hsl(280_70%_55%/0.15)] text-[hsl(280_60%_50%)]',
    'bg-[hsl(0_84%_60%/0.13)] text-[hsl(0_70%_50%)]',
    'bg-[hsl(190_85%_45%/0.15)] text-[hsl(190_80%_38%)]',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

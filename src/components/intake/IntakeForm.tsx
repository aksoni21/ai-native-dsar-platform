'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Info,
  Mail,
  Phone,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Requester = 'self' | 'minor' | 'agent';

export type RequestType =
  | 'know'
  | 'delete'
  | 'correct'
  | 'opt_out'
  | 'limit_sensitive'
  | 'portability';

type DeliveryMethod = 'email' | 'mail' | 'phone';

/** Theming hooks for the showcase demos. All props are optional and additive
 * — the default /intake page renders unchanged when none are passed. */
export interface IntakeFormTheme {
  /** Replace the plain "Naica" wordmark in the page header.
   * Pass `null` to omit the header wrapper entirely (e.g. when a hero strip
   * already provides branding above). */
  headerSlot?: React.ReactNode | null;
  /** Render a hero strip above the page content. */
  heroSlot?: React.ReactNode;
  /** Render a trust/footer strip below the form. */
  footerSlot?: React.ReactNode;
  /** Override the page-shell wrapper className. Should include min-h-screen + a background. */
  pageClassName?: string;
  /** Override REQUEST_TYPES with augmented entries (e.g. adding icon + accent color). */
  requestTypes?: RequestTypeDef[];
  /** Apply rounded-shadow card polish + hover lift on Step 1 cards. */
  polish?: boolean;
  /** Wrap step transitions with framer-motion slide. */
  stepMotion?: boolean;
}

export interface RequestTypeDef {
  id: RequestType;
  title: string;
  description: string;
  lawHint: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Tailwind classes for the icon's tinted background, e.g. "bg-blue-100 text-blue-700". */
  iconClass?: string;
}

interface FormState {
  requestTypes: RequestType[];
  requester: Requester;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  relationship: string;
  agentName: string;
  agentEmail: string;
  agentOrg: string;
  authorizationConfirmed: boolean;
  alternateContacts: string;
  accountId: string;
  details: string;
  delivery: DeliveryMethod;
  mailingAddress: string;
  attestUnderstands: boolean;
}

export const REQUEST_TYPES: RequestTypeDef[] = [
  {
    id: 'know',
    title: 'Access My Data',
    description:
      'Get a full copy of the personal information we have collected about you, how it has been used, and with whom it has been shared.',
    lawHint: 'Right to Know',
  },
  {
    id: 'delete',
    title: 'Delete My Data',
    description:
      'Ask us to erase your personal information from our records and direct our service partners to do the same.',
    lawHint: 'Right to Delete',
  },
  {
    id: 'correct',
    title: 'Correct My Data',
    description: 'Request that we update or fix inaccurate personal information we hold about you.',
    lawHint: 'Right to Correct',
  },
  {
    id: 'opt_out',
    title: 'Opt Out of Sale or Sharing',
    description:
      'Tell us to stop selling or sharing your personal information with third parties for advertising or commercial purposes.',
    lawHint: 'Right to Opt Out',
  },
  {
    id: 'limit_sensitive',
    title: 'Limit Use of Sensitive Data',
    description:
      'Restrict our use of sensitive personal information (precise location, demographics, etc.) to what the service requires.',
    lawHint: 'Right to Limit',
  },
  {
    id: 'portability',
    title: 'Portable Copy of My Data',
    description: 'Receive your personal information in a structured, portable, readily-usable format.',
    lawHint: 'Right to Portability',
  },
];

const US_STATES: { value: string; label: string }[] = [
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'OTHER', label: 'I live outside these states' },
];

const RELATIONSHIPS = [
  'Current customer',
  'Former customer',
  'Employee or former employee',
  'Job applicant',
  'Website or app visitor',
  'Other',
];

const initialState: FormState = {
  requestTypes: [],
  requester: 'self',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  state: '',
  relationship: '',
  agentName: '',
  agentEmail: '',
  agentOrg: '',
  authorizationConfirmed: false,
  alternateContacts: '',
  accountId: '',
  details: '',
  delivery: 'email',
  mailingAddress: '',
  attestUnderstands: false,
};

export function IntakeForm({ theme }: { theme?: IntakeFormTheme } = {}) {
  const requestTypes = theme?.requestTypes ?? REQUEST_TYPES;
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState<{ refId: string; deadline: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleRequestType = (id: RequestType) => {
    setForm((prev) => ({
      ...prev,
      requestTypes: prev.requestTypes.includes(id)
        ? prev.requestTypes.filter((t) => t !== id)
        : [...prev.requestTypes, id],
    }));
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (form.requestTypes.length === 0) e.requestTypes = 'Select at least one request type.';
    if (!form.firstName.trim()) e.firstName = 'Required.';
    if (!form.lastName.trim()) e.lastName = 'Required.';
    if (!form.email.trim()) e.email = 'Required.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.state) e.state = 'Select your state.';
    if (form.requester === 'agent') {
      if (!form.agentName.trim()) e.agentName = 'Required.';
      if (!form.agentEmail.trim()) e.agentEmail = 'Required.';
      if (!form.authorizationConfirmed) e.authorizationConfirmed = 'You must confirm authorization.';
    }
    if (form.delivery === 'mail' && !form.mailingAddress.trim())
      e.mailingAddress = 'Required for mailed responses.';
    if (!form.attestUnderstands) e.attestUnderstands = 'Required.';
    return e;
  }, [form]);

  const isStep2Valid = useMemo(() => {
    const stepTwoKeys = [
      'firstName',
      'lastName',
      'email',
      'state',
      'agentName',
      'agentEmail',
      'authorizationConfirmed',
      'mailingAddress',
      'attestUnderstands',
    ];
    return !stepTwoKeys.some((k) => k in errors);
  }, [errors]);

  const handleContinue = () => {
    if (form.requestTypes.length === 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setShowErrors(false);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid || form.requestTypes.length === 0) {
      setShowErrors(true);
      requestAnimationFrame(() => {
        const firstErrorEl = document.querySelector('[data-error="true"]');
        firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as {
        request_id?: string;
        deadline_at?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      if (!data.request_id || !data.deadline_at) {
        throw new Error('Server returned an incomplete response.');
      }

      const deadline = new Date(data.deadline_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      setSubmitted({ refId: data.request_id, deadline });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <Confirmation refId={submitted.refId} deadline={submitted.deadline} email={form.email} />;
  }

  return (
    <div
      className={
        theme?.pageClassName ?? 'min-h-screen bg-gradient-to-b from-slate-50 to-white'
      }
    >
      {theme?.heroSlot}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        {/* Header (full width) — omitted entirely when theme.headerSlot === null */}
        {theme?.headerSlot !== null && (
          <div className="flex items-center justify-between mb-8">
            {theme?.headerSlot ?? (
              <span className="text-xl font-semibold tracking-tight">Instrata</span>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
          {/* Left rail — summary + help (lg+ only) */}
          <aside className="hidden lg:block">
            <div className="lg:sticky lg:top-6">
              <SummaryHelpPanel form={form} requestTypes={requestTypes} />
            </div>
          </aside>

          {/* Form column */}
          <main className="max-w-2xl">
            {step === 1 ? (
              <Step1
                form={form}
                showErrors={showErrors}
                error={errors.requestTypes}
                toggleRequestType={toggleRequestType}
                onContinue={handleContinue}
                requestTypes={requestTypes}
                polish={theme?.polish}
              />
            ) : (
              <Step2
                form={form}
                errors={errors}
                showErrors={showErrors}
                update={update}
                onBack={handleBack}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitError={submitError}
              />
            )}

            <Footer />
          </main>
        </div>
      </div>
      {theme?.footerSlot}
    </div>
  );
}

function SummaryHelpPanel({ form, requestTypes = REQUEST_TYPES }: { form: FormState; requestTypes?: RequestTypeDef[] }) {
  const selected = requestTypes.filter((rt) => form.requestTypes.includes(rt.id));
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          To submit a request:
        </div>
        {selected.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pick one or more request types on the right to begin.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {selected.map((rt) => (
              <li key={rt.id} className="flex items-start gap-2 text-xs leading-snug">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" strokeWidth={3} />
                <span className="font-medium">{rt.title}</span>
              </li>
            ))}
          </ul>
        )}
        {selected.length > 0 && (
          <div className="mt-3 border-t border-border pt-2.5 text-[11px] leading-snug text-muted-foreground">
            {form.state || form.requester !== 'self'
              ? `${form.requester === 'agent' ? 'Agent on behalf of consumer' : form.requester === 'minor' ? 'Parent for minor child' : 'Submitting for yourself'}${form.state ? ` · ${form.state}` : ''}`
              : 'You can submit multiple requests at once.'}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Need help?
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground mb-3">
          Can't complete this online? Contact us — we accept requests by any reasonable method.
        </p>
        <div className="space-y-1.5">
          <a
            href="mailto:privacy@example.com"
            className="flex items-center gap-2 text-xs text-foreground hover:underline underline-offset-2"
          >
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">privacy@example.com</span>
          </a>
          <div className="flex items-center gap-2 text-xs">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">1-800-555-0100</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Mon–Fri, 9–5 PT</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-8 text-sm">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
            step === 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
          )}
        >
          {step > 1 ? <Check className="h-3 w-3" /> : 1}
        </span>
        <span className={cn(step === 1 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          Request Type
        </span>
      </div>
      <div className="h-px w-8 bg-border" />
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium',
            step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          2
        </span>
        <span className={cn(step === 2 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          Your Information
        </span>
      </div>
    </div>
  );
}

function Step1({
  form,
  showErrors,
  error,
  toggleRequestType,
  onContinue,
  requestTypes,
  polish,
}: {
  form: FormState;
  showErrors: boolean;
  error?: string;
  toggleRequestType: (id: RequestType) => void;
  onContinue: () => void;
  requestTypes: RequestTypeDef[];
  polish?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        What would you like to request? Select all that apply.
      </p>
      <div className={cn(polish ? 'space-y-3.5' : 'space-y-3')}>
        {requestTypes.map((rt) => {
          const selected = form.requestTypes.includes(rt.id);
          const Icon = rt.icon;
          return (
            <Fragment key={rt.id}>
              <button
                type="button"
                onClick={() => toggleRequestType(rt.id)}
                className={cn(
                  'w-full text-left bg-card transition-all group',
                  polish
                    ? 'rounded-xl border px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    : 'rounded-lg border px-4 py-4',
                  selected
                    ? polish
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                      : 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary hover:bg-primary/5',
                )}
                aria-pressed={selected}
              >
                <div className="flex items-start gap-4">
                  {Icon && (
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                        rt.iconClass ?? 'bg-muted text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{rt.title}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">
                        {rt.lawHint}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rt.description}</p>
                  </div>
                  {selected ? (
                    <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                  )}
                </div>
              </button>
              {rt.id === 'opt_out' && selected && <OptOutNote />}
            </Fragment>
          );
        })}
      </div>

      {showErrors && error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-destructive" data-error="true">
          <Info className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {form.requestTypes.length === 0
            ? 'Select at least one request to continue.'
            : `${form.requestTypes.length} selected`}
        </p>
        <Button type="button" onClick={onContinue} disabled={form.requestTypes.length === 0}>
          Continue
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const OPT_OUT_STATES =
  'California, Colorado, Connecticut, Delaware, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, or Virginia';

function OptOutNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          Eligibility & cookies note
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="space-y-2.5 border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Eligibility.</span>{' '}
            Opt-out rights apply only to current residents of {OPT_OUT_STATES}. If you live elsewhere, this
            request may not be actionable — but other rights (access, deletion, correction) may still apply.
          </div>
          <div>
            <span className="font-medium text-foreground">Cookies.</span>{' '}
            Some third-party website cookies may also constitute a "sale" under California's definition. To
            opt out of those, use the{' '}
            <a href="#cookies" className="underline underline-offset-2 hover:text-foreground">
              Cookie Settings
            </a>{' '}
            link in the site footer in addition to submitting this form.
          </div>
        </div>
      )}
    </div>
  );
}

function Step2({
  form,
  errors,
  showErrors,
  update,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  form: FormState;
  errors: Record<string, string>;
  showErrors: boolean;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <SelectedSummary form={form} />

      <Group title="Who is making this request?">
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { id: 'self', title: 'Myself', sub: 'About my own data' },
              { id: 'minor', title: 'My minor child', sub: 'Parent or guardian' },
              { id: 'agent', title: 'Authorized agent', sub: 'On behalf of someone' },
            ] as { id: Requester; title: string; sub: string }[]
          ).map((opt) => {
            const selected = form.requester === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => update('requester', opt.id)}
                className={cn(
                  'rounded-lg border bg-card px-3 py-2.5 text-left transition-all',
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary hover:bg-primary/5',
                )}
                aria-pressed={selected}
              >
                <div className="text-sm font-medium">{opt.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.sub}</div>
              </button>
            );
          })}
        </div>
      </Group>

      <Group
        title={
          form.requester === 'self'
            ? 'About you'
            : form.requester === 'minor'
            ? 'About your child'
            : 'About the consumer'
        }
        subtitle="We use this only to find records and confirm identity. Don't include SSNs or images of IDs."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required error={showErrors ? errors.firstName : undefined}>
            <Input
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name" required error={showErrors ? errors.lastName : undefined}>
            <Input
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              autoComplete="family-name"
            />
          </Field>
          <Field label="Email" required error={showErrors ? errors.email : undefined}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Phone" optional>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              autoComplete="tel"
              placeholder="(555) 123-4567"
            />
          </Field>
          <Field label="State of residence" required error={showErrors ? errors.state : undefined}>
            <Select
              value={form.state}
              onChange={(v) => update('state', v)}
              placeholder="Select your state…"
              options={US_STATES}
            />
          </Field>
          <Field label="Relationship with us" optional>
            <Select
              value={form.relationship}
              onChange={(v) => update('relationship', v)}
              placeholder="Choose if applicable…"
              options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
            />
          </Field>
        </div>
      </Group>

      {form.requester === 'agent' && (
        <Group
          title="About you (the authorized agent)"
          subtitle="Under CCPA we may require proof you're authorized. We may follow up to verify."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your full name" required error={showErrors ? errors.agentName : undefined}>
              <Input value={form.agentName} onChange={(e) => update('agentName', e.target.value)} />
            </Field>
            <Field label="Your email" required error={showErrors ? errors.agentEmail : undefined}>
              <Input
                type="email"
                value={form.agentEmail}
                onChange={(e) => update('agentEmail', e.target.value)}
              />
            </Field>
            <Field label="Organization" optional className="sm:col-span-2">
              <Input value={form.agentOrg} onChange={(e) => update('agentOrg', e.target.value)} />
            </Field>
          </div>
          <CheckRow
            checked={form.authorizationConfirmed}
            onChange={(c) => update('authorizationConfirmed', c)}
            error={showErrors ? errors.authorizationConfirmed : undefined}
            className="mt-3"
          >
            I confirm I have written, signed authorization from the consumer to submit this request, and I will
            provide it on request.
          </CheckRow>
        </Group>
      )}

      <Group
        title="Help us find your records"
        subtitle="Optional, but the more you share, the faster we can match you. Don't include SSNs, full payment-card numbers, or government-ID images."
      >
        <div className="space-y-4">
          <Field
            label="Other emails or phone numbers you've used"
            optional
            help="Different email, work email, maiden name, old number — list them here."
          >
            <Textarea
              rows={2}
              value={form.alternateContacts}
              onChange={(e) => update('alternateContacts', e.target.value)}
              placeholder="e.g., old.email@example.com, 415-555-0100"
            />
          </Field>
          <Field label="Account number, customer ID, or VIN" optional>
            <Input value={form.accountId} onChange={(e) => update('accountId', e.target.value)} />
          </Field>
          <Field
            label="Anything else we should know"
            optional
            help="Specific records you have in mind, dates of interactions, or the reason for the request."
          >
            <Textarea
              rows={4}
              value={form.details}
              onChange={(e) => update('details', e.target.value)}
            />
          </Field>
        </div>
      </Group>

      <Group title="How should we send you the response?">
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { id: 'email', title: 'Email', sub: 'Default. Fastest.' },
              { id: 'mail', title: 'Postal mail', sub: 'Mailing address.' },
              { id: 'phone', title: 'Phone call', sub: 'Verbal delivery.' },
            ] as { id: DeliveryMethod; title: string; sub: string }[]
          ).map((opt) => {
            const selected = form.delivery === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => update('delivery', opt.id)}
                className={cn(
                  'rounded-lg border bg-card px-3 py-2.5 text-left transition-all',
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary hover:bg-primary/5',
                )}
                aria-pressed={selected}
              >
                <div className="text-sm font-medium">{opt.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.sub}</div>
              </button>
            );
          })}
        </div>
        {form.delivery === 'mail' && (
          <div className="mt-4">
            <Field
              label="Mailing address"
              required
              error={showErrors ? errors.mailingAddress : undefined}
            >
              <Textarea
                rows={3}
                value={form.mailingAddress}
                onChange={(e) => update('mailingAddress', e.target.value)}
                placeholder="Street, City, State, ZIP"
              />
            </Field>
          </div>
        )}
      </Group>

      <Group
        title="Confirm and submit"
        subtitle="Submitting a privacy request is free, and we won't deny you service or treat you differently."
      >
        <div className="space-y-3">
          <CheckRow
            checked={form.attestUnderstands}
            onChange={(c) => update('attestUnderstands', c)}
            error={showErrors ? errors.attestUnderstands : undefined}
          >
            I understand that we may contact me to verify my identity using information already on file (we will
            never ask for an SSN or government-ID scan), and that responses are typically delivered within 45 days.
          </CheckRow>
        </div>
      </Group>

      {submitError && (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
          data-error="true"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Couldn't submit your request</div>
            <div className="mt-0.5">{submitError}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
          className="text-muted-foreground"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit request
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function SelectedSummary({ form }: { form: FormState }) {
  const selected = REQUEST_TYPES.filter((rt) => form.requestTypes.includes(rt.id));
  if (selected.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
      <div className="text-xs text-muted-foreground mb-1.5">You're requesting</div>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((rt) => (
          <span
            key={rt.id}
            className="inline-flex items-center gap-1 rounded-full bg-background border border-border px-2 py-0.5 text-xs"
          >
            <Check className="h-3 w-3 text-primary" strokeWidth={3} />
            {rt.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function Group({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  optional,
  error,
  help,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)} data-error={error ? 'true' : undefined}>
      <span className="flex items-baseline justify-between gap-2 text-xs font-medium">
        <span>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
        {optional && <span className="text-[10px] font-normal text-muted-foreground">Optional</span>}
      </span>
      {help && <span className="text-[11px] leading-snug text-muted-foreground">{help}</span>}
      {children}
      {error && <span className="text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function CheckRow({
  checked,
  onChange,
  error,
  className,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        className={cn(
          'flex cursor-pointer items-start gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-xs leading-relaxed transition-colors',
          error
            ? 'border-destructive bg-destructive/[0.03]'
            : checked
            ? 'border-primary/50 bg-primary/5'
            : 'border-border hover:border-primary/40',
        )}
        data-error={error ? 'true' : undefined}
      >
        <span className="relative mt-0.5 flex h-4 w-4 flex-shrink-0">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded border border-input bg-background checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
          <Check
            className="pointer-events-none absolute inset-0 h-4 w-4 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100"
            strokeWidth={3}
          />
        </span>
        <span>{children}</span>
      </label>
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-12 flex flex-col gap-1 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        Need help? Email{' '}
        <a href="mailto:privacy@example.com" className="hover:text-foreground underline underline-offset-2">
          privacy@example.com
        </a>
      </div>
      <div>© 2026 Instrata · Demo</div>
    </div>
  );
}

function Confirmation({ refId, deadline, email }: { refId: string; deadline: string; email: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xl font-semibold tracking-tight">Instrata</span>
        </div>

        <div className="rounded-lg border border-border bg-card px-6 py-8 sm:px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--success)/0.12)]">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Request received</h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            Thanks. We've logged your privacy request and sent a confirmation to{' '}
            <span className="font-medium text-foreground">{email}</span>.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Reference ID
              </div>
              <div className="mt-0.5 font-mono text-sm font-semibold">{refId}</div>
            </div>
            <div className="rounded-md border border-border px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Response by
              </div>
              <div className="mt-0.5 text-sm font-semibold">{deadline}</div>
            </div>
          </div>

          <div className="mt-6 text-sm">
            <div className="text-xs font-semibold mb-2">What happens next</div>
            <ol className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
              <li className="flex gap-2">
                <span className="font-mono text-[10px] text-muted-foreground/70 mt-0.5">01</span>
                We'll email a confirmation within 10 days.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-[10px] text-muted-foreground/70 mt-0.5">02</span>
                If we need to verify your identity, we'll reach out using the contact info you gave us.
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-[10px] text-muted-foreground/70 mt-0.5">03</span>
                You'll get the response by your chosen delivery method, on or before the date above.
              </li>
            </ol>
          </div>

          <div className="mt-6 rounded-md border border-primary/30 bg-primary/[0.04] px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground">
                  Watch this run through the pipeline
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  See the AI agent search every connected system, decode coded fields, and apply
                  state-specific compliance rules to your request — end to end.
                </p>
                <Link
                  href="/demo/requests"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  View {refId} in the dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

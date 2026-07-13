'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

type Mode = 'button' | 'form' | 'submitting' | 'success' | 'error';

const SOURCE = 'early_access_waitlist';

/**
 * Restored waitlist signup CTA — same interaction and /api/waitlist source
 * as the original HeroWaitlistButton, re-themed with dsar tokens instead of
 * hardcoded white-on-dark styling so it works on this page's light hero.
 */
export function WaitlistButton() {
  const [mode, setMode] = useState<Mode>('button');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'form' || mode === 'error') {
      inputRef.current?.focus();
    }
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setMode('submitting');
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: SOURCE }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setMode('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setMode('error');
    }
  };

  return (
    <motion.div layout className="relative inline-block">
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'button' && (
          <motion.button
            key="button"
            type="button"
            onClick={() => setMode('form')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-[hsl(var(--border))] pb-0.5 font-mono text-[13px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            Not ready? Join the waitlist
          </motion.button>
        )}

        {(mode === 'form' || mode === 'submitting' || mode === 'error') && (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-[10px] border border-border bg-card py-1 pl-3 pr-1"
          >
            <input
              ref={inputRef}
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={mode === 'submitting'}
              className="w-56 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={mode === 'submitting' || !email.trim()}
              aria-label="Save email to waitlist"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mode === 'submitting' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </motion.form>
        )}

        {mode === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[hsl(var(--success-tint-border))] bg-[hsl(var(--success-tint))] px-3 py-1.5 text-[13px] font-medium text-[hsl(var(--success))]"
          >
            <Check className="h-4 w-4" />
            You&apos;re on the list.
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'error' && error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 top-full mt-2 text-xs text-[hsl(var(--destructive))]"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

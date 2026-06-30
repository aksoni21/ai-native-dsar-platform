'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

type Mode = 'button' | 'form' | 'submitting' | 'success' | 'error';

const SOURCE = 'early_access_waitlist';

/**
 * Hero secondary CTA — starts as a "Join the waitlist" button, morphs in
 * place into an email input + icon submit when clicked, then to a success
 * pill once the POST to /api/waitlist lands.
 *
 * Uses Framer Motion's `layout` + AnimatePresence to keep the size morph
 * continuous with the rest of the hero's animation language.
 */
export function HeroWaitlistButton() {
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
    <motion.div layout className="relative">
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
            className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10"
          >
            Join the waitlist
          </motion.button>
        )}

        {(mode === 'form' || mode === 'submitting' || mode === 'error') && (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0, width: 'auto' }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-md border border-white/30 bg-white/5 pl-3 pr-1 py-1 backdrop-blur"
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
              className="w-56 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none disabled:opacity-50 sm:w-64"
            />
            <button
              type="submit"
              disabled={mode === 'submitting' || !email.trim()}
              aria-label="Save email to waitlist"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-[#060912] transition-all duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="inline-flex items-center gap-2 rounded-md border border-[hsl(40_90%_75%)]/40 bg-[hsl(40_90%_75%)]/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur"
          >
            <Check className="h-4 w-4 text-[hsl(40_90%_75%)]" />
            You&apos;re on the list.
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'error' && error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 top-full mt-2 text-center text-xs text-red-300"
          role="alert"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

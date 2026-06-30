'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';
import { CalendlyEmbed } from '@/components/CalendlyEmbed';
import { HeroWaitlistButton } from '@/components/HeroWaitlistButton';

// Calendly event URL — set NEXT_PUBLIC_CALENDLY_URL in .env.local
const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || '';

/**
 * Instrata landing page — leads with the operational-layer thesis from the
 * locked ERA/YC/Antler pitch. Primary CTA routes to /ai-gov (AI inventory),
 * secondary to /demo (DSAR proof run). Consumer intake link in the closing footer.
 */
export default function Home() {
  return (
    <DollyHero
      image="/hero-cave-hills.jpg"
      maxScale={2.0}
      eyebrow="Instrata · Governance in Layers"
      headlineLine1="The regulatory layer"
      headlineLine2="is now operational."
      accentColor="hsl(40 90% 75%)"
      sub="Instrata is the AI-governance and privacy compliance platform for companies deploying automated decisions in regulated industries — shipping the operational layer existing vendors only describe."
      blocks={[
        {
          eyebrow: '01 — Why now',
          title: "Compliance used to be a checkbox. It's becoming code.",
          pillStrip: ['Colorado AI Act', 'CPPA ADMT', 'NYC LL144', 'IL AI VIA', '+12 bills in 2026'],
          body:
            "By 2027, compliance teams are measured on per-decision mechanics, not policy documents:\n\n— Did the §1704 letter ship in time?\n— Was the §1705 reconsideration logged?\n— Is the model version still queryable a year later?\n\nVendors sell frameworks. We ship the mechanics.",
        },
      ]}
    />
  );
}

interface RevealBlockData {
  eyebrow: string;
  title: string;
  body?: string;
  pillStrip?: string[];
}

interface DollyHeroProps {
  image: string;
  maxScale: number;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  accentColor: string;
  sub: string;
  blocks: RevealBlockData[];
}

function DollyHero({
  image,
  maxScale,
  eyebrow,
  headlineLine1,
  headlineLine2,
  accentColor,
  sub,
  blocks,
}: DollyHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: containerRef,
    target: ref,
    offset: ['start start', 'end start'],
  });
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0, 0.55]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.0, maxScale]);

  return (
    <div
      ref={containerRef}
      className="dark h-dvh overflow-y-auto overflow-x-hidden bg-[#060912] text-white"
    >
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-6 py-5">
        <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between">
          <a
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/80 transition-colors hover:text-white"
          >
            instrata
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/platform"
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              AI-native platform
            </a>
            <a
              href="#schedule"
              className="rounded-md border border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              Book a demo
            </a>
          </div>
        </div>
      </header>

      <motion.div
        aria-hidden
        style={{ scale: bgScale }}
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
        />
      </motion.div>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(6,9,18,0.55) 0%, rgba(6,9,18,0.25) 35%, rgba(6,9,18,0.45) 75%, rgba(6,9,18,0.7) 100%)',
        }}
      />

      <Shimmer />

      <motion.div
        aria-hidden
        style={{ opacity: overlayOpacity }}
        className="pointer-events-none fixed inset-0 z-0 bg-[#060912]"
      />

      <section
        ref={ref}
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center"
      >
        <motion.div style={{ y: heroY }} className="flex w-full max-w-5xl flex-col items-center">
          <ParallaxedHero
            eyebrow={eyebrow}
            headlineLine1={headlineLine1}
            headlineLine2={headlineLine2}
            accentColor={accentColor}
            sub={sub}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-white/55"
          >
            <span>Scroll</span>
            <ArrowDown className="h-3 w-3" />
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 px-6 py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#060912]/75 via-[#060912]/95 to-[#060912]"
        />
        <div className="mx-auto max-w-4xl space-y-32">
          {blocks.map((b, i) => (
            <RevealBlock key={i} {...b} />
          ))}
        </div>
      </section>

      {/* Cinematic closing scene + schedule a demo */}
      <ClosingScene calendlyUrl={CALENDLY_URL} />
    </div>
  );
}

/**
 * Final scene — pays off the journey. Different framing from the dolly hero
 * (a fresh cave image instead of the same one) so it feels like arriving
 * somewhere new, with the schedule-a-demo widget as the operative payload.
 */
function ClosingScene({ calendlyUrl }: { calendlyUrl: string }) {
  return (
    <section id="schedule" className="relative isolate overflow-hidden">
      {/* Fresh background image — tunnel/snow, different from the hero */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: 'url(/hero-tunnel-snow.jpg)' }}
      />
      {/* Vignette + darken so the embed reads */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgba(6,9,18,0.85) 0%, rgba(6,9,18,0.65) 50%, rgba(6,9,18,0.95) 100%)',
        }}
      />

      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center"
        >
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-white/55">
            Ready when you are
          </p>
          <h2
            className="font-display tracking-tight"
            style={{
              fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
            }}
          >
            See the engine.
            <br />
            <span style={{ color: 'hsl(40 90% 75%)' }}>Pick a time.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
            Thirty minutes. We walk your team through one decision — DSAR, adverse-action, or
            reconsideration — from intake to citation.
          </p>
        </motion.div>

        {/* The widget itself */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="mt-12"
        >
          <CalendlyEmbed url={calendlyUrl} height={720} />
        </motion.div>

        {/* Tiny footer mark */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[11px] text-white/40">
          <span className="font-mono uppercase tracking-[0.2em]">instrata</span>
          <span>Governance in layers.</span>
          <a href="/intake" className="text-white/50 transition-colors hover:text-white">
            Submit a privacy request →
          </a>
        </div>
      </div>
    </section>
  );
}

function Shimmer() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[1]">
        <span className="dust dust-1" />
        <span className="dust dust-2" />
        <span className="dust dust-3" />
        <span className="dust dust-4" />
        <span className="dust dust-5" />
        <span className="dust dust-6" />
      </div>
      <style jsx>{`
        .dust {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.65);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
          opacity: 0;
        }
        .dust-1 { left: 10%; top: 30%; animation: drift 14s linear infinite; }
        .dust-2 { left: 78%; top: 18%; animation: drift 18s linear infinite 2s; }
        .dust-3 { left: 42%; top: 62%; animation: drift 16s linear infinite 4s; }
        .dust-4 { left: 22%; top: 75%; animation: drift 20s linear infinite 6s; }
        .dust-5 { left: 65%; top: 48%; animation: drift 17s linear infinite 8s; }
        .dust-6 { left: 88%; top: 70%; animation: drift 22s linear infinite 1s; }
        @keyframes drift {
          0% { transform: translate3d(0, 0, 0); opacity: 0; }
          15% { opacity: 0.9; }
          85% { opacity: 0.9; }
          100% { transform: translate3d(-30px, -80px, 0); opacity: 0; }
        }
      `}</style>
    </>
  );
}

function ParallaxedHero({
  eyebrow,
  headlineLine1,
  headlineLine2,
  accentColor,
  sub,
}: {
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  accentColor: string;
  sub: string;
}) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMouse({ x, y });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const driftX = mouse.x * 8;
  const driftY = mouse.y * 8;

  return (
    <motion.div
      animate={{ x: driftX, y: driftY }}
      transition={{ type: 'spring', stiffness: 60, damping: 18 }}
      className="flex flex-col items-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 backdrop-blur"
      >
        <Sparkles className="h-3 w-3 text-[hsl(220_100%_75%)]" />
        {eyebrow}
      </motion.div>

      <h1
        className="font-display drop-shadow-[0_2px_30px_rgba(0,0,0,0.5)]"
        style={{
          fontSize: 'clamp(2.25rem, 9vw, 7.5rem)',
          fontWeight: 700,
          letterSpacing: '-0.035em',
          lineHeight: 0.96,
        }}
      >
        <RevealWords text={headlineLine1} delay={0.3} />
        <br />
        <span style={{ color: accentColor }}>
          <RevealWords text={headlineLine2} delay={0.65} />
        </span>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.3 }}
        className="mt-8 max-w-2xl text-base leading-relaxed text-white/80 drop-shadow md:text-lg"
      >
        {sub}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.5 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <a
          href="/ai-gov"
          className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[#060912] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_30px_-10px_rgba(255,255,255,0.35)]"
        >
          See the engine
        </a>
        <a
          href="/platform"
          className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
        >
          Show platform layer
        </a>
        <HeroWaitlistButton />
      </motion.div>
    </motion.div>
  );
}

function RevealBlock({ eyebrow, title, body, pillStrip }: RevealBlockData) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-white/45">{eyebrow}</p>
      <h2 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{title}</h2>

      {pillStrip && (
        <div className="mt-6 flex flex-wrap gap-2">
          {pillStrip.map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {body && (
        <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-relaxed text-white/65 md:text-lg">
          {body}
        </p>
      )}
    </motion.div>
  );
}

/**
 * Hero text animation — letters fade and rise gently into place. Splits on whole
 * words first so spaces render at full width. Uses opacity + small y-offset
 * (no overflow-hidden clipping) so descenders like 'g' and 'y' aren't sliced.
 */
function RevealWords({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(' ');
  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.03, delayChildren: delay } } }}
      aria-label={text}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {word.split('').map((char, i) => (
            <motion.span
              key={i}
              variants={{ hidden: { y: '0.35em', opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block"
              aria-hidden
            >
              {char}
            </motion.span>
          ))}
          {wi < words.length - 1 && <span aria-hidden>{' '}</span>}
        </span>
      ))}
    </motion.span>
  );
}

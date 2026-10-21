import { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const STEPS = [
  {
    id: 'input',
    title: 'Sequence Input',
    body: 'Paste FASTA or raw DNA here. Or click Examples to load a curated preset.',
  },
  {
    id: 'analysis-tabs',
    title: 'Analysis Tabs',
    body: 'Annotations, primers, variants, and codon usage. Each tab looks at the same sequence differently.',
  },
  {
    id: 'view-toggle',
    title: 'Viewer Modes',
    body: 'Switch between DNA (bases), Protein (translated), and Align (compare two sequences).',
  },
  {
    id: 'viewer-controls',
    title: 'Viewer Controls',
    body: 'Zoom, search motifs, detect ORFs, reverse complement, and export the canvas as an image.',
  },
  {
    id: 'nav-desktop',
    title: 'Sessions',
    body: 'Everything auto-saves. Use the Save icon to fork a new session, or My Tests to switch between them.',
  },
];

export default function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const current = STEPS[step];

  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector(`[data-tour="${current.id}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [current.id]);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onClose();
  };
  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const spotRect = rect
    ? {
        top: Math.max(0, rect.top - 6),
        left: Math.max(0, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      }
    : null;

  const tooltipTop = spotRect ? spotRect.top + spotRect.height + 12 : 100;
  const tooltipBottom = spotRect
    ? Math.min(tooltipTop, window.innerHeight - 220)
    : 100;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <motion.div
        key={current.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 pointer-events-auto"
        style={
          spotRect
            ? {
                clipPath: `polygon(
                  0% 0%,
                  0% 100%,
                  ${spotRect.left}px 100%,
                  ${spotRect.left}px ${spotRect.top}px,
                  ${spotRect.left + spotRect.width}px ${spotRect.top}px,
                  ${spotRect.left + spotRect.width}px ${spotRect.top + spotRect.height}px,
                  ${spotRect.left}px ${spotRect.top + spotRect.height}px,
                  ${spotRect.left}px 100%,
                  100% 100%,
                  100% 0%
                )`,
              }
            : {}
        }
        onClick={onClose}
      />

      {spotRect && (
        <motion.div
          key={`ring-${current.id}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="absolute rounded-2xl border-2 border-strand-a pointer-events-none shadow-[0_0_0_4px_rgba(0,229,160,0.15)]"
          style={{
            top: spotRect.top,
            left: spotRect.left,
            width: spotRect.width,
            height: spotRect.height,
          }}
        />
      )}

      <motion.div
        key={`tooltip-${current.id}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="absolute z-[101] pointer-events-auto"
        style={{
          top: tooltipBottom,
          left: 16,
          right: 16,
          maxWidth: 420,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <div className="bg-strand-panel rounded-2xl border border-strand-a/30 shadow-2xl shadow-black/40 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-strand-a shrink-0" />
              <span className="text-[10px] font-mono text-strand-muted uppercase tracking-wider">
                Step {step + 1} of {STEPS.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-strand-muted hover:text-strand-text transition-colors"
              title="Skip tour"
            >
              <X size={14} />
            </button>
          </div>

          <h3 className="text-base font-semibold text-strand-text mb-1">
            {current.title}
          </h3>
          <p className="text-xs text-strand-muted leading-relaxed mb-4">
            {current.body}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-[11px] font-mono text-strand-muted hover:text-strand-text transition-colors"
            >
              Skip
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                disabled={step === 0}
                className="p-1.5 rounded-lg bg-strand-bg text-strand-muted hover:text-strand-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={next}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-strand-a text-strand-bg text-xs font-medium hover:brightness-110 transition-all"
              >
                {step === STEPS.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step
                    ? 'w-5 bg-strand-a'
                    : i < step
                    ? 'w-1.5 bg-strand-a/40'
                    : 'w-1.5 bg-strand-muted/30'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
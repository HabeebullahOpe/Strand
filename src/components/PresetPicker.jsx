import { useState, useRef, useEffect } from 'react';
import { Layers, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRESETS } from '../data/presets';

const CATEGORY_COLORS = {
  Coding:      'text-strand-a bg-strand-a/10',
  Repetitive:  'text-strand-c bg-strand-c/10',
  Regulatory:  'text-strand-g bg-strand-g/10',
  Synthetic:   'text-strand-muted bg-strand-muted/10',
};

export default function PresetPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close on outside click (desktop popover behavior)
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleSelect = (preset) => {
    onSelect(preset);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded transition-colors ${
          open
            ? 'bg-strand-a/20 text-strand-a'
            : 'bg-strand-bg text-strand-muted hover:text-strand-text'
        }`}
        title="Load an example sequence"
      >
        <Layers size={11} />
        Examples
      </button>

      {/* Popover (desktop) / Sheet (mobile) */}
      <AnimatePresence>
        {open && (
          <>
            {/* Mobile backdrop — hidden on md+ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Desktop: absolute popover · Mobile: fixed bottom sheet */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="
                fixed md:absolute
                bottom-0 left-0 right-0 md:left-auto md:right-0 md:mr-2 md:bottom-auto md:top-full
                md:mt-2 md:w-80
                bg-strand-panel border border-strand-muted/15
                rounded-t-3xl md:rounded-2xl
                shadow-2xl shadow-black/40
                z-50
                overflow-hidden
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-strand-muted/10">
                <div>
                  <h3 className="text-sm font-medium text-strand-text">Example Sequences</h3>
                  <p className="text-[10px] text-strand-muted font-mono mt-0.5">
                    Tap to load
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg bg-strand-bg text-strand-muted hover:text-strand-text transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* List */}
              <div className="max-h-[30vh] md:max-h-21 overflow-y-auto p-1 space-y-1">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-strand-bg transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-strand-text group-hover:text-strand-a transition-colors">
                        {preset.name}
                      </span>
                      <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${CATEGORY_COLORS[preset.category] || CATEGORY_COLORS.Synthetic}`}>
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-strand-muted leading-snug">
                      {preset.description}
                    </p>
                    <p className="text-[10px] font-mono text-strand-muted/70 mt-1">
                      {preset.sequence.length} bp
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
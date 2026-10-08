import { useMemo, useState } from 'react';
import { Copy, Check, FlaskConical } from 'lucide-react';
import { designPrimers } from '../utils/sequence';

const PRIMER_COLORS = {
  forward: '#00E5A0',
  reverse: '#4FA8FF',
};

function PrimerRow({ label, primer, color }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(primer.sequence);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be blocked */
    }
  };

  return (
    <div className="bg-strand-bg rounded-xl p-3 border border-strand-muted/10 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[10px] font-mono uppercase tracking-wider text-strand-muted">
            {label}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 rounded text-strand-muted hover:text-strand-text transition-colors"
          title="Copy primer sequence"
        >
          {copied ? <Check size={12} className="text-strand-a" /> : <Copy size={12} />}
        </button>
      </div>

      <div
        className="font-mono text-xs break-all leading-relaxed"
        style={{ color }}
      >
        {primer.sequence}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-strand-muted">
        <span>Pos {primer.position + 1}</span>
        <span>Tm {primer.tm.toFixed(0)}°C</span>
        <span>GC {primer.gc.toFixed(0)}%</span>
        <span>{primer.length} bp</span>
      </div>
    </div>
  );
}

export default function PrimerPanel({ sequence, annotations, selectedAnnotationId }) {
  const region = useMemo(() => {
    if (!sequence || sequence.length === 0) return null;

    if (selectedAnnotationId) {
      const ann = annotations.find((a) => a.id === selectedAnnotationId);
      if (ann) return { start: ann.start, end: ann.end, label: ann.label };
    }
    if (annotations.length > 0) {
      const ann = annotations[0];
      return { start: ann.start, end: ann.end, label: ann.label };
    }
    return { start: 0, end: sequence.length, label: 'Full sequence' };
  }, [sequence, annotations, selectedAnnotationId]);

  const primers = useMemo(() => {
    if (!region || !sequence) return null;
    return designPrimers(sequence, region.start, region.end);
  }, [sequence, region]);

  if (!sequence || sequence.length === 0) {
    return (
      <div className="h-full bg-strand-panel rounded-2xl p-3 border border-strand-muted/10 flex flex-col">
        <div className="shrink-0 flex items-center gap-2 mb-2">
          <FlaskConical size={14} className="text-strand-muted" />
          <h2 className="text-sm font-medium text-strand-text">Primer Design</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] font-mono text-strand-muted text-center">
            Load a sequence to design primers
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-strand-panel rounded-2xl p-3 border border-strand-muted/10 flex flex-col">
      <div className="shrink-0 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className="text-strand-a" />
          <h2 className="text-sm font-medium text-strand-text">Primer Design</h2>
        </div>
        <span className="text-[10px] font-mono text-strand-muted bg-strand-bg px-1.5 py-1 rounded">
          {region ? `${region.end - region.start} bp target` : '—'}
        </span>
      </div>

      {region && (
        <div className="shrink-0 mb-2 text-[10px] font-mono text-strand-muted">
          Target: <span className="text-strand-text">{region.label}</span>
          <span className="ml-1">
            ({region.start + 1}–{region.end})
          </span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {!primers ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] font-mono text-strand-muted text-center px-3">
              No suitable primers found in this region.
              <br />
              Try a longer target or a different annotation.
            </p>
          </div>
        ) : (
          <>
            <PrimerRow
              label="Forward"
              primer={primers.forward}
              color={PRIMER_COLORS.forward}
            />
            <PrimerRow
              label="Reverse"
              primer={primers.reverse}
              color={PRIMER_COLORS.reverse}
            />
            <div className="text-[9px] font-mono text-strand-muted px-1 pt-1 leading-snug">
              Tm calculated with the Wallace rule (2·AT + 4·GC).
              Amplicon: {primers.reverse.position + primers.reverse.length - primers.forward.position} bp.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
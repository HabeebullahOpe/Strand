import { useMemo, useState } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { diffSequences } from '../utils/sequence';

const TYPE_META = {
  sub: { label: 'SNP', color: 'text-strand-t', bg: 'bg-strand-t/10' },
  ins: { label: 'INS', color: 'text-strand-g', bg: 'bg-strand-g/10' },
  del: { label: 'DEL', color: 'text-strand-c', bg: 'bg-strand-c/10' },
};

export default function VariantReport({
  sequenceA,
  sequenceB,
  onJumpToDiff,
  externalActiveDiff,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'sub' | 'ins' | 'del'

  const { variants, typeCounts } = useMemo(() => {
    if (!sequenceA || !sequenceB) return { variants: [], typeCounts: {} };

    const ops = diffSequences(sequenceA, sequenceB);
    const list = [];
    const counts = { sub: 0, ins: 0, del: 0 };

    ops.forEach((op, opIndex) => {
      if (op.type === 'match') return;
      counts[op.type] = (counts[op.type] || 0) + 1;
      list.push({
        opIndex,
        type: op.type,
        pos: op.aIndex !== null ? op.aIndex + 1 : (list[list.length - 1]?.pos ?? 0),
        ref: op.aChar,
        alt: op.bChar,
      });
    });

    return { variants: list, typeCounts: counts };
  }, [sequenceA, sequenceB]);

  const filtered = useMemo(() => {
    if (filter === 'all') return variants;
    return variants.filter((v) => v.type === filter);
  }, [variants, filter]);

  if (!sequenceA || !sequenceB) {
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0 flex items-center gap-2 mb-2">
          <Activity size={14} className="text-strand-muted" />
          <h2 className="text-sm font-medium text-strand-text">Variants</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] font-mono text-strand-muted text-center px-3 leading-relaxed">
            Load a second sequence to compare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-strand-t" />
          <h2 className="text-sm font-medium text-strand-text">Variants</h2>
        </div>
        <span className="text-[10px] font-mono text-strand-muted bg-strand-bg px-1.5 py-1 rounded">
          {variants.length}
        </span>
      </div>

      {/* Filter pills */}
      <div className="shrink-0 flex gap-1 mb-2">
        <FilterPill
          label={`All ${variants.length}`}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterPill
          label={`SNP ${typeCounts.sub || 0}`}
          active={filter === 'sub'}
          onClick={() => setFilter('sub')}
          color="text-strand-t"
        />
        <FilterPill
          label={`INS ${typeCounts.ins || 0}`}
          active={filter === 'ins'}
          onClick={() => setFilter('ins')}
          color="text-strand-g"
        />
        <FilterPill
          label={`DEL ${typeCounts.del || 0}`}
          active={filter === 'del'}
          onClick={() => setFilter('del')}
          color="text-strand-c"
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-strand-muted/10 bg-strand-bg">
        {/* Header row */}
        <div className="sticky top-0 z-10 grid grid-cols-[70px_50px_1fr_1fr_20px] gap-2 px-2.5 py-1.5 bg-strand-panel border-b border-strand-muted/10 text-[10px] font-mono uppercase tracking-wider text-strand-muted">
          <span>Pos</span>
          <span>Type</span>
          <span>Ref</span>
          <span>Alt</span>
          <span />
        </div>

        {/* Data rows */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p className="text-[10px] font-mono text-strand-muted">
              No variants of this type
            </p>
          </div>
        ) : (
          filtered.map((v) => {
            const meta = TYPE_META[v.type];
            const isActive = v.opIndex === externalActiveDiff;
            return (
              <button
                key={v.opIndex}
                onClick={() => onJumpToDiff?.(v.opIndex)}
                className={`w-full grid grid-cols-[70px_50px_1fr_1fr_20px] gap-2 px-2.5 py-1.5 text-left text-[11px] font-mono transition-colors ${
                  isActive
                    ? 'bg-strand-a/15 border-l-2 border-strand-a'
                    : 'hover:bg-strand-panel/60 border-l-2 border-transparent'
                }`}
              >
                <span className="text-strand-muted">{v.pos}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${meta.color} ${meta.bg} inline-block`}>
                  {meta.label}
                </span>
                <span className="text-strand-text">{v.ref || '—'}</span>
                <span className="text-strand-text">{v.alt || '—'}</span>
                <ChevronRight size={12} className="text-strand-muted self-center" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={`text-[9px] font-mono px-1.5 py-1 rounded transition-colors ${
        active
          ? `bg-strand-a/20 text-strand-a`
          : `bg-strand-bg text-strand-muted hover:text-strand-text`
      } ${!active && color ? '' : ''}`}
    >
      {label}
    </button>
  );
}
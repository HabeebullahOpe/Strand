import { calculateGCContent, getBaseComposition } from '../utils/sequence';

export default function StatsPanel({ sequence }) {
  const gcContent = calculateGCContent(sequence);
  const composition = getBaseComposition(sequence);

  const bases = [
    { key: 'A', color: 'bg-strand-a' },
    { key: 'T', color: 'bg-strand-t' },
    { key: 'C', color: 'bg-strand-c' },
    { key: 'G', color: 'bg-strand-g' },
  ];

  return (
    <div className="bg-strand-panel rounded-2xl px-4 py-3 border border-strand-muted/10 flex items-center gap-6">
      {/* Left group: Length + GC */}
      <div className="flex items-center gap-6 shrink-0">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-strand-muted leading-none mb-1">
            Length
          </p>
          <p className="text-xl font-mono font-bold text-strand-text leading-none">
            {sequence.length}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-strand-muted leading-none mb-1">
            GC Content
          </p>
          <p className="text-xl font-mono font-bold text-strand-a leading-none">
            {gcContent.toFixed(1)}<span className="text-sm">%</span>
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-strand-muted/15 shrink-0" />

      {/* Composition bar + legend */}
      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full bg-strand-bg rounded-full overflow-hidden flex mb-2">
          {sequence.length > 0 ? (
            bases.map((base) => {
              const pct = (composition[base.key] / sequence.length) * 100;
              return (
                <div
                  key={base.key}
                  className={`${base.color} h-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-strand-muted/20" />
          )}
        </div>
        <div className="flex justify-between text-[10px] font-mono">
          {bases.map((base) => (
            <div key={base.key} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${base.color}`} />
              <span className="text-strand-text">{base.key}</span>
              <span className="text-strand-muted">({composition[base.key]})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
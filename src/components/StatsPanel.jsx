import { calculateGCContent, getBaseComposition } from '../utils/sequence';

export default function StatsPanel({ sequence }) {
  const gcContent = calculateGCContent(sequence);
  const composition = getBaseComposition(sequence);

  const bases = [
    { key: 'A', color: 'bg-strand-a', label: 'Adenine' },
    { key: 'T', color: 'bg-strand-t', label: 'Thymine' },
    { key: 'C', color: 'bg-strand-c', label: 'Cytosine' },
    { key: 'G', color: 'bg-strand-g', label: 'Guanine' },
  ];

  return (
    <div className="bg-strand-panel rounded-3xl p-6 space-y-6 shadow-lg border border-strand-muted/10">
      
      {/* Top Row: Length and GC Content */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-strand-muted text-sm font-medium mb-1">Sequence Length</p>
          <p className="text-3xl font-mono font-bold text-strand-text">{sequence.length}</p>
        </div>
        <div className="text-right">
          <p className="text-strand-muted text-sm font-medium mb-1">GC Content</p>
          <p className="text-3xl font-mono font-bold text-strand-a">
            {gcContent.toFixed(1)}<span className="text-lg">%</span>
          </p>
        </div>
      </div>

      {/* Composition Bar */}
      <div>
        <p className="text-strand-muted text-sm font-medium mb-2">Base Composition</p>
        <div className="h-4 w-full bg-strand-bg rounded-full overflow-hidden flex">
          {sequence.length > 0 ? (
            bases.map((base) => {
              const percentage = (composition[base.key] / sequence.length) * 100;
              return (
                <div 
                  key={base.key}
                  className={`${base.color} h-full transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                  title={`${base.label}: ${composition[base.key]} (${percentage.toFixed(1)}%)`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-strand-muted/20" />
          )}
        </div>
        
        {/* Legend */}
        <div className="flex justify-between mt-3 text-xs font-mono">
          {bases.map((base) => (
            <div key={base.key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${base.color}`} />
              <span className="text-strand-text">{base.key}</span>
              <span className="text-strand-muted">({composition[base.key]})</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
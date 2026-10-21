import { useMemo } from 'react';
import { Grid3x3, Info } from 'lucide-react';

// The 64 codons, grouped by first base (row) and second base (column).
// Third base varies within each cell (each cell contains 4 codons).
const CODON_GRID = {
  T: {
    T: ['TTT', 'TTC', 'TTA', 'TTG'],
    C: ['TCT', 'TCC', 'TCA', 'TCG'],
    A: ['TAT', 'TAC', 'TAA', 'TAG'],
    G: ['TGT', 'TGC', 'TGA', 'TGG'],
  },
  C: {
    T: ['CTT', 'CTC', 'CTA', 'CTG'],
    C: ['CCT', 'CCC', 'CCA', 'CCG'],
    A: ['CAT', 'CAC', 'CAA', 'CAG'],
    G: ['CGT', 'CGC', 'CGA', 'CGG'],
  },
  A: {
    T: ['ATT', 'ATC', 'ATA', 'ATG'],
    C: ['ACT', 'ACC', 'ACA', 'ACG'],
    A: ['AAT', 'AAC', 'AAA', 'AAG'],
    G: ['AGT', 'AGC', 'AGA', 'AGG'],
  },
  G: {
    T: ['GTT', 'GTC', 'GTA', 'GTG'],
    C: ['GCT', 'GCC', 'GCA', 'GCG'],
    A: ['GAT', 'GAC', 'GAA', 'GAG'],
    G: ['GGT', 'GGC', 'GGA', 'GGG'],
  },
};

// Amino acid per codon — same table used in ProteinView
const CODON_TO_AA = {
  TTT: 'F', TTC: 'F', TTA: 'L', TTG: 'L',
  CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L',
  ATT: 'I', ATC: 'I', ATA: 'I', ATG: 'M',
  GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V',
  TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S',
  CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  TAT: 'Y', TAC: 'Y', TAA: '*', TAG: '*',
  CAT: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  AAT: 'N', AAC: 'N', AAA: 'K', AAG: 'K',
  GAT: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  TGT: 'C', TGC: 'C', TGA: '*', TGG: 'W',
  CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  AGT: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
  GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

const ROW_ORDER = ['T', 'C', 'A', 'G'];
const COL_ORDER = ['T', 'C', 'A', 'G'];

export default function CodonUsage({ sequence }) {
  const stats = useMemo(() => {
    if (!sequence || sequence.length < 3) {
      return { counts: {}, total: 0, gc3: 0, max: 0, top: null, rare: null };
    }

    const counts = {};
    let total = 0;
    let gc3Count = 0;
    let gc3Total = 0;

    // Step in triplets, skipping any codon containing an ambiguous base
    for (let i = 0; i <= sequence.length - 3; i += 3) {
      const codon = sequence.slice(i, i + 3);
      if (/[^ATCG]/.test(codon)) continue;

      counts[codon] = (counts[codon] || 0) + 1;
      total++;

      // GC at 3rd position — real metric used in codon optimization
      const third = codon[2];
      if (third === 'G' || third === 'C') gc3Count++;
      gc3Total++;
    }

    let max = 0;
    let top = null;
    let rare = null;
    let rareCount = Infinity;

    Object.entries(counts).forEach(([codon, c]) => {
      if (c > max) {
        max = c;
        top = codon;
      }
      if (c < rareCount) {
        rareCount = c;
        rare = codon;
      }
    });

    return {
      counts,
      total,
      max,
      top,
      rare,
      gc3: gc3Total > 0 ? (gc3Count / gc3Total) * 100 : 0,
    };
  }, [sequence]);

  if (!sequence || sequence.length < 3) {
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0 flex items-center gap-2 mb-2">
          <Grid3x3 size={14} className="text-strand-muted" />
          <h2 className="text-sm font-medium text-strand-text">Codon Usage</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] font-mono text-strand-muted text-center px-3">
            Load a sequence to analyze codon usage
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
          <Grid3x3 size={14} className="text-strand-c" />
          <h2 className="text-sm font-medium text-strand-text">Codon Usage</h2>
        </div>
        <span className="text-[10px] font-mono text-strand-muted bg-strand-bg px-1.5 py-1 rounded">
          {stats.total} codons
        </span>
      </div>

      {/* Column header — 2nd base */}
      <div className="shrink-0 mb-1 grid grid-cols-[24px_repeat(4,1fr)] gap-1 items-center">
        <span className="text-[9px] font-mono text-strand-muted text-center">1st</span>
        {COL_ORDER.map((c) => (
          <div
            key={c}
            className="text-[10px] font-mono text-strand-muted text-center bg-strand-bg rounded py-0.5 border border-strand-muted/10"
          >
            {c}
          </div>
        ))}
      </div>
      <div className="shrink-0 mb-2 grid grid-cols-[24px_repeat(4,1fr)] gap-1">
        <span />
        <div className="col-span-4 text-[9px] font-mono text-strand-muted text-center uppercase tracking-wider">
          Second Base
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-[24px_repeat(4,1fr)] gap-1 pr-1">
          {ROW_ORDER.map((r) => (
            <div key={r} className="contents">
              <div className="text-[10px] font-mono text-strand-muted text-center bg-strand-bg rounded py-0.5 border border-strand-muted/10">
                {r}
              </div>
              {COL_ORDER.map((c) => (
                <CodonCell
                  key={`${r}${c}`}
                  codons={CODON_GRID[r][c]}
                  counts={stats.counts}
                  max={stats.max}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer stats */}
      <div className="shrink-0 mt-3 pt-2 border-t border-strand-muted/10 flex items-center justify-between text-[10px] font-mono text-strand-muted">
        <span>
          Top: {stats.top ? (
            <>
              <span className="text-strand-a">{stats.top}</span>{' '}
              ({stats.counts[stats.top]})
            </>
          ) : '—'}
        </span>
        <span>
          Rare: {stats.rare ? (
            <>
              <span className="text-strand-t">{stats.rare}</span>{' '}
              ({stats.counts[stats.rare]})
            </>
          ) : '—'}
        </span>
        <span title="GC content at 3rd codon position">
          GC3: <span className="text-strand-text">{stats.gc3.toFixed(0)}%</span>
        </span>
      </div>
    </div>
  );
}

function CodonCell({ codons, counts, max }) {
  return (
    <div className="bg-strand-bg rounded-lg border border-strand-muted/10 p-1.5">
      <div className="flex flex-col gap-0.5">
        {codons.map((codon) => {
          const count = counts[codon] || 0;
          const aa = CODON_TO_AA[codon] || '?';

          // Intensity relative to the most-used codon
          const intensity = max > 0 ? count / max : 0;
          const tint = count === 0 ? 'transparent' : `rgba(79, 168, 255, ${0.08 + intensity * 0.35})`;

          return (
            <div
              key={codon}
              className="flex items-center justify-between gap-1 px-1 py-0.5 rounded transition-colors"
              style={{ backgroundColor: tint }}
              title={`${codon} → ${aa} (${count})`}
            >
              <span className="text-[9px] font-mono text-strand-text leading-none">
                {codon}
              </span>
              <span className="text-[9px] font-mono text-strand-muted leading-none">
                {aa}
              </span>
              <span
                className={`text-[9px] font-mono leading-none ${
                  count === 0 ? 'text-strand-muted/40' : 'text-strand-text font-bold'
                }`}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
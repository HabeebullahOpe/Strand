// src/components/ConsensusRow.jsx
import { GitMerge } from 'lucide-react';

/**
 * Given an array of diff operations, produces the consensus sequence
 * and an agreement percentage.
 *
 * - match  → consensus = the base
 * - sub    → consensus = 'N' (they disagree)
 * - del    → consensus = aChar (only A has a base)
 * - ins    → consensus = bChar (only B has a base)
 *
 * @returns {{ consensus: string[], agreement: number }}
 */
export const computeConsensus = (ops) => {
  if (!ops || ops.length === 0) return { consensus: [], agreement: 0 };

  const consensus = [];
  let agreements = 0;
  let comparisons = 0;

  for (const op of ops) {
    // Skip positions where neither sequence has a base
    if (!op.aChar && !op.bChar) {
      consensus.push(' ');
      continue;
    }

    let base = 'N';

    if (op.type === 'match') {
      base = op.aChar;
      agreements++;
    } else if (op.type === 'sub') {
      base = 'N';
    } else if (op.type === 'del') {
      base = op.aChar;
      agreements++;
    } else if (op.type === 'ins') {
      base = op.bChar;
      agreements++;
    }

    consensus.push(base);
    comparisons++;
  }

  const agreement = comparisons > 0 ? (agreements / comparisons) * 100 : 0;
  return { consensus, agreement };
};

/**
 * Small header badge showing the consensus agreement percentage.
 */
export function ConsensusIndicator({ agreement, totalPositions }) {
  if (totalPositions === 0) return null;

  const tint =
    agreement >= 90 ? 'text-strand-a' :
    agreement >= 60 ? 'text-strand-g' :
    'text-strand-t';

  return (
    <span className={`flex items-center gap-1 text-[10px] font-mono shrink-0 ${tint}`}>
      <GitMerge size={11} />
      {agreement.toFixed(0)}% match
    </span>
  );
}
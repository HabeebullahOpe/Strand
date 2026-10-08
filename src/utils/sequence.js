// src/utils/sequence.js

/**
 * Parses a raw text input (FASTA format or plain text) into a clean DNA sequence.
 * Keeps valid IUPAC ambiguity codes (N, R, Y, etc.) so they can be visualized
 * as non-coding/unknown regions.
 */
export const parseSequence = (input) => {
  if (!input) return '';

  // Remove FASTA headers
  const lines = input.split('\n');
  const sequenceLines = lines.filter((line) => !line.startsWith('>'));

  // Join, strip whitespace, uppercase
  const rawSequence = sequenceLines.join('').replace(/\s/g, '').toUpperCase();

  // Keep only letters (A-Z) and hyphens (alignment gaps)
  const cleanedSequence = rawSequence.replace(/[^A-Z-]/g, '');

  return cleanedSequence;
};

/**
 * Calculates the GC content percentage of a sequence.
 */
export const calculateGCContent = (sequence) => {
  if (!sequence || sequence.length === 0) return 0;

  let gcCount = 0;
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] === 'G' || sequence[i] === 'C') {
      gcCount++;
    }
  }

  return (gcCount / sequence.length) * 100;
};

/**
 * Gets the count of each base in the sequence.
 * A/T/C/G are counted individually; everything else (N, R, Y, etc.) goes to `other`.
 */
export const getBaseComposition = (sequence) => {
  const composition = { A: 0, T: 0, C: 0, G: 0, other: 0 };
  if (!sequence) return composition;

  for (let i = 0; i < sequence.length; i++) {
    const base = sequence[i];
    if (composition[base] !== undefined && base !== 'other') {
      composition[base]++;
    } else {
      composition.other++;
    }
  }

  return composition;
};

// --- ORF detection ---

const STOP_CODONS = new Set(['TAA', 'TAG', 'TGA']);
const START_CODON = 'ATG';

/**
 * Finds all Open Reading Frames in a sequence.
 * Scans frame 1 only. Returns ORFs longer than `minLength` bases.
 */
export const findORFs = (sequence, minLength = 30) => {
  if (!sequence || sequence.length < 6) return [];

  const orfs = [];
  const seq = sequence;

  for (let i = 0; i <= seq.length - 3; i++) {
    if (seq.slice(i, i + 3) !== START_CODON) continue;

    for (let j = i + 3; j <= seq.length - 3; j += 3) {
      const codon = seq.slice(j, j + 3);

      // Break if codon contains an ambiguous base
      if (/[^ATCG]/.test(codon)) break;

      if (STOP_CODONS.has(codon)) {
        const length = j + 3 - i;
        if (length >= minLength) {
          orfs.push({
            start: i,
            end: j + 3,
            length,
          });
        }
        break;
      }
    }
  }

  return orfs;
};

// =====================================================
// PROTEIN TRANSLATION
// =====================================================

// Standard genetic code — DNA codons → single-letter amino acids
const CODON_TABLE = {
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

/**
 * Translates a DNA sequence into amino acids.
 * Uses frame 1 only (starts at position 0).
 * Stops translating at the first ambiguous base (N, R, etc.).
 *
 * @param {string} sequence - The DNA sequence.
 * @returns {Array<{aa: string, codon: string, position: number}>}
 */
export const translateSequence = (sequence) => {
  if (!sequence) return [];
  const proteins = [];

  for (let i = 0; i <= sequence.length - 3; i += 3) {
    const codon = sequence.slice(i, i + 3);

    // Stop at any ambiguous base — we can't trust the reading frame after
    if (/[^ATCG]/.test(codon)) {
      proteins.push({ aa: '?', codon, position: i });
      continue;
    }

    const aa = CODON_TABLE[codon] || '?';
    proteins.push({ aa, codon, position: i });
  }

  return proteins;
};

// Amino acid → chemical group, for coloring
export const AMINO_GROUPS = {
  // Hydrophobic / nonpolar (green)
  A: 'hydrophobic', V: 'hydrophobic', I: 'hydrophobic', L: 'hydrophobic',
  M: 'start', F: 'hydrophobic', W: 'hydrophobic', Y: 'hydrophobic',
  P: 'hydrophobic', G: 'hydrophobic',
  // Polar uncharged (blue)
  S: 'polar', T: 'polar', C: 'polar', N: 'polar', Q: 'polar',
  // Acidic (coral)
  D: 'acidic', E: 'acidic',
  // Basic (amber)
  K: 'basic', R: 'basic', H: 'basic',
  // Stop
  '*': 'stop',
  // Unknown
  '?': 'unknown',
};

// =====================================================
// SEQUENCE DIFFING (for Alignment view)
// =====================================================

/**
 * Diffs two sequences using a simple character-level algorithm.
 * Produces an array of operations describing how to transform `a` into `b`.
 *
 * Each operation is: { type, aIndex, bIndex, aChar, bChar }
 *   - type 'match'  → same char at same position
 *   - type 'sub'    → substitution (aChar ≠ bChar at same logical position)
 *   - type 'del'    → base in `a` that is not in `b` (deletion from b's perspective)
 *   - type 'ins'    → base in `b` that is not in `a` (insertion from b's perspective)
 *
 * `aIndex` and `bIndex` may be null for insertions/deletions.
 *
 * Uses a simplified LCS-based approach:
 *   - Walk both sequences.
 *   - On match, emit 'match' and advance both.
 *   - On mismatch, look ahead up to LOOKAHEAD chars in each to find the next
 *     real alignment. The shorter skip wins. This is O(n·k) where k is the
 *     lookahead window (small constant), which is effectively O(n) for real data.
 *
 * @param {string} a
 * @param {string} b
 * @param {number} lookahead
 * @returns {Array<{type:string, aIndex:number|null, bIndex:number|null, aChar:string|null, bChar:string|null}>}
 */
export const diffSequences = (a, b, lookahead = 4) => {
  const ops = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ type: 'match', aIndex: i, bIndex: j, aChar: a[i], bChar: b[j] });
      i++;
      j++;
      continue;
    }

    // Mismatch — decide between insertion, deletion, or substitution.
    // We'll look ahead for the shortest gap that re-aligns the two sequences.
    let bestSkipA = lookahead + 1;
    let bestSkipB = lookahead + 1;

    for (let k = 1; k <= lookahead; k++) {
      if (i + k < a.length && a[i + k] === b[j]) { bestSkipA = k; break; }
    }
    for (let k = 1; k <= lookahead; k++) {
      if (j + k < b.length && b[j + k] === a[i]) { bestSkipB = k; break; }
    }

    if (bestSkipA <= bestSkipB && bestSkipA <= lookahead) {
      // Skip ahead in A — meaning B has bases A doesn't (insertion relative to A).
      for (let k = 0; k < bestSkipA; k++) {
        ops.push({ type: 'del', aIndex: i + k, bIndex: null, aChar: a[i + k], bChar: null });
      }
      i += bestSkipA;
    } else if (bestSkipB <= lookahead) {
      // Skip ahead in B — meaning A has bases B doesn't (deletion from A's perspective).
      for (let k = 0; k < bestSkipB; k++) {
        ops.push({ type: 'ins', aIndex: null, bIndex: j + k, aChar: null, bChar: b[j + k] });
      }
      j += bestSkipB;
    } else {
      // Neither lookahead found a re-alignment — treat as a substitution.
      ops.push({ type: 'sub', aIndex: i, bIndex: j, aChar: a[i], bChar: b[j] });
      i++;
      j++;
    }
  }

  // Tail — any remaining bases in either sequence
  while (i < a.length) {
    ops.push({ type: 'del', aIndex: i, bIndex: null, aChar: a[i], bChar: null });
    i++;
  }
  while (j < b.length) {
    ops.push({ type: 'ins', aIndex: null, bIndex: j, aChar: null, bChar: b[j] });
    j++;
  }

  return ops;
};

// =====================================================
// ANNOTATIONS
// =====================================================

/**
 * Annotation shape (for reference):
 * {
 *   id: string,
 *   start: number,        // 0-indexed inclusive
 *   end: number,          // 0-indexed exclusive
 *   label: string,
 *   color: string,        // hex
 * }
 */

// Palette used when creating new annotations
export const ANNOTATION_COLORS = [
  '#00E5A0', // green
  '#4FA8FF', // blue
  '#FFD23F', // amber
  '#FF5470', // coral
  '#A78BFA', // purple
  '#F472B6', // pink
];

/**
 * Given a list of annotations, returns a fresh color for a new one.
 */
export const nextAnnotationColor = (annotations) => {
  return ANNOTATION_COLORS[annotations.length % ANNOTATION_COLORS.length];
};

// =====================================================
// PRIMER DESIGN
// =====================================================

/**
 * Reverse complement of a DNA sequence.
 * (Used internally by primer design, but also useful on its own.)
 */
export const reverseComplement = (seq) => {
  const comp = { A: 'T', T: 'A', C: 'G', G: 'C' };
  let out = '';
  for (let i = seq.length - 1; i >= 0; i--) {
    out += comp[seq[i]] || 'N';
  }
  return out;
};

/**
 * Wallace rule for melting temperature (short primers, < 25 bp).
 * Tm = 2 * (#A + #T) + 4 * (#G + #C)
 */
export const meltingTemp = (primer) => {
  let at = 0;
  let gc = 0;
  for (const b of primer.toUpperCase()) {
    if (b === 'A' || b === 'T') at++;
    else if (b === 'G' || b === 'C') gc++;
  }
  return 2 * at + 4 * gc;
};

/**
 * GC content as a percentage.
 */
export const gcContent = (seq) => {
  if (!seq) return 0;
  let gc = 0;
  for (const b of seq.toUpperCase()) {
    if (b === 'G' || b === 'C') gc++;
  }
  return (gc / seq.length) * 100;
};

/**
 * Scores a candidate primer. Lower = better.
 * Rejects candidates that fail hard rules (returns Infinity).
 *
 * Hard rules:
 *   - Length 18–24
 *   - GC content 40–60%
 *   - Ends in G or C (GC clamp)
 *   - No more than 4 identical bases in a row
 */
const scorePrimer = (primer) => {
  const len = primer.length;
  if (len < 18 || len > 24) return Infinity;

  const gc = gcContent(primer);
  if (gc < 40 || gc > 60) return Infinity;

  const lastBase = primer[primer.length - 1];
  if (lastBase !== 'G' && lastBase !== 'C') return Infinity;

  // No runs of 5+ identical bases
  let run = 1;
  for (let i = 1; i < primer.length; i++) {
    if (primer[i] === primer[i - 1]) {
      run++;
      if (run >= 5) return Infinity;
    } else {
      run = 1;
    }
  }

  const tm = meltingTemp(primer);
  // Optimal Tm ~ 60°C, optimal GC ~ 50%, optimal length ~ 20
  const tmScore = Math.abs(tm - 60);
  const gcScore = Math.abs(gc - 50);
  const lenScore = Math.abs(len - 20);

  return tmScore * 2 + gcScore * 0.5 + lenScore * 0.5;
};

/**
 * Finds the best forward primer starting at or near `start`.
 * Scans offsets 0..5 and lengths 18..24 to find the highest-scoring candidate.
 */
const designForwardPrimer = (sequence, start, end) => {
  let best = null;
  let bestScore = Infinity;

  // Don't run off the end of the target region
  const maxStart = Math.min(start + 6, end - 18);

  for (let offset = 0; offset <= 6; offset++) {
    const s = start + offset;
    if (s > maxStart) break;

    for (let len = 18; len <= 24; len++) {
      if (s + len > sequence.length) break;
      const primer = sequence.slice(s, s + len);
      if (/[^ATCG]/.test(primer)) continue;

      const score = scorePrimer(primer);
      if (score < bestScore) {
        bestScore = score;
        best = { sequence: primer, position: s, length: len, tm: meltingTemp(primer), gc: gcContent(primer) };
      }
    }
  }
  return best;
};

/**
 * Finds the best reverse primer ending at or near `end`.
 * The returned `sequence` is the reverse complement (the actual primer you'd order).
 */
const designReversePrimer = (sequence, start, end) => {
  let best = null;
  let bestScore = Infinity;

  for (let offset = 0; offset <= 6; offset++) {
    const e = end - offset;
    if (e - 18 < start) break;

    for (let len = 18; len <= 24; len++) {
      if (e - len < 0) break;
      const raw = sequence.slice(e - len, e);
      if (/[^ATCG]/.test(raw)) continue;

      const rc = reverseComplement(raw);
      const score = scorePrimer(rc);
      if (score < bestScore) {
        bestScore = score;
        best = {
          sequence: rc,             // the primer as synthesized
          templateRegion: raw,      // the region it binds (forward strand)
          position: e - len,        // position on the forward strand
          length: len,
          tm: meltingTemp(rc),
          gc: gcContent(rc),
        };
      }
    }
  }
  return best;
};

/**
 * Designs a primer pair for a target region.
 * @param {string} sequence - the full template
 * @param {number} start - target region start (0-indexed, inclusive)
 * @param {number} end - target region end (0-indexed, exclusive)
 * @returns {{ forward, reverse } | null}
 */
export const designPrimers = (sequence, start, end) => {
  if (!sequence || end - start < 60) return null;
  const forward = designForwardPrimer(sequence, start, end);
  const reverse = designReversePrimer(sequence, start, end);
  if (!forward || !reverse) return null;
  return { forward, reverse };
};
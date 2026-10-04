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
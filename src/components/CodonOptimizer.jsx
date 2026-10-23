import { useMemo, useState } from 'react';
import { Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import { translateSequence } from '../utils/sequence';

// The most optimal codons for common hosts.
// (Based on high-frequency codons from Kazusa codon usage tables)
const HOST_CODONS = {
  ecoli: {
    name: 'E. coli',
    table: {
      A: 'GCG', C: 'TGC', D: 'GAT', E: 'GAA', F: 'TTC', G: 'GGC', H: 'CAT',
      I: 'ATT', K: 'AAA', L: 'CTG', M: 'ATG', N: 'AAC', P: 'CCG', Q: 'CAG',
      R: 'CGT', S: 'AGC', T: 'ACC', V: 'GTG', W: 'TGG', Y: 'TAT',
    }
  },
  human: {
    name: 'Human',
    table: {
      A: 'GCC', C: 'TGC', D: 'GAC', E: 'GAG', F: 'TTC', G: 'GGC', H: 'CAC',
      I: 'ATC', K: 'AAG', L: 'CTG', M: 'ATG', N: 'AAC', P: 'CCC', Q: 'CAG',
      R: 'CGG', S: 'AGC', T: 'ACC', V: 'GTG', W: 'TGG', Y: 'TAC',
    }
  },
  yeast: {
    name: 'Yeast',
    table: {
      A: 'GCT', C: 'TGT', D: 'GAT', E: 'GAA', F: 'TTC', G: 'GGT', H: 'CAT',
      I: 'ATT', K: 'AAG', L: 'TTG', M: 'ATG', N: 'AAT', P: 'CCA', Q: 'CAA',
      R: 'AGA', S: 'TCT', T: 'ACT', V: 'GTT', W: 'TGG', Y: 'TAT',
    }
  }
};

export default function CodonOptimizer({ sequence }) {
  const [host, setHost] = useState('ecoli');
  const [copied, setCopied] = useState(false);

  // 1. Translate the input DNA to Protein
  const protein = useMemo(() => {
    if (!sequence) return '';
    const codons = translateSequence(sequence);
    return codons.map((c) => c.aa).join('');
  }, [sequence]);

  // 2. Optimize the Protein back to DNA using the Host's table
  const optimizedDNA = useMemo(() => {
    if (!protein) return '';
    let dna = '';
    const table = HOST_CODONS[host].table;

    for (let i = 0; i < protein.length; i++) {
      const aa = protein[i];
      if (aa === '*') {
        dna += 'TAA'; // Add a stop codon if the protein ends
        break;
      } else if (aa === '?') {
        dna += 'NNN'; // Unknown/ambiguous base
      } else {
        dna += table[aa] || 'NNN';
      }
    }
    return dna;
  }, [protein, host]);

  // 3. Calculate GC content of the new sequence
  const gcContent = useMemo(() => {
    if (!optimizedDNA) return 0;
    let gc = 0;
    for (const char of optimizedDNA) {
      if (char === 'G' || char === 'C') gc++;
    }
    return (gc / optimizedDNA.length) * 100;
  }, [optimizedDNA]);

  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedDNA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sequence || sequence.length < 30) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Sparkles size={32} className="text-strand-muted mb-4" />
        <p className="text-sm font-medium text-strand-text mb-1">Sequence too short</p>
        <p className="text-xs text-strand-muted text-center max-w-xs">
          Load a coding sequence to optimize its codons.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-strand-bg p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold text-strand-text flex items-center gap-2">
              <Sparkles size={20} className="text-strand-a" />
              Codon Optimization
            </h2>
            <p className="text-xs text-strand-muted mt-1">
              Rewrite the DNA sequence for maximum protein expression in a target host.
            </p>
          </div>
        </div>

        {/* Host Selection */}
        <div className="mb-8">
          <label className="text-[10px] font-mono uppercase tracking-wider text-strand-muted mb-2 block">
            Target Host Organism
          </label>
          <div className="flex gap-2">
            {Object.entries(HOST_CODONS).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setHost(key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  host === key
                    ? 'bg-strand-a/10 border-strand-a text-strand-a'
                    : 'bg-strand-panel border-strand-muted/10 text-strand-muted hover:text-strand-text'
                }`}
              >
                {data.name}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Original Sequence */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-strand-muted">
                Original Sequence
              </h3>
              <span className="text-[10px] font-mono text-strand-muted bg-strand-panel px-2 py-0.5 rounded">
                {sequence.length} bp
              </span>
            </div>
            <div className="bg-strand-panel rounded-2xl p-4 border border-strand-muted/10 h-64 overflow-y-auto">
              <p className="font-mono text-xs text-strand-muted leading-relaxed break-all">
                {sequence}
              </p>
            </div>
          </div>

          {/* Optimized Sequence */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-strand-a">
                Optimized for {HOST_CODONS[host].name}
              </h3>
              <div className="flex gap-2">
                <span className="text-[10px] font-mono text-strand-muted bg-strand-panel px-2 py-0.5 rounded">
                  GC: {gcContent.toFixed(1)}%
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-[10px] font-mono bg-strand-a text-strand-bg px-2 py-0.5 rounded hover:brightness-110 transition-all"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="bg-strand-panel rounded-2xl p-4 border border-strand-a/30 h-64 overflow-y-auto relative">
              <p className="font-mono text-xs text-strand-text leading-relaxed break-all">
                {optimizedDNA}
              </p>
            </div>
          </div>
        </div>

        {/* Stats / Info */}
        <div className="mt-8 bg-strand-panel rounded-2xl p-5 border border-strand-muted/10 flex items-center gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-strand-text mb-1">Protein Length</h4>
            <p className="text-xs text-strand-muted font-mono">{protein.replace('*', '').length} amino acids</p>
          </div>
          <div className="w-px h-8 bg-strand-muted/20" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-strand-text mb-1">Strategy</h4>
            <p className="text-xs text-strand-muted font-mono leading-relaxed">
              Replaced every amino acid with the highest-frequency codon for {HOST_CODONS[host].name}, while preserving the exact protein sequence.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
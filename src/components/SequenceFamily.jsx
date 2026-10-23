import { useState, useMemo, useEffect, useRef } from 'react';
import { Network, Plus, X, Dna } from 'lucide-react';

// Simple k-mer similarity (Jaccard index)
const getKmers = (seq, k = 3) => {
  const kmers = new Set();
  for (let i = 0; i <= seq.length - k; i++) {
    kmers.add(seq.slice(i, i + k));
  }
  return kmers;
};

const jaccardSimilarity = (setA, setB) => {
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

export default function SequenceFamily() {
  const [inputText, setInputText] = useState('');
  const canvasRef = useRef(null);

  // Parse the input into an array of sequences
  const sequences = useMemo(() => {
    if (!inputText.trim()) return [];
    return inputText
      .split(/\n+/)
      .map((line) => line.trim().toUpperCase())
      .filter((line) => line.length > 0 && !line.startsWith('>'))
      .map((line, i) => ({ id: `Seq ${i + 1}`, sequence: line.replace(/[^ATCG]/g, '') }))
      .filter((s) => s.sequence.length > 0);
  }, [inputText]);

  // Compute similarity matrix
  const matrix = useMemo(() => {
    if (sequences.length < 2) return [];
    
    const kmers = sequences.map((s) => getKmers(s.sequence, 3));
    const size = sequences.length;
    const m = Array(size).fill(0).map(() => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i === j) {
          m[i][j] = 1.0;
        } else {
          m[i][j] = jaccardSimilarity(kmers[i], kmers[j]);
        }
      }
    }
    return m;
  }, [sequences]);

  // Compute Consensus (only if sequences are the same length)
  const consensus = useMemo(() => {
    if (sequences.length < 2) return null;
    const len = sequences[0].sequence.length;
    // Only compute consensus if all sequences are exactly the same length
    if (sequences.some((s) => s.sequence.length !== len)) return null;

    let consensusStr = '';
    let conservation = []; // 0-100%
    
    for (let i = 0; i < len; i++) {
      const counts = { A: 0, T: 0, C: 0, G: 0 };
      let total = 0;
      sequences.forEach((s) => {
        const base = s.sequence[i];
        if (counts[base] !== undefined) { counts[base]++; total++; }
      });

      let maxBase = 'N';
      let maxCount = 0;
      for (const [base, count] of Object.entries(counts)) {
        if (count > maxCount) { maxCount = count; maxBase = base; }
      }
      
      consensusStr += maxBase;
      conservation.push((maxCount / sequences.length) * 100);
    }
    return { str: consensusStr, conservation };
  }, [sequences]);

  // Draw the matrix heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || matrix.length === 0) return;

    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.parentElement.clientWidth, 400);
    const cellSize = size / matrix.length;
    
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix.length; j++) {
        const val = matrix[i][j];
        // Green gradient for similarity
        const alpha = val * 0.8 + 0.1;
        ctx.fillStyle = `rgba(0, 229, 160, ${alpha})`;
        ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);

        // Grid lines
        ctx.strokeStyle = '#121820';
        ctx.lineWidth = 1;
        ctx.strokeRect(j * cellSize, i * cellSize, cellSize, cellSize);

        // Value text (only if cells are large enough)
        if (cellSize > 30) {
          ctx.fillStyle = val > 0.5 ? '#0A0E14' : '#E8EDF2';
          ctx.font = `${Math.min(12, cellSize / 3)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(val.toFixed(2), j * cellSize + cellSize / 2, i * cellSize + cellSize / 2);
        }
      }
    }
  }, [matrix]);

  const handleClear = () => setInputText('');

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Left: Input Panel */}
      <div className="w-full md:w-1/3 shrink-0 border-r border-strand-muted/10 p-4 flex flex-col bg-strand-bg/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-strand-text flex items-center gap-2">
            <Network size={14} className="text-strand-a" /> Sequence Family
          </h2>
          <button onClick={handleClear} className="text-xs font-mono text-strand-muted hover:text-strand-t transition-colors">
            Clear
          </button>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste multiple sequences here (one per line or FASTA format)..."
          className="flex-1 min-h-[200px] w-full bg-strand-panel rounded-xl p-3 text-strand-text font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-strand-a/50 placeholder:text-strand-muted/50 transition-all border border-strand-muted/10"
        />
        <div className="mt-3 text-[10px] font-mono text-strand-muted">
          {sequences.length} valid sequence{sequences.length === 1 ? '' : 's'} detected.
        </div>
      </div>

      {/* Right: Results Panel */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {sequences.length < 2 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Network size={32} className="text-strand-muted mb-4 opacity-50" />
            <p className="text-sm font-medium text-strand-text mb-1">Waiting for sequences</p>
            <p className="text-xs text-strand-muted max-w-xs">
              Paste at least 2 sequences into the input panel to generate a similarity matrix and consensus.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Similarity Matrix */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-strand-muted mb-3">
                Similarity Matrix (3-mer Jaccard)
              </h3>
              <div className="bg-strand-panel rounded-2xl p-4 border border-strand-muted/10 flex justify-center">
                <canvas ref={canvasRef} className="block" />
              </div>
              <p className="text-[10px] text-strand-muted font-mono mt-2 text-center">
                Darker green = more similar sequence.
              </p>
            </div>

            {/* Consensus */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-strand-muted mb-3">
                Consensus Sequence
              </h3>
              <div className="bg-strand-panel rounded-2xl p-4 border border-strand-muted/10 flex flex-col h-[400px]">
                {consensus ? (
                  <>
                    <div className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed text-strand-text break-all pr-2">
                      {consensus.str.split('').map((char, i) => (
                        <span
                          key={i}
                          className={
                            consensus.conservation[i] === 100
                              ? 'text-strand-a font-bold'
                              : consensus.conservation[i] >= 50
                              ? 'text-strand-g'
                              : 'text-strand-t'
                          }
                          title={`${consensus.conservation[i].toFixed(0)}% conserved`}
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-strand-muted/10 flex gap-4 text-[10px] font-mono text-strand-muted">
                      <span className="text-strand-a font-bold">100% Conserved</span>
                      <span className="text-strand-g">≥50% Conserved</span>
                      <span className="text-strand-t">&lt;50% Conserved</span>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Dna size={24} className="text-strand-muted mb-2 opacity-50" />
                    <p className="text-xs text-strand-muted">
                      Consensus requires all sequences to be exactly the same length.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
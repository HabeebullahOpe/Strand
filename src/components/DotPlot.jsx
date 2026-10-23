import { useState, useMemo, useRef, useEffect } from 'react';
import { Grid2x2, Settings2 } from 'lucide-react';

export default function DotPlot({ sequence }) {
  const [seqB, setSeqB] = useState('');
  const [kmerSize, setKmerSize] = useState(15);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Use sequenceA from the main app, and sequenceB from the text box
  const seqA = sequence || '';

  // Compute the dot plot hits
  const hits = useMemo(() => {
    if (!seqA || !seqB) return [];
    
    const aUpper = seqA.toUpperCase();
    const bUpper = seqB.replace(/[^A-Z]/gi, '').toUpperCase();
    
    if (aUpper.length === 0 || bUpper.length === 0) return [];

    // Build a map of k-mers in Sequence B for fast lookup
    const bKmers = new Map();
    for (let i = 0; i <= bUpper.length - kmerSize; i++) {
      const kmer = bUpper.slice(i, i + kmerSize);
      if (!bKmers.has(kmer)) bKmers.set(kmer, []);
      bKmers.get(kmer).push(i);
    }

    // Scan Sequence A and look for matches
    const matches = [];
    for (let i = 0; i <= aUpper.length - kmerSize; i++) {
      const kmer = aUpper.slice(i, i + kmerSize);
      if (bKmers.has(kmer)) {
        const bPositions = bKmers.get(kmer);
        bPositions.forEach((bPos) => {
          matches.push({ x: bPos, y: i }); // x = Seq B pos, y = Seq A pos
        });
      }
    }
    return { matches, lenA: aUpper.length, lenB: bUpper.length };
  }, [seqA, seqB, kmerSize]);

  // Draw the plot
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !hits.matches) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const padding = { top: 20, right: 20, bottom: 30, left: 30 };
      const graphW = width - padding.left - padding.right;
      const graphH = height - padding.top - padding.bottom;

      // Draw background
      ctx.fillStyle = '#0A0E14';
      ctx.fillRect(padding.left, padding.top, graphW, graphH);

      // Draw axis lines
      ctx.strokeStyle = '#2A3440';
      ctx.lineWidth = 1;
      ctx.strokeRect(padding.left, padding.top, graphW, graphH);

      const { matches, lenA, lenB } = hits;
      if (matches.length === 0 || !lenA || !lenB) return;

      // Draw the dots
      ctx.fillStyle = '#00E5A0'; // Green dots
      
      // Scale factor from sequence length to pixels
      const scaleX = graphW / lenB;
      const scaleY = graphH / lenA;

      // Draw each match as a tiny dot (or 1px rectangle for performance)
      matches.forEach((m) => {
        const x = padding.left + m.x * scaleX;
        const y = padding.top + (lenA - m.y) * scaleY; // Y is inverted so origin is bottom-left
        ctx.fillRect(x, y, 2, 2); // 2x2 pixel dot
      });

      // Labels
      ctx.fillStyle = '#5C6B7A';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Sequence B (${lenB} bp)`, width / 2, height - 5);
      
      ctx.save();
      ctx.translate(10, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`Sequence A (${lenA} bp)`, 0, 0);
      ctx.restore();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [hits]);

  if (!sequence) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Grid2x2 size={32} className="text-strand-muted mb-4" />
        <p className="text-sm font-medium text-strand-text mb-1">No Sequence A loaded</p>
        <p className="text-xs text-strand-muted text-center max-w-xs">
          Go back to the Home tab and load a sequence into the main input.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Left Controls */}
      <div className="w-full md:w-80 shrink-0 border-r border-strand-muted/10 p-4 flex flex-col bg-strand-bg/50">
        <h2 className="text-sm font-medium text-strand-text flex items-center gap-2 mb-4">
          <Grid2x2 size={14} className="text-strand-a" /> Dot Plot
        </h2>
        
        <label className="text-[10px] font-mono uppercase tracking-wider text-strand-muted mb-1 block">
          Sequence B (Y-axis target)
        </label>
        <textarea
          value={seqB}
          onChange={(e) => setSeqB(e.target.value)}
          placeholder="Paste the second sequence here..."
          className="w-full h-32 bg-strand-panel rounded-xl p-3 text-strand-text font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-strand-a/50 placeholder:text-strand-muted/50 transition-all border border-strand-muted/10 mb-4"
        />

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-strand-muted flex items-center gap-1">
              <Settings2 size={10} /> K-mer Size
            </label>
            <span className="text-[10px] font-mono text-strand-text">{kmerSize} bp</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={kmerSize}
            onChange={(e) => setKmerSize(parseInt(e.target.value))}
            className="w-full h-1 accent-strand-a cursor-pointer"
          />
          <p className="text-[9px] text-strand-muted font-mono mt-1 leading-relaxed">
            Smaller = more sensitive (more noise). Larger = only exact matches.
          </p>
        </div>

        <div className="mt-auto bg-strand-panel rounded-xl p-3 border border-strand-muted/10">
          <p className="text-[10px] font-mono text-strand-muted leading-relaxed">
            <strong className="text-strand-text">How to read this:</strong> A diagonal line means the sequences are identical. A line perpendicular to the diagonal means an inverted repeat. Distinct dots mean repeated elements.
          </p>
        </div>
      </div>

      {/* Right Plot */}
      <div className="flex-1 min-h-0 relative bg-strand-bg" ref={containerRef}>
        <canvas ref={canvasRef} className="block" />
        {!seqB && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs font-mono text-strand-muted bg-strand-panel/80 px-3 py-1.5 rounded-lg border border-strand-muted/10">
              Paste Sequence B to generate plot
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
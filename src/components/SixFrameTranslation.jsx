import { useMemo, useState, useEffect, useRef } from 'react';
import { Languages, ZoomIn, ZoomOut } from 'lucide-react';
import { reverseComplement } from '../utils/sequence';

const CODON_TABLE = {
  TTT: 'F', TTC: 'F', TTA: 'L', TTG: 'L', CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L',
  ATT: 'I', ATC: 'I', ATA: 'I', ATG: 'M', GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V',
  TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S', CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T', GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  TAT: 'Y', TAC: 'Y', TAA: '*', TAG: '*', CAT: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  AAT: 'N', AAC: 'N', AAA: 'K', AAG: 'K', GAT: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  TGT: 'C', TGC: 'C', TGA: '*', TGG: 'W', CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  AGT: 'S', AGC: 'S', AGA: 'R', AGG: 'R', GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

const AA_COLORS = {
  '*': '#FF5470', // Stop codon (coral)
  M: '#00E5A0',   // Start codon (green)
  _: '#2A3440',   // Background/empty
};

const BASE_CELL = 10;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

// Translate a sequence in a specific frame (0, 1, or 2)
const translateFrame = (seq, frame) => {
  let out = '';
  for (let i = frame; i <= seq.length - 3; i += 3) {
    const codon = seq.slice(i, i + 3);
    if (/[^ATCG]/.test(codon)) {
      out += 'X'; // Unknown due to ambiguous base
    } else {
      out += CODON_TABLE[codon] || 'X';
    }
  }
  return out;
};

export default function SixFrameTranslation({ sequence }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1.0);

  // Compute all 6 frames
  const frames = useMemo(() => {
    if (!sequence) return [];
    const rc = reverseComplement(sequence);
    
    return [
      { label: '+1', seq: translateFrame(sequence, 0), color: '#4FA8FF' },
      { label: '+2', seq: translateFrame(sequence, 1), color: '#4FA8FF' },
      { label: '+3', seq: translateFrame(sequence, 2), color: '#4FA8FF' },
      { label: '-1', seq: translateFrame(rc, 0), color: '#FFD23F' },
      { label: '-2', seq: translateFrame(rc, 1), color: '#FFD23F' },
      { label: '-3', seq: translateFrame(rc, 2), color: '#FFD23F' },
    ];
  }, [sequence]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !sequence) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const width = container.clientWidth;
      if (width <= 0) return;

      const cell = Math.max(6, Math.round(BASE_CELL * zoom));
      const gap = Math.max(1, Math.round(2 * zoom));
      const rowHeight = cell + gap;
      const frameGap = rowHeight * 1.5; // Space between the 6 frames
      const rulerWidth = Math.max(30, Math.round(40 * zoom));
      const cols = Math.floor((width - rulerWidth - 16) / (cell + gap));
      
      const totalHeight = (6 * frameGap) + 20;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = totalHeight * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${totalHeight}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, totalHeight);

      // Draw a frame
      frames.forEach((frame, fIdx) => {
        const yBase = fIdx * frameGap + 10;
        const aaSeq = frame.seq;

        // Draw Frame Label (+1, -2, etc.)
        ctx.font = `bold ${Math.max(10, Math.round(12 * zoom))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = frame.color;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(frame.label, rulerWidth - 8, yBase + cell / 2);

        // Draw Amino Acids
        for (let i = 0; i < aaSeq.length; i++) {
          const aa = aaSeq[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = rulerWidth + col * (cell + gap);
          const y = yBase + row * rowHeight;

          let bg = AA_COLORS[aa];
          let textColor = '#0A0E14';

          // If it's not a stop or start, use a muted tint based on frame direction
          if (!bg) {
            bg = fIdx < 3 ? 'rgba(79, 168, 255, 0.15)' : 'rgba(255, 210, 63, 0.15)';
            textColor = fIdx < 3 ? '#4FA8FF' : '#FFD23F';
          }

          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.roundRect(x, y, cell, cell, 2);
          ctx.fill();

          // Draw the letter if zoom is high enough
          if (cell >= 10) {
            ctx.fillStyle = (aa === '*' || aa === 'M') ? '#0A0E14' : textColor;
            ctx.font = `bold ${Math.round(cell * 0.6)}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(aa, x + cell / 2, y + cell / 2 + 1);
          }
        }
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [frames, zoom, sequence]);

  if (!sequence || sequence.length < 6) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Languages size={32} className="text-strand-muted mb-4" />
        <p className="text-sm font-medium text-strand-text mb-1">No sequence loaded</p>
        <p className="text-xs text-strand-muted text-center max-w-xs">
          Go back to the Home tab and load a sequence to use 6-Frame Translation.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-strand-muted/10 bg-strand-bg/50">
        <div className="flex items-center gap-2">
          <Languages size={16} className="text-strand-c" />
          <h2 className="text-sm font-medium text-strand-text">6-Frame Translation</h2>
        </div>
        
        {/* Zoom Control */}
        <div className="flex items-center gap-2 bg-strand-panel rounded-lg px-2 py-1 border border-strand-muted/10">
          <button
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - 0.1) * 10) / 10))}
            disabled={zoom <= MIN_ZOOM}
            className="text-strand-muted hover:text-strand-text disabled:opacity-30 transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24 h-1 accent-strand-a cursor-pointer"
          />
          <button
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + 0.1) * 10) / 10))}
            disabled={zoom >= MAX_ZOOM}
            className="text-strand-muted hover:text-strand-text disabled:opacity-30 transition-colors"
          >
            <ZoomIn size={14} />
          </button>
          <span className="text-[10px] font-mono text-strand-muted w-8 text-right">
            {zoom.toFixed(1)}×
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="shrink-0 flex items-center gap-4 px-4 py-2 bg-strand-panel border-b border-strand-muted/10 text-[10px] font-mono text-strand-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00E5A0]"/> Start (M)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF5470]"/> Stop (*)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4FA8FF]"/> Forward Frames (+)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FFD23F]"/> Reverse Frames (-)</span>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 min-h-0 bg-strand-bg relative overflow-y-auto p-4" ref={containerRef}>
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
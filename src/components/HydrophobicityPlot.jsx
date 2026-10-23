import { useMemo, useState, useEffect, useRef } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { translateSequence } from '../utils/sequence';

// Kyte-Doolittle hydrophobicity scale
const KD_SCALE = {
  I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8, G: -0.4,
  T: -0.7, S: -0.8, W: -0.9, Y: -1.3, P: -1.6, H: -3.2, E: -3.5,
  Q: -3.5, D: -3.5, N: -3.5, K: -3.9, R: -4.5,
};

const WINDOW_SIZE = 9;
const THRESHOLD = 1.6; // Standard threshold for transmembrane domains

export default function HydrophobicityPlot({ sequence }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoverData, setHoverData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 1. Translate to Protein and compute KD scores
  const data = useMemo(() => {
    if (!sequence) return { aaSeq: '', scores: [], maxScore: 5, minScore: -5 };

    // Translate frame 1
    const proteins = translateSequence(sequence);
    const aaSeq = proteins.map((p) => p.aa).join('');

    // Compute sliding window average
    const scores = [];
    let maxScore = -Infinity;
    let minScore = Infinity;

    for (let i = 0; i <= aaSeq.length - WINDOW_SIZE; i++) {
      let sum = 0;
      let validCount = 0;
      
      for (let j = 0; j < WINDOW_SIZE; j++) {
        const aa = aaSeq[i + j];
        if (KD_SCALE[aa] !== undefined) {
          sum += KD_SCALE[aa];
          validCount++;
        }
      }
      
      const avg = validCount > 0 ? sum / validCount : 0;
      scores.push({ position: i, score: avg });
      if (avg > maxScore) maxScore = avg;
      if (avg < minScore) minScore = avg;
    }

    return { 
      aaSeq, 
      scores, 
      maxScore: Math.max(maxScore, 4), 
      minScore: Math.min(minScore, -4) 
    };
  }, [sequence]);

  // 2. Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.scores.length === 0) return;

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

      const padding = { top: 20, right: 20, bottom: 30, left: 40 };
      const graphW = width - padding.left - padding.right;
      const graphH = height - padding.top - padding.bottom;
      const midY = padding.top + graphH / 2;

      // Y-axis scaling
      const yRange = Math.max(Math.abs(data.maxScore), Math.abs(data.minScore));
      const scaleY = (val) => midY - (val / yRange) * (graphH / 2);

      // Draw grid lines (every 1 unit, or 2 if range is large)
      const step = yRange > 3 ? 2 : 1;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1;

      for (let v = -Math.floor(yRange); v <= Math.ceil(yRange); v += step) {
        const y = scaleY(v);
        if (y < padding.top || y > height - padding.bottom) continue;

        // Grid line
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.strokeStyle = v === 0 ? '#5C6B7A' : '#1A222C';
        ctx.stroke();

        // Label
        ctx.fillStyle = '#5C6B7A';
        ctx.fillText(v.toString(), padding.left - 6, y);
      }

      // Draw Threshold Line (above 1.6 is hydrophobic / transmembrane)
      const thresholdY = scaleY(THRESHOLD);
      ctx.beginPath();
      ctx.moveTo(padding.left, thresholdY);
      ctx.lineTo(width - padding.right, thresholdY);
      ctx.strokeStyle = 'rgba(255, 84, 112, 0.4)'; // Coral
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw the curve
      const scaleX = (i) => padding.left + (i / data.scores.length) * graphW;

      ctx.beginPath();
      data.scores.forEach((pt, i) => {
        const x = scaleX(i);
        const y = scaleY(pt.score);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      // Gradient stroke: green for positive (hydrophobic), blue for negative (hydrophilic)
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, '#00E5A0'); // Top (hydrophobic)
      gradient.addColorStop(0.5, '#5C6B7A'); // Middle
      gradient.addColorStop(1, '#4FA8FF'); // Bottom (hydrophilic)

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw fill under the curve
      ctx.lineTo(scaleX(data.scores.length - 1), midY);
      ctx.lineTo(scaleX(0), midY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 229, 160, 0.1)';
      ctx.fill();

      // X-axis labels (position)
      ctx.fillStyle = '#5C6B7A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const tickCount = 5;
      for (let i = 0; i <= tickCount; i++) {
        const pos = Math.floor((i / tickCount) * data.scores.length);
        if (pos >= data.scores.length) continue;
        const x = scaleX(pos);
        ctx.fillText((pos + 1).toString(), x, height - padding.bottom + 6);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [data]);

  // 3. Hover interaction
  const handleMouseMove = (e) => {
    if (!canvasRef.current || data.scores.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const graphW = rect.width - padding.left - padding.right;
    
    if (x < padding.left || x > rect.width - padding.right) {
      setHoverData(null);
      return;
    }

    const index = Math.floor(((x - padding.left) / graphW) * data.scores.length);
    if (index >= 0 && index < data.scores.length) {
      const pt = data.scores[index];
      const aa = data.aaSeq[pt.position];
      setHoverData({ ...pt, aa });
      setMousePos({ x, y });
    }
  };

  if (!sequence || sequence.length < 30) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Activity size={32} className="text-strand-muted mb-4" />
        <p className="text-sm font-medium text-strand-text mb-1">Sequence too short</p>
        <p className="text-xs text-strand-muted text-center max-w-xs">
          Load a sequence of at least 30 bp to generate a hydrophobicity plot.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-strand-bg">
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-strand-muted/10">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-strand-c" />
          <h2 className="text-sm font-medium text-strand-text">Kyte-Doolittle Hydrophobicity</h2>
        </div>
        <div className="flex gap-4 text-[10px] font-mono text-strand-muted">
          <span>Window: {WINDOW_SIZE} aa</span>
          <span className="flex items-center gap-1">
            <AlertCircle size={10} className="text-strand-t" /> 
            Transmembrane threshold
          </span>
        </div>
      </div>

      <div 
        className="flex-1 min-h-0 relative"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverData(null)}
      >
        <canvas ref={canvasRef} className="block cursor-crosshair" />
        
        {/* Tooltip */}
        {hoverData && (
          <div 
            className="absolute pointer-events-none bg-strand-panel border border-strand-muted/30 rounded-lg px-3 py-2 text-xs shadow-xl z-10"
            style={{ left: mousePos.x + 15, top: mousePos.y - 30 }}
          >
            <div className="font-mono text-strand-muted mb-1">Residue {hoverData.position + 1}</div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-strand-text">Score: {hoverData.score.toFixed(2)}</span>
              <span className="text-strand-muted">({hoverData.aa})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
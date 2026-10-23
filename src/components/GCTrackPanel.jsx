import { useMemo, useState, useRef, useEffect } from 'react';
import { Activity, ZoomIn, ZoomOut } from 'lucide-react';

const WINDOW_SIZE = 50; // Standard sliding window for GC tracks

export default function GCTrackPanel({ sequence }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [windowSize, setWindowSize] = useState(WINDOW_SIZE);
  const [hoverData, setHoverData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Compute sliding window GC content
  const gcData = useMemo(() => {
    if (!sequence || sequence.length < windowSize) return [];
    
    const data = [];
    const halfWindow = Math.floor(windowSize / 2);

    // Precompute cumulative GC counts for O(n) efficiency
    const cumGC = new Array(sequence.length + 1).fill(0);
    for (let i = 0; i < sequence.length; i++) {
      cumGC[i + 1] = cumGC[i] + (sequence[i] === 'G' || sequence[i] === 'C' ? 1 : 0);
    }

    for (let i = 0; i < sequence.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(sequence.length, i + halfWindow + 1);
      const gcCount = cumGC[end] - cumGC[start];
      const windowLen = end - start;
      data.push({
        pos: i,
        gc: windowLen > 0 ? (gcCount / windowLen) * 100 : 0,
      });
    }
    return data;
  }, [sequence, windowSize]);

  // Draw the plot
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || gcData.length === 0) return;

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

      const scaleY = (val) => padding.top + graphH - (val / 100) * graphH;
      const scaleX = (i) => padding.left + (i / gcData.length) * graphW;

      // Draw grid (0, 25, 50, 75, 100)
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1;

      [0, 25, 50, 75, 100].forEach((val) => {
        const y = scaleY(val);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.strokeStyle = val === 50 ? '#5C6B7A' : '#1A222C';
        ctx.setLineDash(val === 50 ? [4, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#5C6B7A';
        ctx.fillText(`${val}%`, padding.left - 6, y);
      });

      // Draw area fill
      ctx.beginPath();
      ctx.moveTo(scaleX(0), scaleY(50));
      gcData.forEach((d, i) => ctx.lineTo(scaleX(i), scaleY(d.gc)));
      ctx.lineTo(scaleX(gcData.length - 1), scaleY(50));
      ctx.closePath();
      
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(0, 229, 160, 0.3)'); // High GC (green)
      gradient.addColorStop(0.5, 'rgba(255, 210, 63, 0.15)'); // Mid
      gradient.addColorStop(1, 'rgba(255, 84, 112, 0.3)'); // Low GC (coral)
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw the line
      ctx.beginPath();
      gcData.forEach((d, i) => {
        const x = scaleX(i);
        const y = scaleY(d.gc);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#00E5A0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // X-axis labels
      ctx.fillStyle = '#5C6B7A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const tickCount = 5;
      for (let i = 0; i <= tickCount; i++) {
        const pos = Math.floor((i / tickCount) * gcData.length);
        if (pos >= gcData.length) continue;
        const x = scaleX(pos);
        ctx.fillText((pos + 1).toString(), x, height - padding.bottom + 6);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [gcData]);

  // Hover interaction
  const handleMouseMove = (e) => {
    if (!canvasRef.current || gcData.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { left: 40, right: 20 };
    const graphW = rect.width - padding.left - padding.right;
    
    if (x < padding.left || x > rect.width - padding.right) {
      setHoverData(null);
      return;
    }

    const index = Math.floor(((x - padding.left) / graphW) * gcData.length);
    if (index >= 0 && index < gcData.length) {
      setHoverData(gcData[index]);
      setMousePos({ x, y });
    }
  };

  if (!sequence || sequence.length < windowSize) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Activity size={32} className="text-strand-muted mb-4" />
        <p className="text-sm font-medium text-strand-text mb-1">Sequence too short</p>
        <p className="text-xs text-strand-muted text-center max-w-xs">
          Load a sequence of at least {windowSize} bp to generate a GC content track.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-strand-bg">
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-strand-muted/10">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-strand-a" />
          <h2 className="text-sm font-medium text-strand-text">GC Content Track</h2>
        </div>
        
        {/* Window Size Slider */}
        <div className="flex items-center gap-2 bg-strand-panel rounded-lg px-2 py-1 border border-strand-muted/10">
          <span className="text-[10px] font-mono text-strand-muted">Window</span>
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={windowSize}
            onChange={(e) => setWindowSize(parseInt(e.target.value))}
            className="w-24 h-1 accent-strand-a cursor-pointer"
          />
          <span className="text-[10px] font-mono text-strand-text w-8 text-right">{windowSize} bp</span>
        </div>
      </div>

      <div 
        className="flex-1 min-h-0 relative"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverData(null)}
      >
        <canvas ref={canvasRef} className="block cursor-crosshair" />
        
        {/* Hover Tooltip */}
        {hoverData && (
          <div 
            className="absolute pointer-events-none bg-strand-panel border border-strand-muted/30 rounded-lg px-3 py-2 text-xs shadow-xl z-10"
            style={{ left: mousePos.x + 15, top: mousePos.y - 20 }}
          >
            <div className="font-mono text-strand-muted mb-1">Position {hoverData.pos + 1}</div>
            <div className="font-bold text-strand-a">{hoverData.gc.toFixed(1)}% GC</div>
          </div>
        )}
      </div>
    </div>
  );
}
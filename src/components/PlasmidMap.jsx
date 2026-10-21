import { useMemo, useState, useRef, useEffect } from 'react';
import { CircleDot } from 'lucide-react';
import { findORFs } from '../utils/sequence';

// Reuse the enzymes from RestrictionSites
const RESTRICTION_ENZYMES = [
  { name: 'EcoRI',  site: 'GAATTC', color: '#00E5A0' },
  { name: 'BamHI',  site: 'GGATCC', color: '#4FA8FF' },
  { name: 'HindIII', site: 'AAGCTT', color: '#FF5470' },
  { name: 'XbaI',   site: 'TCTAGA', color: '#FFD23F' },
  { name: 'SalI',   site: 'GTCGAC', color: '#00E5A0' },
  { name: 'PstI',   site: 'CTGCAG', color: '#4FA8FF' },
  { name: 'KpnI',   site: 'GGTACC', color: '#FF5470' },
  { name: 'SmaI',   site: 'CCCGGG', color: '#FFD23F' },
  { name: 'EcoRV',  site: 'GATATC', color: '#00E5A0' },
  { name: 'NdeI',   site: 'CATATG', color: '#4FA8FF' },
];

const ORF_COLORS = ['#00E5A0', '#4FA8FF', '#FF5470', '#FFD23F', '#A78BFA'];

export default function PlasmidMap({ sequence }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 1. Find ORFs and Restriction Sites
  const data = useMemo(() => {
    if (!sequence) return { orfs: [], sites: [] };

    // Find ORFs (minimum 100 bases for a plasmid map to avoid clutter)
    const rawOrfs = findORFs(sequence, 100, 0).concat(findORFs(sequence, 100, 1), findORFs(sequence, 100, 2));
    
    // Find restriction sites
    const sites = [];
    RESTRICTION_ENZYMES.forEach((enz) => {
      for (let i = 0; i <= sequence.length - enz.site.length; i++) {
        if (sequence.slice(i, i + enz.site.length) === enz.site) {
          sites.push({ ...enz, position: i });
        }
      }
    });

    return { orfs: rawOrfs, sites };
  }, [sequence]);

  // 2. The Canvas Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !sequence) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const width = container.clientWidth;
      const height = container.clientHeight;
      const size = Math.min(width, height);
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = size * 0.35; // Outer ring radius
      const trackRadius = size * 0.28; // ORF track radius
      const seqLen = sequence.length;

      // Draw the DNA backbone ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#2A3440';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw tick marks for sequence length (every 1000 bp, or every 100 if short)
      const tickStep = seqLen > 5000 ? 1000 : 100;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < seqLen; i += tickStep) {
        const angle = (i / seqLen) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + Math.cos(angle) * (radius - 2);
        const y1 = cy + Math.sin(angle) * (radius - 2);
        const x2 = cx + Math.cos(angle) * (radius + 6);
        const y2 = cy + Math.sin(angle) * (radius + 6);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#5C6B7A';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw the number label
        const tx = cx + Math.cos(angle) * (radius + 18);
        const ty = cy + Math.sin(angle) * (radius + 18);
        ctx.fillStyle = '#5C6B7A';
        ctx.fillText(i === 0 ? '1' : i.toString(), tx, ty);
      }

      // Draw Restriction Sites (outer ticks)
      data.sites.forEach((site) => {
        const angle = (site.position / seqLen) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + Math.cos(angle) * (radius + 4);
        const y1 = cy + Math.sin(angle) * (radius + 4);
        const x2 = cx + Math.cos(angle) * (radius + 14);
        const y2 = cy + Math.sin(angle) * (radius + 14);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = site.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw ORFs (inner arrows)
      data.orfs.forEach((orf, idx) => {
        const startAngle = (orf.start / seqLen) * Math.PI * 2 - Math.PI / 2;
        const endAngle = (orf.end / seqLen) * Math.PI * 2 - Math.PI / 2;
        const color = ORF_COLORS[idx % ORF_COLORS.length];

        // Draw the arc
        ctx.beginPath();
        ctx.arc(cx, cy, trackRadius, startAngle, endAngle, false);
        ctx.strokeStyle = color;
        ctx.lineWidth = 12;
        ctx.stroke();

        // Draw arrowhead at the end
        const arrowSize = 8;
        const tipX = cx + Math.cos(endAngle) * trackRadius;
        const tipY = cy + Math.sin(endAngle) * trackRadius;
        
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
          tipX - Math.cos(endAngle - 0.3) * arrowSize,
          tipY - Math.sin(endAngle - 0.3) * arrowSize
        );
        ctx.lineTo(
          tipX - Math.cos(endAngle + 0.3) * arrowSize,
          tipY - Math.sin(endAngle + 0.3) * arrowSize
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      });

      // Draw Center Text
      ctx.fillStyle = '#E8EDF2';
      ctx.font = 'bold 18px "Space Grotesk", sans-serif';
      ctx.fillText('Plasmid', cx, cy - 8);
      ctx.fillStyle = '#5C6B7A';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`${seqLen} bp`, cx, cy + 10);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [data, sequence]);

  // 3. Hover interaction (checking mouse distance to center)
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // Distance from center
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const size = Math.min(rect.width, rect.height);
    const radius = size * 0.35;

    // If hovering near the outer restriction site ring
    if (dist > radius && dist < radius + 20) {
      setHoveredItem({ type: 'site' });
      setMousePos({ x, y });
    } else {
      setHoveredItem(null);
    }
  };

  if (!sequence || sequence.length < 100) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <CircleDot size={32} className="text-strand-muted mb-4" />
        <p className="text-sm font-medium text-strand-text mb-1">Sequence too short</p>
        <p className="text-xs text-strand-muted text-center max-w-xs">
          Load a sequence of at least 100 bp to generate a plasmid map.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-strand-muted/10 bg-strand-bg/50">
        <div className="flex items-center gap-2">
          <CircleDot size={16} className="text-strand-a" />
          <h2 className="text-sm font-medium text-strand-text">Circular Plasmid Map</h2>
        </div>
        <div className="flex gap-4 text-[10px] font-mono">
          <span className="text-strand-muted">{data.orfs.length} ORFs</span>
          <span className="text-strand-muted">{data.sites.length} Restriction Sites</span>
        </div>
      </div>

      <div 
        className="flex-1 min-h-0 bg-strand-bg relative"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <canvas ref={canvasRef} className="block" />
        
        {/* Hover Tooltip */}
        {hoveredItem && (
          <div 
            className="absolute pointer-events-none bg-strand-panel border border-strand-muted/30 rounded-lg px-2 py-1 text-[10px] font-mono text-strand-text shadow-xl"
            style={{ left: mousePos.x + 15, top: mousePos.y + 15 }}
          >
            Outer ring: Restriction Sites
          </div>
        )}
      </div>
    </div>
  );
}
import { useMemo, useState, useRef, useEffect } from 'react';
import { CircleDot, Eye, EyeOff } from 'lucide-react';
import { findORFs } from '../utils/sequence';

const RESTRICTION_ENZYMES = [
  { name: 'EcoRI',  site: 'GAATTC', cutOffset: 1, color: '#FF5470' },
  { name: 'BamHI',  site: 'GGATCC', cutOffset: 1, color: '#00E5A0' },
  { name: 'HindIII', site: 'AAGCTT', cutOffset: 1, color: '#4FA8FF' },
  { name: 'XbaI',   site: 'TCTAGA', cutOffset: 1, color: '#FFD23F' },
  { name: 'SalI',   site: 'GTCGAC', cutOffset: 1, color: '#A78BFA' },
  { name: 'PstI',   site: 'CTGCAG', cutOffset: 5, color: '#F472B6' },
  { name: 'KpnI',   site: 'GGTACC', cutOffset: 5, color: '#FF5470' },
  { name: 'SmaI',   site: 'CCCGGG', cutOffset: 3, color: '#00E5A0' },
  { name: 'EcoRV',  site: 'GATATC', cutOffset: 3, color: '#4FA8FF' },
  { name: 'NdeI',   site: 'CATATG', cutOffset: 2, color: '#FFD23F' },
];

const ORF_COLORS = [
  '#00E5A0', '#FF5470', '#4FA8FF', '#FFD23F', '#A78BFA', '#F472B6',
];

export default function PlasmidMap({ sequence }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [showOrfs, setShowOrfs] = useState(true);
  const [showSites, setShowSites] = useState(true);

  // 1. Compute Data
  const data = useMemo(() => {
    if (!sequence) return { orfs: [], sites: [] };

    // Minimum 300bp to filter out noise
    let rawOrfs = findORFs(sequence, 300, 0);
    rawOrfs = rawOrfs.concat(findORFs(sequence, 300, 1), findORFs(sequence, 300, 2));
    
    // Sort ORFs by length (largest first) to prioritize major genes
    rawOrfs.sort((a, b) => b.length - a.length);

    rawOrfs = rawOrfs.map((orf, i) => ({
      ...orf,
      color: ORF_COLORS[i % ORF_COLORS.length],
      label: `ORF ${i + 1}`
    }));

    const sites = [];
    RESTRICTION_ENZYMES.forEach((enz) => {
      for (let i = 0; i <= sequence.length - enz.site.length; i++) {
        if (sequence.slice(i, i + enz.site.length) === enz.site) {
          sites.push({ ...enz, position: i, cutPosition: i + enz.cutOffset });
        }
      }
    });

    return { orfs: rawOrfs, sites };
  }, [sequence]);

  // 2. Draw
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
      const radius = size * 0.3; 
      const seqLen = sequence.length;

      // Base ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#2A3440';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Ticks
      const tickStep = seqLen > 5000 ? 1000 : 100;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < seqLen; i += tickStep) {
        const angle = (i / seqLen) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + Math.cos(angle) * (radius - 3);
        const y1 = cy + Math.sin(angle) * (radius - 3);
        const x2 = cx + Math.cos(angle) * (radius + 3);
        const y2 = cy + Math.sin(angle) * (radius + 3);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#5C6B7A'; ctx.lineWidth = 1; ctx.stroke();

        const tx = cx + Math.cos(angle) * (radius - 15);
        const ty = cy + Math.sin(angle) * (radius - 15);
        ctx.fillStyle = '#5C6B7A';
        ctx.fillText(i === 0 ? '1' : i.toString(), tx, ty);
      }

      // Draw ORFs
      if (showOrfs) {
        data.orfs.forEach((orf) => {
          const startAngle = (orf.start / seqLen) * Math.PI * 2 - Math.PI / 2;
          const endAngle = (orf.end / seqLen) * Math.PI * 2 - Math.PI / 2;
          
          ctx.beginPath();
          ctx.arc(cx, cy, radius, startAngle, endAngle, false);
          ctx.strokeStyle = orf.color;
          ctx.lineWidth = 6;
          ctx.stroke();

          // Arrowhead
          const arrowSize = 10;
          const tipX = cx + Math.cos(endAngle) * radius;
          const tipY = cy + Math.sin(endAngle) * radius;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - Math.cos(endAngle - 0.4) * arrowSize, tipY - Math.sin(endAngle - 0.4) * arrowSize);
          ctx.lineTo(tipX - Math.cos(endAngle + 0.4) * arrowSize, tipY - Math.sin(endAngle + 0.4) * arrowSize);
          ctx.closePath();
          ctx.fillStyle = orf.color;
          ctx.fill();

          // Label Callout (pushed outward)
          const midAngle = (startAngle + endAngle) / 2;
          const calloutRadius = radius + 20;
          const lx = cx + Math.cos(midAngle) * calloutRadius;
          const ly = cy + Math.sin(midAngle) * calloutRadius;

          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(midAngle) * radius, cy + Math.sin(midAngle) * radius);
          ctx.lineTo(lx, ly);
          ctx.strokeStyle = orf.color;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = orf.color;
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          if (Math.cos(midAngle) > 0) {
            ctx.textAlign = 'left'; ctx.fillText(orf.label, lx + 4, ly);
          } else {
            ctx.textAlign = 'right'; ctx.fillText(orf.label, lx - 4, ly);
          }
        });
      }

      // Draw Restriction Sites
      if (showSites) {
        data.sites.forEach((site) => {
          const angle = (site.cutPosition / seqLen) * Math.PI * 2 - Math.PI / 2;
          
          // Tick on ring
          const x1 = cx + Math.cos(angle) * (radius + 3);
          const y1 = cy + Math.sin(angle) * (radius + 3);
          const x2 = cx + Math.cos(angle) * (radius + 10);
          const y2 = cy + Math.sin(angle) * (radius + 10);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          ctx.strokeStyle = site.color; ctx.lineWidth = 1.5; ctx.stroke();

          // Callout
          const calloutRadius = radius + 35; // Push sites further out than ORFs
          const lx = cx + Math.cos(angle) * calloutRadius;
          const ly = cy + Math.sin(angle) * calloutRadius;

          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(lx, ly);
          ctx.strokeStyle = site.color;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;

          ctx.fillStyle = site.color;
          ctx.font = '9px "JetBrains Mono", monospace';
          if (Math.cos(angle) > 0) {
            ctx.textAlign = 'left'; ctx.fillText(`${site.name} (${site.cutPosition + 1})`, lx + 4, ly);
          } else {
            ctx.textAlign = 'right'; ctx.fillText(`${site.name} (${site.cutPosition + 1})`, lx - 4, ly);
          }
        });
      }

      // Center
      ctx.fillStyle = '#E8EDF2';
      ctx.font = 'bold 18px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Plasmid', cx, cy - 8);
      ctx.fillStyle = '#5C6B7A';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`${seqLen} bp`, cx, cy + 10);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [data, sequence, showOrfs, showSites]);

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
    <div className="h-full flex flex-col bg-strand-bg">
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-strand-muted/10">
        <div className="flex items-center gap-2">
          <CircleDot size={16} className="text-strand-a" />
          <h2 className="text-sm font-medium text-strand-text">Circular Plasmid Map</h2>
        </div>
        
        {/* Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOrfs(!showOrfs)}
            className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded transition-colors ${
              showOrfs ? 'bg-strand-a/20 text-strand-a' : 'bg-strand-panel text-strand-muted'
            }`}
          >
            {showOrfs ? <Eye size={12} /> : <EyeOff size={12} />} ORFs
          </button>
          <button
            onClick={() => setShowSites(!showSites)}
            className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded transition-colors ${
              showSites ? 'bg-strand-a/20 text-strand-a' : 'bg-strand-panel text-strand-muted'
            }`}
          >
            {showSites ? <Eye size={12} /> : <EyeOff size={12} />} Sites
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative" ref={containerRef}>
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
import { useMemo, useState, useEffect, useRef } from 'react';
import { Scissors, ChevronDown, ChevronUp } from 'lucide-react';

const RESTRICTION_ENZYMES = [
  { name: 'EcoRI',  site: 'GAATTC', cutOffset: 1, type: 'sticky' },
  { name: 'BamHI',  site: 'GGATCC', cutOffset: 1, type: 'sticky' },
  { name: 'HindIII', site: 'AAGCTT', cutOffset: 1, type: 'sticky' },
  { name: 'XbaI',   site: 'TCTAGA', cutOffset: 1, type: 'sticky' },
  { name: 'SalI',   site: 'GTCGAC', cutOffset: 1, type: 'sticky' },
  { name: 'PstI',   site: 'CTGCAG', cutOffset: 5, type: 'sticky' },
  { name: 'KpnI',   site: 'GGTACC', cutOffset: 5, type: 'sticky' },
  { name: 'SphI',   site: 'GCATGC', cutOffset: 5, type: 'sticky' },
  { name: 'SmaI',   site: 'CCCGGG', cutOffset: 3, type: 'blunt' },
  { name: 'EcoRV',  site: 'GATATC', cutOffset: 3, type: 'blunt' },
  { name: 'NdeI',   site: 'CATATG', cutOffset: 2, type: 'sticky' },
  { name: 'NotI',   site: 'GCGGCCGC', cutOffset: 2, type: 'sticky' },
];

const BASE_COLORS = {
  A: '#00E5A0', T: '#FF5470', C: '#4FA8FF', G: '#FFD23F',
  N: '#2A3440',
};

const scanRestrictionSites = (sequence) => {
  if (!sequence || sequence.length === 0) return [];
  const hits = [];

  for (const enzyme of RESTRICTION_ENZYMES) {
    const site = enzyme.site;
    for (let i = 0; i <= sequence.length - site.length; i++) {
      if (sequence.slice(i, i + site.length) === site) {
        hits.push({
          enzyme: enzyme.name,
          position: i,
          cutPosition: i + enzyme.cutOffset,
          siteLength: site.length,
          type: enzyme.type,
          color: enzyme.type === 'blunt' ? '#4FA8FF' : '#00E5A0',
        });
      }
    }
  }
  return hits.sort((a, b) => a.position - b.position);
};

export default function RestrictionSites({ sequence }) {
  const [expandedEnzyme, setExpandedEnzyme] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const hits = useMemo(() => scanRestrictionSites(sequence), [sequence]);

  const enzymeSummary = useMemo(() => {
    const map = {};
    for (const enzyme of RESTRICTION_ENZYMES) map[enzyme.name] = { ...enzyme, hits: [] };
    for (const hit of hits) map[hit.enzyme].hits.push(hit);
    return RESTRICTION_ENZYMES.map((e) => map[e.name]).filter((e) => e.hits.length > 0);
  }, [hits]);

  // Draw the independent sequence canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !sequence) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const width = container.clientWidth;
      if (width <= 0) return;

      // Simple static scaling for this tool
      const cell = 10;
      const gap = 2;
      const rowHeight = 22;
      const rulerWidth = 40;
      const cols = Math.floor((width - rulerWidth - 16) / (cell + gap));
      const rows = Math.ceil(sequence.length / cols) || 1;
      const height = rows * rowHeight + 20;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Draw Bases (only if zoom allows, otherwise draw dots)
      for (let i = 0; i < sequence.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = rulerWidth + col * (cell + gap);
        const y = row * rowHeight + 10;
        
        const base = sequence[i];
        ctx.fillStyle = BASE_COLORS[base] || '#2A3440';
        ctx.beginPath();
        ctx.roundRect(x, y, cell, cell, 2);
        ctx.fill();
      }

      // Draw Ruler
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#5C6B7A';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let row = 0; row < rows; row++) {
        ctx.fillText(String(row * cols + 1), rulerWidth - 6, row * rowHeight + 10 + cell / 2);
      }

      // Draw Cut Sites
      hits.forEach((hit) => {
        const row = Math.floor(hit.position / cols);
        const col = hit.position % cols;
        const x = rulerWidth + col * (cell + gap);
        const y = row * rowHeight + 10;

        // Draw the recognition site background highlight
        const endCol = Math.min(hit.position + hit.siteLength - 1, (row + 1) * cols - 1);
        const widthX = (endCol - col) * (cell + gap) + cell;
        ctx.fillStyle = `${hit.color}33`; // 20% opacity
        ctx.fillRect(x, y - 2, widthX, cell + 4);

        // Draw the cut line (vertical)
        const cutCol = (hit.cutPosition % cols);
        // If cut is on a new row, just skip drawing the vertical line accurately
        if (cutCol >= col && cutCol <= endCol) {
           const cutX = rulerWidth + (cutCol - col) * (cell + gap) + (hit.cutPosition - hit.position) * (cell + gap) - gap/2;
           ctx.beginPath();
           ctx.moveTo(cutX, y - 6);
           ctx.lineTo(cutX, y + cell + 6);
           ctx.strokeStyle = hit.color;
           ctx.lineWidth = 2;
           ctx.stroke();
        }
      });
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [sequence, hits]);

  if (!sequence || sequence.length < 4) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <Scissors size={32} className="text-strand-muted mb-4" />
        <p className="text-sm font-medium text-strand-text mb-1">No sequence loaded</p>
        <p className="text-xs text-strand-muted text-center max-w-xs">
          Go back to the Home tab and load a sequence to use the Restriction Sites tool.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Left sidebar: List of enzymes */}
      <div className="w-full md:w-80 shrink-0 border-r border-strand-muted/10 flex flex-col p-4 bg-strand-bg/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-strand-text flex items-center gap-2">
            <Scissors size={14} className="text-strand-g" /> Enzymes
          </h2>
          <span className="text-[10px] font-mono text-strand-muted bg-strand-panel px-2 py-1 rounded">
            {hits.length} total sites
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {enzymeSummary.length === 0 ? (
            <p className="text-[11px] font-mono text-strand-muted text-center mt-10">
              No sites found.
            </p>
          ) : (
            enzymeSummary.map((enzyme) => {
              const isExpanded = expandedEnzyme === enzyme.name;
              return (
                <div key={enzyme.name} className="bg-strand-panel rounded-lg border border-strand-muted/10 overflow-hidden">
                  <button
                    onClick={() => setExpandedEnzyme(isExpanded ? null : enzyme.name)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-strand-panel/80 transition-colors text-left"
                  >
                    <span className="text-xs font-mono font-semibold text-strand-text w-16">{enzyme.name}</span>
                    <span className="text-[10px] font-mono text-strand-muted flex-1">{enzyme.site}</span>
                    <span className="text-[10px] font-mono text-strand-muted font-bold mr-2">{enzyme.hits.length}×</span>
                    {isExpanded ? <ChevronUp size={12} className="text-strand-muted" /> : <ChevronDown size={12} className="text-strand-muted" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-2 pt-1 space-y-1 border-t border-strand-muted/10">
                      {enzyme.hits.map((hit, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] font-mono text-strand-muted py-0.5">
                          <span>pos {hit.position + 1}</span>
                          <span className="text-strand-g">cut {hit.cutPosition + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right side: Visual Map */}
      <div className="flex-1 min-h-0 bg-strand-bg relative overflow-y-auto p-4" ref={containerRef}>
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
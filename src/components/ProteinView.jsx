import { useRef, useEffect, useState, useMemo } from 'react';
import { Search, X, ZoomIn, ZoomOut } from 'lucide-react';
import { translateSequence, AMINO_GROUPS } from '../utils/sequence';

// Color palette per chemical group — matches bioinformatics convention
const GROUP_COLORS = {
  hydrophobic: '#00E5A0', // green
  start: '#7CFFB2', // bright green
  polar: '#4FA8FF', // blue
  acidic: '#FF5470', // coral
  basic: '#FFD23F', // amber
  stop: '#5C6B7A', // muted gray
  unknown: '#2A3440', // dark gray
};

const BASE_CELL = 18;
const BASE_GAP = 3;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;

export default function ProteinView({ sequence }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1.0);

  const proteins = useMemo(() => translateSequence(sequence), [sequence]);

  // All match indices for the AA-level search
  const matches = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toUpperCase();
    const result = [];
    for (let i = 0; i <= proteins.length - q.length; i++) {
      let hit = true;
      for (let j = 0; j < q.length; j++) {
        if (proteins[i + j]?.aa !== q[j]) { hit = false; break; }
      }
      if (hit) result.push(i);
    }
    return result;
  }, [proteins, searchQuery]);

  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  useEffect(() => { setActiveMatchIndex(0); }, [searchQuery]);
  useEffect(() => { setSelectedIndex(null); setSearchQuery(''); }, [sequence]);

  const dims = useMemo(() => {
    const cell = Math.max(8, Math.round(BASE_CELL * zoom));
    const gap = Math.max(1, Math.round(BASE_GAP * zoom));
    const rowHeight = cell + gap;
    const rulerWidth = Math.max(42, Math.round(46 * zoom));
    const rulerPadding = Math.max(4, Math.round(8 * zoom));
    const fontSize = Math.max(9, Math.round(11 * zoom));
    return { cell, gap, rowHeight, rulerWidth, rulerPadding, fontSize };
  }, [zoom]);

  // =====================================================
  // DRAWING
  // =====================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const style = window.getComputedStyle(container);
      const paddingLeft = parseFloat(style.paddingLeft);
      const paddingRight = parseFloat(style.paddingRight);
      const availableWidth = container.clientWidth - paddingLeft - paddingRight;
      if (availableWidth <= 0) return;

      const { cell, gap, rowHeight, rulerWidth, rulerPadding, fontSize } = dims;

      const gridWidth = availableWidth - rulerWidth;
      const colsToDraw = Math.max(1, Math.floor((gridWidth - rulerPadding) / (cell + gap)));
      const rows = Math.ceil(proteins.length / colsToDraw) || 1;
      const contentHeight = rows * rowHeight;
      const totalHeight = Math.max(contentHeight, container.clientHeight);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = availableWidth * dpr;
      canvas.height = totalHeight * dpr;
      canvas.style.width = `${availableWidth}px`;
      canvas.style.height = `${totalHeight}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, availableWidth, totalHeight);

      if (proteins.length === 0) {
        ctx.fillStyle = '#5C6B7A';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No amino acids to display...', availableWidth / 2, totalHeight / 2);
        return;
      }

      // Ruler — position in amino acids (1-indexed)
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      for (let row = 0; row < rows; row++) {
        const y = row * rowHeight;
        const startPos = row * colsToDraw + 1;
        ctx.fillStyle = '#5C6B7A';
        ctx.fillText(String(startPos), rulerWidth - rulerPadding, y + cell / 2);
      }
      ctx.fillStyle = '#1A222C';
      ctx.fillRect(rulerWidth - 1, 0, 1, totalHeight);

      // Amino acids
      for (let i = 0; i < proteins.length; i++) {
        const { aa } = proteins[i];
        const group = AMINO_GROUPS[aa] || 'unknown';
        const color = GROUP_COLORS[group];
        const row = Math.floor(i / colsToDraw);
        const col = i % colsToDraw;
        const x = rulerWidth + col * (cell + gap);
        const y = row * rowHeight;

        // Block
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, cell, cell, 3);
        ctx.fill();

        // Letter inside (only when big enough to read)
        if (cell >= 12) {
          ctx.fillStyle = group === 'unknown' ? '#5C6B7A' : '#0A0E14';
          ctx.font = `bold ${Math.round(cell * 0.55)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(aa, x + cell / 2, y + cell / 2 + 1);
        }
      }

      // Match rings
      matches.forEach((matchStart, idx) => {
        const isActive = idx === activeMatchIndex;
        for (let offset = 0; offset < searchQuery.length; offset++) {
          const i = matchStart + offset;
          if (i >= proteins.length) break;
          const row = Math.floor(i / colsToDraw);
          const col = i % colsToDraw;
          const x = rulerWidth + col * (cell + gap);
          const y = row * rowHeight;
          ctx.strokeStyle = isActive ? '#E8EDF2' : '#5C6B7A';
          ctx.lineWidth = isActive ? 2 : 1.5;
          ctx.beginPath();
          ctx.roundRect(x - 1, y - 1, cell + 2, cell + 2, 4);
          ctx.stroke();
        }
      });

      // Selection ring
      if (selectedIndex !== null && selectedIndex < proteins.length) {
        const row = Math.floor(selectedIndex / colsToDraw);
        const col = selectedIndex % colsToDraw;
        const x = rulerWidth + col * (cell + gap);
        const y = row * rowHeight;
        ctx.strokeStyle = '#E8EDF2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, cell + 4, cell + 4, 5);
        ctx.stroke();
      }
    };

    draw();
    const rafId = requestAnimationFrame(draw);
    const observer = new ResizeObserver(draw);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [proteins, selectedIndex, matches, activeMatchIndex, searchQuery, dims]);

  // =====================================================
  // CLICK HANDLER
  // =====================================================
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || proteins.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    if (clickX < dims.rulerWidth) return;

    const style = window.getComputedStyle(containerRef.current);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const availableWidth = containerRef.current.clientWidth - paddingLeft - paddingRight;
    const gridWidth = availableWidth - dims.rulerWidth;
    const colsToDraw = Math.max(1, Math.floor((gridWidth - dims.rulerPadding) / (dims.cell + dims.gap)));

    const gridX = clickX - dims.rulerWidth;
    const col = Math.floor(gridX / (dims.cell + dims.gap));
    const row = Math.floor(clickY / dims.rowHeight);

    if (col < 0 || col >= colsToDraw || row < 0) return;
    const idx = row * colsToDraw + col;
    if (idx >= proteins.length) return;
    setSelectedIndex(idx);
  };

  const changeZoom = (delta) => {
    setZoom((z) => {
      const next = Math.round((z + delta) * 10) / 10;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  };

  // =====================================================
  // DERIVED
  // =====================================================
  const selected = selectedIndex !== null ? proteins[selectedIndex] : null;
  const selectedGroup = selected ? AMINO_GROUPS[selected.aa] || 'unknown' : null;
  const hasMatches = matches.length > 0;
  const noMatches = searchQuery.length > 0 && matches.length === 0;

  return (
    <div className="h-full bg-strand-panel rounded-2xl p-3 border border-strand-muted/10 flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 mb-2">
        <h2 className="text-sm font-medium text-strand-text shrink-0">Protein View</h2>

        {/* Zoom */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-strand-bg rounded-lg px-2 py-1">
          <button
            onClick={() => changeZoom(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            className="text-strand-muted hover:text-strand-text disabled:opacity-30 transition-colors shrink-0"
          >
            <ZoomOut size={12} />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 min-w-0 h-1 accent-strand-a cursor-pointer"
          />
          <button
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            className="text-strand-muted hover:text-strand-text disabled:opacity-30 transition-colors shrink-0"
          >
            <ZoomIn size={12} />
          </button>
          <span className="text-[10px] font-mono text-strand-muted shrink-0 w-8 text-right">
            {zoom.toFixed(1)}×
          </span>
        </div>

        <span className="text-[10px] font-mono text-strand-muted bg-strand-bg px-1.5 py-1 rounded shrink-0">
          {proteins.length} aa
        </span>
      </div>

      {/* Search */}
      <div className="shrink-0 mb-2">
        <div className="flex items-center gap-2 bg-strand-bg rounded-lg px-2.5 py-1.5 border border-strand-muted/10 focus-within:border-strand-a/50 transition-colors">
          <Search size={12} className="text-strand-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY*?]/g, ''))}
            placeholder="Search amino acid motif (e.g. MKT)"
            className="flex-1 bg-transparent text-strand-text font-mono text-xs focus:outline-none placeholder:text-strand-muted/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-strand-muted shrink-0">
              <X size={12} />
            </button>
          )}
        </div>
        {searchQuery.length > 0 && (
          <div className="flex items-center justify-between mt-1 px-0.5">
            <span className={`text-[10px] font-mono ${noMatches ? 'text-strand-t' : 'text-strand-a'}`}>
              {noMatches ? 'No matches' : `${activeMatchIndex + 1} / ${matches.length}`}
            </span>
            {hasMatches && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setActiveMatchIndex((i) => (i - 1 + matches.length) % matches.length)}
                  className="px-1.5 py-0.5 rounded bg-strand-bg text-strand-text text-[10px] font-mono"
                >
                  ←
                </button>
                <button
                  onClick={() => setActiveMatchIndex((i) => (i + 1) % matches.length)}
                  className="px-1.5 py-0.5 rounded bg-strand-bg text-strand-text text-[10px] font-mono"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full rounded-xl bg-strand-bg p-2 overflow-y-auto overflow-x-hidden"
      >
        <canvas ref={canvasRef} onClick={handleClick} className="block cursor-pointer" />
      </div>

      {/* Detail strip */}
      <div className="shrink-0 mt-2">
        {selectedIndex === null ? (
          <p className="text-[10px] text-strand-muted font-mono text-center py-1">
            Tap any amino acid to inspect it
          </p>
        ) : (
          <div className="bg-strand-bg rounded-xl p-2 border border-strand-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs"
                  style={{
                    backgroundColor: GROUP_COLORS[selectedGroup] || '#2A3440',
                    color: selectedGroup === 'unknown' ? '#E8EDF2' : '#0A0E14',
                  }}
                >
                  {selected.aa}
                </div>
                <div>
                  <p className="text-[10px] text-strand-muted font-mono leading-tight">
                    Residue {selectedIndex + 1} · Codon {selected.codon}
                  </p>
                  <p className="text-[11px] font-medium text-strand-text leading-tight capitalize">
                    {selectedGroup}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIndex(null)}
                className="text-[10px] text-strand-muted font-mono"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
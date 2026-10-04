import { useRef, useEffect, useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, X, Target } from 'lucide-react';
import { findORFs } from '../utils/sequence';

const BASE_COLORS = {
  A: '#00E5A0', T: '#FF5470', C: '#4FA8FF', G: '#FFD23F',
  N: '#2A3440',
  R: '#5C6B7A', Y: '#5C6B7A', S: '#5C6B7A', W: '#5C6B7A',
  K: '#5C6B7A', M: '#5C6B7A', B: '#5C6B7A', D: '#5C6B7A',
  H: '#5C6B7A', V: '#5C6B7A', '-': '#1A222C',
};

const CODING_BASES = new Set(['A', 'T', 'C', 'G']);
const CELL_SIZE = 14;
const GAP = 2;
const ROW_HEIGHT = CELL_SIZE + GAP;
const ORF_BAR_HEIGHT = 4;
const BASES_PER_ROW = 60;

const RULER_WIDTH = 48;
const RULER_PADDING_RIGHT = 8;
const TICK_HEIGHT_SMALL = 3;
const TICK_HEIGHT_LARGE = 6;

const findAllMatches = (sequence, query) => {
  if (!query || sequence.length === 0) return [];
  const matches = [];
  const q = query.toUpperCase();
  for (let i = 0; i <= sequence.length - q.length; i++) {
    if (sequence.slice(i, i + q.length) === q) matches.push(i);
  }
  return matches;
};

export default function SequenceCanvas({ sequence }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [showORFs, setShowORFs] = useState(false);

  const matches = useMemo(() => findAllMatches(sequence, searchQuery), [sequence, searchQuery]);
  const orfs = useMemo(() => findORFs(sequence), [sequence]);

  useEffect(() => {
    setSelectedIndex(null);
    setSearchQuery('');
    setActiveMatchIndex(0);
  }, [sequence]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery]);

  // =====================================================
  // DRAWING (with ResizeObserver for live resize support)
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

      const gridWidth = availableWidth - RULER_WIDTH;
      const colsToDraw = Math.min(
        BASES_PER_ROW,
        Math.floor((gridWidth - RULER_PADDING_RIGHT) / (CELL_SIZE + GAP))
      );

      const rowHeightWithORF = ROW_HEIGHT + (showORFs ? ORF_BAR_HEIGHT + 2 : 0);
      const rows = Math.ceil(sequence.length / colsToDraw) || 1;
      const totalHeight = Math.max(rows * rowHeightWithORF, 80);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = availableWidth * dpr;
      canvas.height = totalHeight * dpr;
      canvas.style.width = `${availableWidth}px`;
      canvas.style.height = `${totalHeight}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, availableWidth, totalHeight);

      if (sequence.length === 0) {
        ctx.fillStyle = '#5C6B7A';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Awaiting sequence data...', availableWidth / 2, totalHeight / 2);
        return;
      }

      // Ruler
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      for (let row = 0; row < rows; row++) {
        const y = row * rowHeightWithORF;
        const startPos = row * colsToDraw + 1;
        ctx.fillStyle = '#5C6B7A';
        ctx.fillText(String(startPos), RULER_WIDTH - RULER_PADDING_RIGHT, y + CELL_SIZE / 2);
        for (let col = 0; col < colsToDraw; col++) {
          const baseIndex = row * colsToDraw + col;
          if (baseIndex >= sequence.length) break;
          const tickX = RULER_WIDTH + col * (CELL_SIZE + GAP) + CELL_SIZE / 2;
          const isMajorTick = (baseIndex + 1) % 10 === 0;
          const tickHeight = isMajorTick ? TICK_HEIGHT_LARGE : TICK_HEIGHT_SMALL;
          ctx.fillStyle = isMajorTick ? '#5C6B7A' : '#2A3440';
          ctx.fillRect(tickX, y + CELL_SIZE - tickHeight, 1, tickHeight);
        }
      }
      ctx.fillStyle = '#1A222C';
      ctx.fillRect(RULER_WIDTH - 1, 0, 1, totalHeight);

      // Bases
      for (let i = 0; i < sequence.length; i++) {
        const base = sequence[i];
        const color = BASE_COLORS[base] || '#2A3440';
        const row = Math.floor(i / colsToDraw);
        const col = i % colsToDraw;
        const x = RULER_WIDTH + col * (CELL_SIZE + GAP);
        const y = row * rowHeightWithORF;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 3);
        ctx.fill();
      }

      // ORF underlines
      if (showORFs && orfs.length > 0) {
        orfs.forEach((orf) => {
          let segmentStart = orf.start;
          while (segmentStart < orf.end) {
            const row = Math.floor(segmentStart / colsToDraw);
            const rowEndBase = (row + 1) * colsToDraw;
            const segmentEnd = Math.min(orf.end, rowEndBase);
            const colStart = segmentStart % colsToDraw;
            const colEnd = (segmentEnd - 1) % colsToDraw;
            const xStart = RULER_WIDTH + colStart * (CELL_SIZE + GAP);
            const xEnd = RULER_WIDTH + colEnd * (CELL_SIZE + GAP) + CELL_SIZE;
            const y = row * rowHeightWithORF + CELL_SIZE + 2;
            ctx.fillStyle = 'rgba(0, 229, 160, 0.25)';
            ctx.fillRect(xStart, y - 1, xEnd - xStart, ORF_BAR_HEIGHT + 2);
            ctx.fillStyle = '#00E5A0';
            ctx.fillRect(xStart, y, xEnd - xStart, ORF_BAR_HEIGHT);
            segmentStart = segmentEnd;
          }
        });
      }

      // Search match rings
      matches.forEach((matchStart, idx) => {
        const isActive = idx === activeMatchIndex;
        for (let offset = 0; offset < searchQuery.length; offset++) {
          const baseIndex = matchStart + offset;
          if (baseIndex >= sequence.length) break;
          const row = Math.floor(baseIndex / colsToDraw);
          const col = baseIndex % colsToDraw;
          const x = RULER_WIDTH + col * (CELL_SIZE + GAP);
          const y = row * rowHeightWithORF;
          ctx.strokeStyle = isActive ? '#E8EDF2' : '#5C6B7A';
          ctx.lineWidth = isActive ? 2 : 1.5;
          ctx.beginPath();
          ctx.roundRect(x - 1, y - 1, CELL_SIZE + 2, CELL_SIZE + 2, 4);
          ctx.stroke();
        }
      });

      // Selected base highlight
      if (selectedIndex !== null && selectedIndex < sequence.length) {
        const row = Math.floor(selectedIndex / colsToDraw);
        const col = selectedIndex % colsToDraw;
        const x = RULER_WIDTH + col * (CELL_SIZE + GAP);
        const y = row * rowHeightWithORF;
        ctx.strokeStyle = '#00E5A0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, CELL_SIZE + 4, CELL_SIZE + 4, 5);
        ctx.stroke();
      }
    };

    draw();

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [sequence, selectedIndex, matches, activeMatchIndex, searchQuery, showORFs, orfs]);

  // =====================================================
  // AUTO-SCROLL TO ACTIVE MATCH
  // =====================================================
  useEffect(() => {
    if (matches.length === 0) return;
    const activeMatch = matches[activeMatchIndex];
    if (activeMatch === undefined) return;
    const container = containerRef.current;
    if (!container) return;

    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const availableWidth = container.clientWidth - paddingLeft - paddingRight;
    const gridWidth = availableWidth - RULER_WIDTH;
    const colsToDraw = Math.min(
      BASES_PER_ROW,
      Math.floor((gridWidth - RULER_PADDING_RIGHT) / (CELL_SIZE + GAP))
    );
    const rowHeightWithORF = ROW_HEIGHT + (showORFs ? ORF_BAR_HEIGHT + 2 : 0);
    const row = Math.floor(activeMatch / colsToDraw);
    const targetScrollTop = row * rowHeightWithORF;
    const viewportHeight = container.clientHeight;
    const targetScroll = Math.max(0, targetScrollTop - viewportHeight / 2 + rowHeightWithORF);
    container.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, [activeMatchIndex, matches, showORFs]);

  // =====================================================
  // CLICK HANDLER
  // =====================================================
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || sequence.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    if (clickX < RULER_WIDTH) return;

    const style = window.getComputedStyle(containerRef.current);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const availableWidth = containerRef.current.clientWidth - paddingLeft - paddingRight;
    const gridWidth = availableWidth - RULER_WIDTH;
    const colsToDraw = Math.min(
      BASES_PER_ROW,
      Math.floor((gridWidth - RULER_PADDING_RIGHT) / (CELL_SIZE + GAP))
    );
    const rowHeightWithORF = ROW_HEIGHT + (showORFs ? ORF_BAR_HEIGHT + 2 : 0);

    const gridX = clickX - RULER_WIDTH;
    const col = Math.floor(gridX / (CELL_SIZE + GAP));
    const row = Math.floor(clickY / rowHeightWithORF);

    if (col < 0 || col >= colsToDraw || row < 0) return;
    const baseIndex = row * colsToDraw + col;
    if (baseIndex >= sequence.length) return;
    setSelectedIndex(baseIndex);
  };

  const goToPrevMatch = () => {
    if (matches.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  };
  const goToNextMatch = () => {
    if (matches.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % matches.length);
  };

  // =====================================================
  // DERIVED DATA
  // =====================================================
  const selectedBase = selectedIndex !== null ? sequence[selectedIndex] : null;
  const isCoding = selectedBase ? CODING_BASES.has(selectedBase) : false;
  const selectedORF = useMemo(() => {
    if (selectedIndex === null) return null;
    return orfs.find((o) => selectedIndex >= o.start && selectedIndex < o.end) || null;
  }, [selectedIndex, orfs]);
  const contextStart = Math.max(0, (selectedIndex ?? 0) - 2);
  const contextEnd = Math.min(sequence.length, (selectedIndex ?? 0) + 3);
  const contextLeft = selectedIndex !== null ? sequence.slice(contextStart, selectedIndex) : '';
  const contextRight = selectedIndex !== null ? sequence.slice(selectedIndex + 1, contextEnd) : '';
  const hasMatches = matches.length > 0;
  const noMatches = searchQuery.length > 0 && matches.length === 0;

  return (
    <div className="h-full bg-strand-panel rounded-2xl p-3 border border-strand-muted/10 flex flex-col">
      {/* Header row */}
      <div className="shrink-0 flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-strand-text">Sequence Viewer</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowORFs((v) => !v)}
            className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded transition-colors ${
              showORFs
                ? 'bg-strand-a/20 text-strand-a'
                : 'bg-strand-bg text-strand-muted hover:text-strand-text'
            }`}
          >
            <Target size={10} />
            ORFs
            {showORFs && orfs.length > 0 && <span>· {orfs.length}</span>}
          </button>
          <span className="text-[10px] font-mono text-strand-muted bg-strand-bg px-1.5 py-1 rounded">
            {BASES_PER_ROW} bp/row
          </span>
        </div>
      </div>

      {/* Search row */}
      <div className="shrink-0 mb-2">
        <div className="flex items-center gap-2 bg-strand-bg rounded-lg px-2.5 py-1.5 border border-strand-muted/10 focus-within:border-strand-a/50 transition-colors">
          <Search size={12} className="text-strand-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value.toUpperCase().replace(/[^ATCGNRYSWKMBDHV-]/g, ''))
            }
            placeholder="Search motif (e.g. ATG)"
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
                <button onClick={goToPrevMatch} className="p-1 rounded bg-strand-bg text-strand-text">
                  <ChevronUp size={11} />
                </button>
                <button onClick={goToNextMatch} className="p-1 rounded bg-strand-bg text-strand-text">
                  <ChevronDown size={11} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Canvas wrapper — flex-1, scrolls internally */}
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
            Tap any base to inspect it
          </p>
        ) : (
          <div className="bg-strand-bg rounded-xl p-2 border border-strand-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs"
                  style={{
                    backgroundColor: BASE_COLORS[selectedBase] || '#2A3440',
                    color: isCoding ? '#0A0E14' : '#E8EDF2',
                  }}
                >
                  {selectedBase}
                </div>
                <div>
                  <p className="text-[10px] text-strand-muted font-mono leading-tight">
                    Pos {selectedIndex + 1}
                    {selectedORF && ` · ORF ${selectedORF.length}bp`}
                  </p>
                  <p className="text-[11px] font-medium text-strand-text leading-tight">
                    {selectedORF ? `ORF: ${selectedORF.start + 1}–${selectedORF.end}` : isCoding ? 'Coding' : 'Non-coding'}
                  </p>
                </div>
              </div>
              <div className="font-mono text-xs">
                <span className="text-strand-muted">{contextLeft}</span>
                <span
                  className="px-1 rounded font-bold mx-0.5"
                  style={{
                    backgroundColor: BASE_COLORS[selectedBase] || '#2A3440',
                    color: isCoding ? '#0A0E14' : '#E8EDF2',
                  }}
                >
                  {selectedBase}
                </span>
                <span className="text-strand-muted">{contextRight}</span>
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
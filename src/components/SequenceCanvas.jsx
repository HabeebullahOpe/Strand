import { useRef, useEffect, useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, X, Target } from 'lucide-react';
import { findORFs } from '../utils/sequence';

const BASE_COLORS = {
  A: '#00E5A0',
  T: '#FF5470',
  C: '#4FA8FF',
  G: '#FFD23F',
  N: '#2A3440',
  R: '#5C6B7A', Y: '#5C6B7A', S: '#5C6B7A', W: '#5C6B7A',
  K: '#5C6B7A', M: '#5C6B7A', B: '#5C6B7A', D: '#5C6B7A',
  H: '#5C6B7A', V: '#5C6B7A',
  '-': '#1A222C',
};

const CODING_BASES = new Set(['A', 'T', 'C', 'G']);

const CELL_SIZE = 14;
const GAP = 2;
const ROW_HEIGHT = CELL_SIZE + GAP;
const ORF_BAR_HEIGHT = 4;       // height of the ORF underline bar
const BASES_PER_ROW = 60;
const MAX_VIEWER_HEIGHT = 240;

const RULER_WIDTH = 48;
const RULER_PADDING_RIGHT = 8;
const TICK_HEIGHT_SMALL = 3;
const TICK_HEIGHT_LARGE = 6;

const findAllMatches = (sequence, query) => {
  if (!query || query.length === 0 || sequence.length === 0) return [];
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

  const matches = useMemo(
    () => findAllMatches(sequence, searchQuery),
    [sequence, searchQuery]
  );

  // Compute ORFs once per sequence
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
  // DRAWING
  // =====================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const style = window.getComputedStyle(container);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const availableWidth = container.clientWidth - paddingLeft - paddingRight;

    const gridWidth = availableWidth - RULER_WIDTH;
    const colsToDraw = Math.min(
      BASES_PER_ROW,
      Math.floor((gridWidth - RULER_PADDING_RIGHT) / (CELL_SIZE + GAP))
    );

    // Reserve extra vertical space at the bottom of each row when ORFs are on
    const rowHeightWithORF = ROW_HEIGHT + (showORFs ? ORF_BAR_HEIGHT + 2 : 0);
    const rows = Math.ceil(sequence.length / colsToDraw) || 1;
    const totalHeight = Math.max(rows * rowHeightWithORF, 80);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = availableWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${availableWidth}px`;
    canvas.style.height = `${totalHeight}px`;

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

    // --- Ruler ---
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

    // --- Bases ---
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

    // --- ORF underlines ---
    if (showORFs && orfs.length > 0) {
      orfs.forEach((orf) => {
        // Split the ORF into per-row segments
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

          // Glow-ish bar: main color + translucent halo
          ctx.fillStyle = 'rgba(0, 229, 160, 0.25)';
          ctx.fillRect(xStart, y - 1, xEnd - xStart, ORF_BAR_HEIGHT + 2);

          ctx.fillStyle = '#00E5A0';
          ctx.fillRect(xStart, y, xEnd - xStart, ORF_BAR_HEIGHT);

          segmentStart = segmentEnd;
        }
      });
    }

    // --- Search match rings ---
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

    // --- Selected base highlight ---
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
  // CLICK
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

  // Find which ORF (if any) the selected base falls inside
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
    <div className="bg-strand-panel rounded-3xl p-4 shadow-lg border border-strand-muted/10">
      {/* --- Header --- */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-lg font-medium text-strand-text">Sequence Viewer</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowORFs((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md transition-colors ${
              showORFs
                ? 'bg-strand-a/20 text-strand-a'
                : 'bg-strand-bg text-strand-muted hover:text-strand-text'
            }`}
            title="Toggle ORF highlighting"
          >
            <Target size={12} />
            ORFs
            {showORFs && orfs.length > 0 && <span>· {orfs.length}</span>}
          </button>
          <span className="text-xs font-mono text-strand-muted bg-strand-bg px-2 py-1 rounded-md">
            {BASES_PER_ROW} bp/row
          </span>
        </div>
      </div>

      {/* --- Search --- */}
      <div className="mb-3 px-2">
        <div className="flex items-center gap-2 bg-strand-bg rounded-xl px-3 py-2 border border-strand-muted/10 focus-within:border-strand-a/50 transition-colors">
          <Search size={16} className="text-strand-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value.toUpperCase().replace(/[^ATCGNRYSWKMBDHV-]/g, '')
              )
            }
            placeholder="Search motif (e.g. ATG)"
            className="flex-1 bg-transparent text-strand-text font-mono text-sm focus:outline-none placeholder:text-strand-muted/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-strand-muted hover:text-strand-text transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {searchQuery.length > 0 && (
          <div className="flex items-center justify-between mt-2 px-1">
            <span
              className={`text-xs font-mono ${
                noMatches ? 'text-strand-t' : hasMatches ? 'text-strand-a' : 'text-strand-muted'
              }`}
            >
              {noMatches
                ? 'No matches'
                : `${activeMatchIndex + 1} of ${matches.length} match${matches.length > 1 ? 'es' : ''}`}
            </span>
            {hasMatches && (
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrevMatch}
                  className="p-1.5 rounded-md bg-strand-panel hover:bg-strand-panel/60 text-strand-text transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={goToNextMatch}
                  className="p-1.5 rounded-md bg-strand-panel hover:bg-strand-panel/60 text-strand-text transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Canvas --- */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl bg-strand-bg p-3 overflow-y-auto overflow-x-hidden"
        style={{ maxHeight: `${MAX_VIEWER_HEIGHT}px` }}
      >
        <canvas ref={canvasRef} onClick={handleClick} className="block cursor-pointer" />
      </div>

      {/* --- Detail strip --- */}
      <div className="mt-3 px-2">
        {selectedIndex === null ? (
          <p className="text-xs text-strand-muted font-mono text-center py-2">
            Click any base to inspect it
          </p>
        ) : (
          <div className="bg-strand-bg rounded-2xl p-3 space-y-2 border border-strand-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
                  style={{
                    backgroundColor: BASE_COLORS[selectedBase] || '#2A3440',
                    color: isCoding ? '#0A0E14' : '#E8EDF2',
                  }}
                >
                  {selectedBase}
                </div>
                <div>
                  <p className="text-xs text-strand-muted font-mono">
                    Position {selectedIndex + 1}
                  </p>
                  <p className="text-sm font-medium text-strand-text">
                    {selectedORF
                      ? `ORF · ${selectedORF.length}bp`
                      : isCoding
                      ? 'Coding base'
                      : 'Non-coding / Unknown'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIndex(null)}
                className="text-xs text-strand-muted hover:text-strand-text font-mono transition-colors"
              >
                clear
              </button>
            </div>

            {selectedORF && (
              <p className="text-xs font-mono text-strand-a">
                ORF spans position {selectedORF.start + 1} → {selectedORF.end}
              </p>
            )}

            <div className="flex items-center gap-1 font-mono text-sm">
              <span className="text-strand-muted text-xs mr-2">context</span>
              <span className="text-strand-muted">{contextLeft}</span>
              <span
                className="px-1.5 py-0.5 rounded font-bold"
                style={{
                  backgroundColor: BASE_COLORS[selectedBase] || '#2A3440',
                  color: isCoding ? '#0A0E14' : '#E8EDF2',
                }}
              >
                {selectedBase}
              </span>
              <span className="text-strand-muted">{contextRight}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useRef, useEffect, useState, useMemo } from 'react';
import {
  Search, ChevronUp, ChevronDown, X, Target,
  ZoomIn, ZoomOut, PanelLeft, Activity, Tag,
} from 'lucide-react';
import { findORFs, nextAnnotationColor } from '../utils/sequence';
import GCTrack from './GCTrack';
import ReverseComplementButton from './ReverseComplementButton';

const BASE_COLORS = {
  A: '#00E5A0', T: '#FF5470', C: '#4FA8FF', G: '#FFD23F',
  N: '#2A3440',
  R: '#5C6B7A', Y: '#5C6B7A', S: '#5C6B7A', W: '#5C6B7A',
  K: '#5C6B7A', M: '#5C6B7A', B: '#5C6B7A', D: '#5C6B7A',
  H: '#5C6B7A', V: '#5C6B7A', '-': '#1A222C',
};

const CODING_BASES = new Set(['A', 'T', 'C', 'G']);

const BASE_CELL = 14;
const BASE_GAP = 2;
const ORF_BAR_HEIGHT = 4;
const ANNOTATION_BAR_HEIGHT = 8;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;

const findAllMatches = (sequence, query) => {
  if (!query || sequence.length === 0) return [];
  const matches = [];
  const q = query.toUpperCase();
  for (let i = 0; i <= sequence.length - q.length; i++) {
    if (sequence.slice(i, i + q.length) === q) matches.push(i);
  }
  return matches;
};

export default function SequenceCanvas({
  sequence,
  collapsed,
  onToggleCollapse,
  annotations = [],
  onAddAnnotation,
  selectedAnnotationId,
  onSelectAnnotation,
  onReverseComplement,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  const [selectedIndex, setSelectedIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [showORFs, setShowORFs] = useState(false);
  const [showGC, setShowGC] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [orfFrame, setOrfFrame] = useState(0);

  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [pendingAnnotation, setPendingAnnotation] = useState(null);
  const [annotationName, setAnnotationName] = useState('');

  const matches = useMemo(() => findAllMatches(sequence, searchQuery), [sequence, searchQuery]);
  const orfs = useMemo(() => findORFs(sequence, 30, orfFrame), [sequence, orfFrame]);

  useEffect(() => {
    setSelectedIndex(null);
    setSearchQuery('');
    setActiveMatchIndex(0);
  }, [sequence]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery]);

  const dims = useMemo(() => {
    const cell = Math.max(6, Math.round(BASE_CELL * zoom));
    const gap = Math.max(1, Math.round(BASE_GAP * zoom));
    const rowHeight = cell + gap;
    const rulerWidth = Math.max(38, Math.round(42 * zoom));
    const rulerPadding = Math.max(4, Math.round(8 * zoom));
    const tickSmall = Math.max(2, Math.round(3 * zoom));
    const tickLarge = Math.max(4, Math.round(6 * zoom));
    const rulerFontSize = Math.max(8, Math.round(10 * zoom));
    const orfBarHeight = Math.max(3, Math.round(ORF_BAR_HEIGHT * zoom));
    const annotationBarHeight = Math.max(5, Math.round(ANNOTATION_BAR_HEIGHT * zoom));
    return {
      cell, gap, rowHeight, rulerWidth, rulerPadding,
      tickSmall, tickLarge, rulerFontSize, orfBarHeight, annotationBarHeight,
    };
  }, [zoom]);

  const [colsToDraw, setColsToDraw] = useState(60);

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

      const {
        cell, gap, rowHeight, rulerWidth, rulerPadding, tickSmall, tickLarge,
        rulerFontSize, orfBarHeight, annotationBarHeight,
      } = dims;

      const gridWidth = availableWidth - rulerWidth;
      const cols = Math.max(1, Math.floor((gridWidth - rulerPadding) / (cell + gap)));
      setColsToDraw(cols);

      const annotationStripHeight = showAnnotations && annotations.length > 0 ? annotationBarHeight + 4 : 0;
      const rowHeightWithExtras =
        rowHeight + (showORFs ? orfBarHeight + 2 : 0) + annotationStripHeight;
      const rows = Math.ceil(sequence.length / cols) || 1;
      const contentHeight = rows * rowHeightWithExtras;
      const totalHeight = Math.max(contentHeight, container.clientHeight);

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
      ctx.font = `${rulerFontSize}px "JetBrains Mono", monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      for (let row = 0; row < rows; row++) {
        const rowTop = row * rowHeightWithExtras;
        const baselineY = rowTop + annotationStripHeight;
        const startPos = row * cols + 1;
        ctx.fillStyle = '#5C6B7A';
        ctx.fillText(String(startPos), rulerWidth - rulerPadding, baselineY + cell / 2);

        for (let col = 0; col < cols; col++) {
          const baseIndex = row * cols + col;
          if (baseIndex >= sequence.length) break;
          const tickX = rulerWidth + col * (cell + gap) + cell / 2;
          const isMajorTick = (baseIndex + 1) % 10 === 0;
          const tickHeight = isMajorTick ? tickLarge : tickSmall;
          ctx.fillStyle = isMajorTick ? '#5C6B7A' : '#2A3440';
          ctx.fillRect(tickX, baselineY + cell - tickHeight, 1, tickHeight);
        }
      }
      ctx.fillStyle = '#1A222C';
      ctx.fillRect(rulerWidth - 1, 0, 1, totalHeight);

      // Bases
      const cornerRadius = Math.max(1, Math.round(3 * zoom));
      for (let i = 0; i < sequence.length; i++) {
        const base = sequence[i];
        const color = BASE_COLORS[base] || '#2A3440';
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = rulerWidth + col * (cell + gap);
        const y = row * rowHeightWithExtras + annotationStripHeight;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, cell, cell, cornerRadius);
        ctx.fill();
      }

      // Annotations strip
      if (showAnnotations && annotations.length > 0) {
        annotations.forEach((ann) => {
          const isSelected = ann.id === selectedAnnotationId;
          let segStart = ann.start;
          while (segStart < ann.end) {
            const row = Math.floor(segStart / cols);
            const rowEndBase = (row + 1) * cols;
            const segEnd = Math.min(ann.end, rowEndBase);
            const colStart = segStart % cols;
            const colEnd = (segEnd - 1) % cols;
            const xStart = rulerWidth + colStart * (cell + gap);
            const xEnd = rulerWidth + colEnd * (cell + gap) + cell;
            const y = row * rowHeightWithExtras + 1;

            ctx.fillStyle = ann.color;
            ctx.globalAlpha = isSelected ? 1 : 0.7;
            ctx.fillRect(xStart, y, xEnd - xStart, annotationBarHeight);
            ctx.globalAlpha = 1;

            if (isSelected) {
              ctx.strokeStyle = '#E8EDF2';
              ctx.lineWidth = 1;
              ctx.strokeRect(xStart - 0.5, y - 0.5, xEnd - xStart + 1, annotationBarHeight + 1);
            }
            segStart = segEnd;
          }
        });
      }

      // ORF underlines
      if (showORFs && orfs.length > 0) {
        orfs.forEach((orf) => {
          let segStart = orf.start;
          while (segStart < orf.end) {
            const row = Math.floor(segStart / cols);
            const rowEndBase = (row + 1) * cols;
            const segEnd = Math.min(orf.end, rowEndBase);
            const colStart = segStart % cols;
            const colEnd = (segEnd - 1) % cols;
            const xStart = rulerWidth + colStart * (cell + gap);
            const xEnd = rulerWidth + colEnd * (cell + gap) + cell;
            const y = row * rowHeightWithExtras + annotationStripHeight + cell + 2;
            ctx.fillStyle = 'rgba(0, 229, 160, 0.25)';
            ctx.fillRect(xStart, y - 1, xEnd - xStart, orfBarHeight + 2);
            ctx.fillStyle = '#00E5A0';
            ctx.fillRect(xStart, y, xEnd - xStart, orfBarHeight);
            segStart = segEnd;
          }
        });
      }

      // Drag preview
      if (dragStart !== null && dragCurrent !== null) {
        const lo = Math.min(dragStart, dragCurrent);
        const hi = Math.max(dragStart, dragCurrent);
        let segStart = lo;
        while (segStart <= hi) {
          const row = Math.floor(segStart / cols);
          const rowEndBase = (row + 1) * cols;
          const segEnd = Math.min(hi + 1, rowEndBase);
          const colStart = segStart % cols;
          const colEnd = (segEnd - 1) % cols;
          const xStart = rulerWidth + colStart * (cell + gap);
          const xEnd = rulerWidth + colEnd * (cell + gap) + cell;
          const y = row * rowHeightWithExtras + annotationStripHeight;
          ctx.fillStyle = 'rgba(0, 229, 160, 0.15)';
          ctx.fillRect(xStart, y, xEnd - xStart, cell);
          segStart = segEnd;
        }
      }

      // Search rings
      matches.forEach((matchStart, idx) => {
        const isActive = idx === activeMatchIndex;
        for (let offset = 0; offset < searchQuery.length; offset++) {
          const baseIndex = matchStart + offset;
          if (baseIndex >= sequence.length) break;
          const row = Math.floor(baseIndex / cols);
          const col = baseIndex % cols;
          const x = rulerWidth + col * (cell + gap);
          const y = row * rowHeightWithExtras + annotationStripHeight;
          ctx.strokeStyle = isActive ? '#E8EDF2' : '#5C6B7A';
          ctx.lineWidth = isActive ? 2 : 1.5;
          ctx.beginPath();
          ctx.roundRect(x - 1, y - 1, cell + 2, cell + 2, cornerRadius + 1);
          ctx.stroke();
        }
      });

      // Selected base
      if (selectedIndex !== null && selectedIndex < sequence.length) {
        const row = Math.floor(selectedIndex / cols);
        const col = selectedIndex % cols;
        const x = rulerWidth + col * (cell + gap);
        const y = row * rowHeightWithExtras + annotationStripHeight;
        ctx.strokeStyle = '#00E5A0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - 2, y - 2, cell + 4, cell + 4, cornerRadius + 2);
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
  }, [
    sequence, selectedIndex, matches, activeMatchIndex, searchQuery,
    showORFs, orfs, dims, annotations, showAnnotations, selectedAnnotationId,
    dragStart, dragCurrent,
  ]);

  useEffect(() => {
    if (matches.length === 0) return;
    const activeMatch = matches[activeMatchIndex];
    if (activeMatch === undefined) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    const annotationStripHeight = showAnnotations && annotations.length > 0 ? dims.annotationBarHeight + 4 : 0;
    const rowHeightWithExtras =
      dims.rowHeight + (showORFs ? dims.orfBarHeight + 2 : 0) + annotationStripHeight;
    const row = Math.floor(activeMatch / colsToDraw);
    const targetScrollTop = row * rowHeightWithExtras;
    const viewportHeight = scroll.clientHeight;
    const targetScroll = Math.max(0, targetScrollTop - viewportHeight / 2 + rowHeightWithExtras);
    scroll.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, [activeMatchIndex, matches, showORFs, dims, colsToDraw, annotations, showAnnotations]);

  const posFromEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    if (clickX < dims.rulerWidth) return null;

    const style = window.getComputedStyle(containerRef.current);
    const pl = parseFloat(style.paddingLeft);
    const pr = parseFloat(style.paddingRight);
    const availableWidth = containerRef.current.clientWidth - pl - pr;
    const gridWidth = availableWidth - dims.rulerWidth;
    const cols = Math.max(1, Math.floor((gridWidth - dims.rulerPadding) / (dims.cell + dims.gap)));
    const annotationStripHeight = showAnnotations && annotations.length > 0 ? dims.annotationBarHeight + 4 : 0;
    const rowHeightWithExtras =
      dims.rowHeight + (showORFs ? dims.orfBarHeight + 2 : 0) + annotationStripHeight;

    const gridX = clickX - dims.rulerWidth;
    const col = Math.floor(gridX / (dims.cell + dims.gap));
    const row = Math.floor((clickY - annotationStripHeight) / rowHeightWithExtras);
    if (col < 0 || col >= cols || row < 0) return null;
    const baseIndex = row * cols + col;
    if (baseIndex >= sequence.length) return null;
    return baseIndex;
  };

  const handleMouseDown = (e) => {
    if (!onAddAnnotation) return;
    const idx = posFromEvent(e);
    if (idx === null) return;
    setDragStart(idx);
    setDragCurrent(idx);
  };

  const handleMouseMove = (e) => {
    if (dragStart === null) return;
    const idx = posFromEvent(e);
    if (idx === null) return;
    setDragCurrent(idx);
  };

  const handleMouseUp = () => {
    if (dragStart === null || dragCurrent === null) return;
    const lo = Math.min(dragStart, dragCurrent);
    const hi = Math.max(dragStart, dragCurrent);

    if (hi - lo >= 2 && onAddAnnotation) {
      setPendingAnnotation({ start: lo, end: hi + 1 });
      setAnnotationName('');
    } else {
      setSelectedIndex(lo);
    }
    setDragStart(null);
    setDragCurrent(null);
  };

  const commitAnnotation = () => {
    if (!pendingAnnotation || !onAddAnnotation) return;
    const label = annotationName.trim() || `Region ${annotations.length + 1}`;
    onAddAnnotation({
      id: `ann_${Date.now()}`,
      start: pendingAnnotation.start,
      end: pendingAnnotation.end,
      label,
      color: nextAnnotationColor(annotations),
    });
    setPendingAnnotation(null);
    setAnnotationName('');
  };

  const changeZoom = (delta) => {
    setZoom((z) => {
      const next = Math.round((z + delta) * 10) / 10;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  };

  const selectedBase = selectedIndex !== null ? sequence[selectedIndex] : null;
  const isCoding = selectedBase ? CODING_BASES.has(selectedBase) : false;
  const hasMatches = matches.length > 0;
  const noMatches = searchQuery.length > 0 && matches.length === 0;

  return (
    <div className="h-full bg-strand-panel rounded-2xl p-3 border border-strand-muted/10 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 mb-2">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-strand-muted hover:text-strand-text transition-colors shrink-0 hidden md:flex items-center justify-center"
            title={collapsed ? 'Show input panel' : 'Hide input panel'}
          >
            <PanelLeft size={14} />
          </button>
        )}
        <h2 className="text-sm font-medium text-strand-text shrink-0">Sequence Viewer</h2>

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

        {onAddAnnotation && (
          <button
            onClick={() => setShowAnnotations((v) => !v)}
            className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded transition-colors shrink-0 ${showAnnotations
              ? 'bg-strand-a/20 text-strand-a'
              : 'bg-strand-bg text-strand-muted hover:text-strand-text'
              }`}
            title="Toggle annotations strip"
          >
            <Tag size={10} />
            {annotations.length}
          </button>
        )}

        <button
          onClick={() => setShowGC((v) => !v)}
          className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded transition-colors shrink-0 ${showGC ? 'bg-strand-a/20 text-strand-a' : 'bg-strand-bg text-strand-muted hover:text-strand-text'
            }`}
        >
          <Activity size={10} />
          GC
        </button>

        <button
          onClick={() => setShowORFs((v) => !v)}
          className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded transition-colors shrink-0 ${showORFs ? 'bg-strand-a/20 text-strand-a' : 'bg-strand-bg text-strand-muted hover:text-strand-text'
            }`}
        >
          <Target size={10} />
          ORFs
          {showORFs && orfs.length > 0 && <span>· {orfs.length}</span>}
        </button>

        <ReverseComplementButton
          onClick={onReverseComplement}
          disabled={!sequence || sequence.length === 0}
        />

        {showORFs && (
          <div className="shrink-0 flex bg-strand-bg rounded overflow-hidden">
            {[0, 1, 2].map((f) => (
              <button
                key={f}
                onClick={() => setOrfFrame(f)}
                className={`px-1.5 py-1 text-[9px] font-mono transition-colors ${orfFrame === f ? 'bg-strand-a/20 text-strand-a' : 'text-strand-muted hover:text-strand-text'
                  }`}
              >
                F{f + 1}
              </button>
            ))}
          </div>
        )}
      </div>

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
                <button onClick={() => setActiveMatchIndex((i) => (i - 1 + matches.length) % matches.length)} className="p-1 rounded bg-strand-bg text-strand-text">
                  <ChevronUp size={11} />
                </button>
                <button onClick={() => setActiveMatchIndex((i) => (i + 1) % matches.length)} className="p-1 rounded bg-strand-bg text-strand-text">
                  <ChevronDown size={11} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 w-full rounded-xl bg-strand-bg p-2 overflow-y-auto overflow-x-hidden"
      >
        {showGC && sequence.length > 0 && (
          <GCTrack sequence={sequence} dims={dims} colsToDraw={colsToDraw} />
        )}
        <div ref={containerRef} className="w-full">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="block cursor-crosshair select-none"
          />
        </div>
      </div>

      {pendingAnnotation && (
        <div className="shrink-0 mt-2 bg-strand-bg rounded-xl p-2 border border-strand-a/30 flex items-center gap-2">
          <Tag size={12} className="text-strand-a shrink-0" />
          <span className="text-[10px] font-mono text-strand-muted shrink-0">
            {pendingAnnotation.start + 1}–{pendingAnnotation.end}
          </span>
          <input
            autoFocus
            type="text"
            value={annotationName}
            onChange={(e) => setAnnotationName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAnnotation();
              if (e.key === 'Escape') setPendingAnnotation(null);
            }}
            placeholder="Region name..."
            className="flex-1 min-w-0 bg-strand-panel rounded px-2 py-1 text-xs text-strand-text font-mono focus:outline-none placeholder:text-strand-muted/50"
          />
          <button
            onClick={commitAnnotation}
            className="px-2 py-1 rounded bg-strand-a text-strand-bg text-[10px] font-mono"
          >
            Save
          </button>
          <button
            onClick={() => setPendingAnnotation(null)}
            className="p-1 rounded text-strand-muted hover:text-strand-text"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="shrink-0 mt-2">
        {selectedIndex === null ? (
          <p className="text-[10px] text-strand-muted font-mono text-center py-1">
            {onAddAnnotation ? 'Click to inspect · drag to annotate' : 'Click any base to inspect it'}
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
                  </p>
                  <p className="text-[11px] font-medium text-strand-text leading-tight">
                    {isCoding ? 'Coding' : 'Non-coding'}
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
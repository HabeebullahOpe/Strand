import { useRef, useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { diffSequences } from '../utils/sequence';
import { computeConsensus, ConsensusIndicator } from './ConsensusRow';

const BASE_COLORS = {
  A: '#00E5A0', T: '#FF5470', C: '#4FA8FF', G: '#FFD23F',
  N: '#2A3440',
  R: '#5C6B7A', Y: '#5C6B7A', S: '#5C6B7A', W: '#5C6B7A',
  K: '#5C6B7A', M: '#5C6B7A', B: '#5C6B7A', D: '#5C6B7A',
  H: '#5C6B7A', V: '#5C6B7A', '-': '#1A222C',
};

const BASE_CELL = 14;
const BASE_GAP = 2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;

export default function AlignmentView({ sequenceA, sequenceB, externalActiveDiff, onActiveDiffChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  const [zoom, setZoom] = useState(1.0);
  const [internalActiveDiff, setInternalActiveDiff] = useState(0);
  const activeDiffIndex = externalActiveDiff ?? internalActiveDiff;
  const setActiveDiffIndex = onActiveDiffChange ?? setInternalActiveDiff;

  const ops = useMemo(() => {
    if (!sequenceA || !sequenceB) return [];
    return diffSequences(sequenceA, sequenceB);
  }, [sequenceA, sequenceB]);

  const { consensus, agreement } = useMemo(() => computeConsensus(ops), [ops]);

  const diffIndices = useMemo(() => {
    const out = [];
    ops.forEach((op, i) => {
      if (op.type !== 'match') out.push(i);
    });
    return out;
  }, [ops]);

  useEffect(() => {
    setActiveDiffIndex(0);
  }, [sequenceA, sequenceB]);

  const dims = useMemo(() => {
    const cell = Math.max(6, Math.round(BASE_CELL * zoom));
    const gap = Math.max(1, Math.round(BASE_GAP * zoom));
    const rowHeight = cell + gap;
    const rulerWidth = Math.max(38, Math.round(42 * zoom));
    const rulerPadding = Math.max(4, Math.round(8 * zoom));
    const rulerFontSize = Math.max(8, Math.round(10 * zoom));
    return { cell, gap, rowHeight, rulerWidth, rulerPadding, rulerFontSize };
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

      const { cell, gap, rowHeight, rulerWidth, rulerPadding, rulerFontSize } = dims;
      const gridWidth = availableWidth - rulerWidth;
      const cols = Math.max(1, Math.floor((gridWidth - rulerPadding) / (cell + gap)));
      setColsToDraw(cols);

      const totalRows = Math.ceil(ops.length / cols) || 1;
      // Each "row" now holds THREE sequence rows: A, B, consensus
      const rowTripleHeight = rowHeight * 3 + 8;
      const contentHeight = totalRows * rowTripleHeight;
      const totalHeight = Math.max(contentHeight, container.clientHeight);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = availableWidth * dpr;
      canvas.height = totalHeight * dpr;
      canvas.style.width = `${availableWidth}px`;
      canvas.style.height = `${totalHeight}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, availableWidth, totalHeight);

      if (ops.length === 0) {
        ctx.fillStyle = '#5C6B7A';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          sequenceA && sequenceB
            ? 'No alignment possible'
            : 'Load two sequences to compare...',
          availableWidth / 2,
          totalHeight / 2
        );
        return;
      }

      const cornerRadius = Math.max(1, Math.round(3 * zoom));

      for (let row = 0; row < totalRows; row++) {
        const rowStartOp = row * cols;
        const rowEndOp = Math.min(rowStartOp + cols, ops.length);
        const rowOps = ops.slice(rowStartOp, rowEndOp);
        const rowY = row * rowTripleHeight;

        // Ruler
        ctx.font = `${rulerFontSize}px "JetBrains Mono", monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#5C6B7A';
        ctx.fillText(String(rowStartOp + 1), rulerWidth - rulerPadding, rowY + cell / 2);

        // Divider line under ruler gutter
        ctx.fillStyle = '#1A222C';
        ctx.fillRect(rulerWidth - 1, rowY, 1, rowTripleHeight - 8);

        // Three row baselines
        const yA = rowY;
        const yB = rowY + rowHeight + 4;
        const yC = rowY + rowHeight * 2 + 8; // consensus, slightly more gap below B

        // Small "consensus" label in the ruler gutter for the third row
        ctx.fillStyle = '#5C6B7A';
        ctx.font = `${Math.max(7, rulerFontSize - 2)}px "JetBrains Mono", monospace`;
        ctx.fillText('cons', rulerWidth - rulerPadding, yC + cell / 2);
        ctx.font = `${rulerFontSize}px "JetBrains Mono", monospace`;

        rowOps.forEach((op, c) => {
          const x = rulerWidth + c * (cell + gap);

          // --- Row A ---
          if (op.aChar) {
            ctx.fillStyle = BASE_COLORS[op.aChar] || '#2A3440';
            ctx.beginPath();
            ctx.roundRect(x, yA, cell, cell, cornerRadius);
            ctx.fill();

            if (op.type === 'sub' || op.type === 'del') {
              ctx.strokeStyle = '#FF5470';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(x - 1, yA - 1, cell + 2, cell + 2, cornerRadius + 1);
              ctx.stroke();
            }
          } else {
            ctx.fillStyle = 'rgba(255, 84, 112, 0.15)';
            ctx.beginPath();
            ctx.roundRect(x, yA, cell, cell, cornerRadius);
            ctx.fill();
          }

          // --- Row B ---
          if (op.bChar) {
            ctx.fillStyle = BASE_COLORS[op.bChar] || '#2A3440';
            ctx.beginPath();
            ctx.roundRect(x, yB, cell, cell, cornerRadius);
            ctx.fill();

            if (op.type === 'sub' || op.type === 'ins') {
              ctx.strokeStyle = '#FF5470';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(x - 1, yB - 1, cell + 2, cell + 2, cornerRadius + 1);
              ctx.stroke();
            }
          } else {
            ctx.fillStyle = 'rgba(255, 84, 112, 0.15)';
            ctx.beginPath();
            ctx.roundRect(x, yB, cell, cell, cornerRadius);
            ctx.fill();
          }

          // --- Row C: consensus ---
          const opIndex = rowStartOp + c;
          const base = consensus[opIndex];

          if (base === ' ') {
            // Both gaps — leave empty
          } else if (base === 'N') {
            // Disagreement — dim cell with a dot
            ctx.fillStyle = 'rgba(255, 84, 112, 0.25)';
            ctx.beginPath();
            ctx.roundRect(x, yC, cell, cell, cornerRadius);
            ctx.fill();
            // Small dot to signal "no consensus"
            ctx.fillStyle = '#FF5470';
            ctx.beginPath();
            ctx.arc(x + cell / 2, yC + cell / 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Consensus reached — subtle green-tinted cell
            ctx.fillStyle = 'rgba(0, 229, 160, 0.15)';
            ctx.beginPath();
            ctx.roundRect(x, yC, cell, cell, cornerRadius);
            ctx.fill();

            // Thin green underline to reinforce agreement
            ctx.fillStyle = '#00E5A0';
            ctx.fillRect(x + 1, yC + cell - 1, cell - 2, 1);
          }
        });
      }

      // Active difference highlight spans A and B only (not consensus)
      if (diffIndices.length > 0 && activeDiffIndex < diffIndices.length) {
        const activeOpIndex = diffIndices[activeDiffIndex];
        const row = Math.floor(activeOpIndex / cols);
        const col = activeOpIndex % cols;
        const x = rulerWidth + col * (cell + gap);
        const yA = row * rowTripleHeight;

        ctx.strokeStyle = '#E8EDF2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - 2, yA - 2, cell + 4, rowHeight * 2 + 8, 4);
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
  }, [ops, dims, activeDiffIndex, diffIndices, sequenceA, sequenceB, consensus]);

  useEffect(() => {
    if (diffIndices.length === 0) return;
    const activeOpIndex = diffIndices[activeDiffIndex];
    if (activeOpIndex === undefined) return;
    const scroll = scrollRef.current;
    if (!scroll) return;

    const rowTripleHeight = dims.rowHeight * 3 + 8;
    const row = Math.floor(activeOpIndex / colsToDraw);
    const targetScrollTop = row * rowTripleHeight;
    const viewportHeight = scroll.clientHeight;
    const targetScroll = Math.max(0, targetScrollTop - viewportHeight / 2 + rowTripleHeight);
    scroll.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, [activeDiffIndex, diffIndices, dims, colsToDraw]);

  const goToPrevDiff = () => {
    if (diffIndices.length === 0) return;
    setActiveDiffIndex((i) => (i - 1 + diffIndices.length) % diffIndices.length);
  };
  const goToNextDiff = () => {
    if (diffIndices.length === 0) return;
    setActiveDiffIndex((i) => (i + 1) % diffIndices.length);
  };
  const changeZoom = (delta) => {
    setZoom((z) => {
      const next = Math.round((z + delta) * 10) / 10;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  };

  const ready = sequenceA && sequenceB;

  return (
    <div className="h-full bg-strand-panel rounded-2xl p-3 border border-strand-muted/10 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 mb-2">
        <h2 className="text-sm font-medium text-strand-text shrink-0">Alignment</h2>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          {ready && diffIndices.length > 0 && (
            <>
              <span className="text-[10px] font-mono text-strand-t shrink-0">
                {activeDiffIndex + 1} / {diffIndices.length} diffs
              </span>
              <button
                onClick={goToPrevDiff}
                className="p-1 rounded bg-strand-bg text-strand-text shrink-0"
              >
                <ChevronUp size={11} />
              </button>
              <button
                onClick={goToNextDiff}
                className="p-1 rounded bg-strand-bg text-strand-text shrink-0"
              >
                <ChevronDown size={11} />
              </button>
            </>
          )}
          {ready && diffIndices.length === 0 && (
            <span className="text-[10px] font-mono text-strand-a shrink-0">Identical</span>
          )}
          {ready && <ConsensusIndicator agreement={agreement} totalPositions={ops.length} />}
        </div>

        <div className="flex items-center gap-1.5 bg-strand-bg rounded-lg px-2 py-1 shrink-0">
          <button
            onClick={() => changeZoom(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            className="text-strand-muted hover:text-strand-text disabled:opacity-30 transition-colors"
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
            className="w-20 h-1 accent-strand-a cursor-pointer"
          />
          <button
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            className="text-strand-muted hover:text-strand-text disabled:opacity-30 transition-colors"
          >
            <ZoomIn size={12} />
          </button>
          <span className="text-[10px] font-mono text-strand-muted w-8 text-right">
            {zoom.toFixed(1)}×
          </span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3 mb-2 text-[10px] font-mono text-strand-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border" style={{ borderColor: '#FF5470' }} />
          Difference
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,84,112,0.15)' }} />
          Gap
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(0,229,160,0.15)', borderBottom: '1px solid #00E5A0' }} />
          Consensus
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 w-full rounded-xl bg-strand-bg p-2 overflow-y-auto overflow-x-hidden"
      >
        <div ref={containerRef} className="w-full">
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>

      {!ready && (
        <div className="shrink-0 mt-2 text-center">
          <p className="text-[10px] text-strand-muted font-mono py-1">
            Load a second sequence in Setup to compare
          </p>
        </div>
      )}
    </div>
  );
}
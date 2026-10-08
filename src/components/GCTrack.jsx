import { useRef, useEffect, useMemo } from 'react';

const TRACK_HEIGHT = 60;
const WINDOW_SIZE = 50;
const WINDOW_HALF = Math.floor(WINDOW_SIZE / 2);

/**
 * Computes the GC% at each position using a sliding window.
 * Returns an array of percentages (0-100), one per base.
 */
const computeGCWindows = (sequence, windowSize = 50) => {
  if (!sequence || sequence.length === 0) return [];
  const n = sequence.length;
  const half = Math.floor(windowSize / 2);
  const result = new Array(n);

  // Precompute a cumulative GC count for O(n) efficiency.
  // cumGC[i] = number of G/C in sequence[0..i-1]
  const cumGC = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    const c = sequence[i];
    cumGC[i + 1] = cumGC[i] + (c === 'G' || c === 'C' ? 1 : 0);
  }

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(n, i + half + 1);
    const gcCount = cumGC[end] - cumGC[start];
    const windowLen = end - start;
    result[i] = windowLen > 0 ? (gcCount / windowLen) * 100 : 0;
  }

  return result;
};

export default function GCTrack({ sequence, dims, colsToDraw }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  // Compute GC windows — memoized on the sequence
  const gcWindows = useMemo(() => computeGCWindows(sequence, WINDOW_SIZE), [sequence]);

  // Average GC across the entire sequence — for the label
  const avgGC = useMemo(() => {
    if (gcWindows.length === 0) return 0;
    return gcWindows.reduce((a, b) => a + b, 0) / gcWindows.length;
  }, [gcWindows]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const width = wrapper.clientWidth;
      const height = TRACK_HEIGHT;
      if (width <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // If no data, show a muted line
      if (gcWindows.length === 0) {
        ctx.fillStyle = '#2A3440';
        ctx.fillRect(dims.rulerWidth, height / 2 - 1, width - dims.rulerWidth, 2);
        return;
      }

      const { cell, gap, rulerWidth } = dims;
      const totalBases = gcWindows.length;

      // For each row, we have `colsToDraw` bases rendered as
      // a strip of (cell + gap) pixels. The GC track must align to that
      // geometry 1:1 — i.e. base i sits at the same x-position as in the
      // sequence canvas.
      const rows = Math.ceil(totalBases / colsToDraw);
      const stripHeight = height / rows;

      // Reserve space for the ruler gutter on the left
      const gridStartX = rulerWidth;
      const gridWidth = width - gridStartX;

      // Background
      ctx.fillStyle = '#0A0E14';
      ctx.fillRect(gridStartX, 0, gridWidth, height);

      // Draw baseline at 50% GC (midline reference)
      ctx.strokeStyle = 'rgba(92,107,122,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gridStartX, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw the curve as a filled path, row by row
      for (let row = 0; row < rows; row++) {
        const rowStartBase = row * colsToDraw;
        const rowEndBase = Math.min(rowStartBase + colsToDraw, totalBases);
        const rowBaseCount = rowEndBase - rowStartBase;
        if (rowBaseCount === 0) continue;

        const rowY = row * stripHeight;
        const rowBottomY = rowY + stripHeight;

        // Draw a filled area from baseline to the GC line, plus the line itself
        ctx.beginPath();

        // Top edge (the curve)
        for (let c = 0; c < rowBaseCount; c++) {
          const baseIdx = rowStartBase + c;
          const gc = gcWindows[baseIdx];
          const x = gridStartX + c * (cell + gap) + cell / 2;
          // 0% at bottom of row, 100% at top of row
          const y = rowY + stripHeight * (1 - gc / 100);
          if (c === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Down to baseline at the last x
        const lastBaseIdx = rowEndBase - 1;
        const lastX = gridStartX + (rowBaseCount - 1) * (cell + gap) + cell / 2;
        ctx.lineTo(lastX, rowBottomY);

        // Back to baseline at the first x
        const firstX = gridStartX + cell / 2;
        ctx.lineTo(firstX, rowBottomY);
        ctx.closePath();

        // Fill with gradient
        const gradient = ctx.createLinearGradient(gridStartX, rowY, gridStartX, rowBottomY);
        gradient.addColorStop(0, 'rgba(0, 229, 160, 0.55)');   // high GC → green
        gradient.addColorStop(0.5, 'rgba(255, 210, 63, 0.35)'); // mid → amber
        gradient.addColorStop(1, 'rgba(255, 84, 112, 0.25)');  // low GC → coral
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke the top edge for definition
        ctx.beginPath();
        for (let c = 0; c < rowBaseCount; c++) {
          const baseIdx = rowStartBase + c;
          const gc = gcWindows[baseIdx];
          const x = gridStartX + c * (cell + gap) + cell / 2;
          const y = rowY + stripHeight * (1 - gc / 100);
          if (c === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#00E5A0';
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }

      // Ruler gutter — small "GC" label at the top
      ctx.fillStyle = '#5C6B7A';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      ctx.fillText('GC%', rulerWidth - 6, 4);
      ctx.fillText(`${avgGC.toFixed(0)}`, rulerWidth - 6, 16);
    };

    draw();
    const rafId = requestAnimationFrame(draw);
    const observer = new ResizeObserver(draw);
    observer.observe(wrapper);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [gcWindows, dims, colsToDraw, avgGC]);

  return (
    <div
      ref={wrapperRef}
      className="w-full bg-strand-panel rounded-t-xl border-b border-strand-muted/10 overflow-hidden"
      style={{ height: TRACK_HEIGHT }}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
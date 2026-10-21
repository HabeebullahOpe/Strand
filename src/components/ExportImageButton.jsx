import { useState } from 'react';
import { Camera, Check } from 'lucide-react';

const BACKGROUND = '#0A0E14';
const PADDING = 16;

/**
 * Exports a canvas element as a PNG with a solid background.
 * The canvas is composited onto a temporary canvas so the exported
 * image looks like a screenshot rather than a transparent layer.
 */
export default function ExportImageButton({ canvasRef, filenameBase = 'strand_dna' }) {
  const [done, setDone] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const handleClick = () => {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
      setDisabled(true);
      setTimeout(() => setDisabled(false), 800);
      return;
    }

    try {
      // Create a temporary canvas with padding around the source
      const out = document.createElement('canvas');
      out.width = sourceCanvas.width + PADDING * 2;
      out.height = sourceCanvas.height + PADDING * 2;

      const ctx = out.getContext('2d');

      // Fill with the app's background color
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, out.width, out.height);

      // Draw the source canvas on top, offset by the padding
      ctx.drawImage(sourceCanvas, PADDING, PADDING);

      // Convert to a blob and trigger download
      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `${filenameBase}_${date}.png`;
        a.click();
        URL.revokeObjectURL(url);

        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }, 'image/png');
    } catch {
      // Cross-origin or tainted canvas — silently ignore
      setDisabled(true);
      setTimeout(() => setDisabled(false), 800);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded transition-colors shrink-0 ${
        disabled
          ? 'bg-strand-bg text-strand-muted/40 cursor-not-allowed'
          : 'bg-strand-bg text-strand-muted hover:text-strand-text'
      }`}
      title="Export viewer as PNG"
    >
      {done ? <Check size={10} className="text-strand-a" /> : <Camera size={10} />}
      PNG
    </button>
  );
}
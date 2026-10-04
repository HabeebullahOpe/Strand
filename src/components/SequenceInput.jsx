import { useState } from 'react';
import { RefreshCw, ClipboardX } from 'lucide-react';

const SAMPLE_SEQUENCE = `ATGCGTACGTAGCTAGCTAGCATCGATCGATCGTAGCTAGCTAGCATCGATCGTAGCTAGCTAGCATCGATCGTAGCTAGCTAGCATCGATCGATCGATCGTAGCTAGCTAGCATCGATCG`;

export default function SequenceInput({ sequence, setSequence }) {
  const [inputValue, setInputValue] = useState('');

  const handleLoadSample = () => {
    setSequence(SAMPLE_SEQUENCE);
    setInputValue(SAMPLE_SEQUENCE);
  };
  const handleClear = () => {
    setSequence('');
    setInputValue('');
  };
  const handleChange = (e) => {
    setInputValue(e.target.value);
    setSequence(e.target.value);
  };

  return (
    <div className="h-full bg-strand-panel rounded-2xl p-3 border border-strand-muted/10 flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-strand-text">Sequence Input</h2>
        <div className="flex gap-1.5">
          <button
            onClick={handleLoadSample}
            className="p-1.5 bg-strand-bg rounded-lg text-strand-a hover:bg-strand-a/10 transition-colors"
            title="Load sample"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 bg-strand-bg rounded-lg text-strand-t hover:bg-strand-t/10 transition-colors"
            title="Clear"
          >
            <ClipboardX size={14} />
          </button>
        </div>
      </div>

      {/* Textarea — fills whatever height remains, but never collapses */}
      <textarea
        value={inputValue}
        onChange={handleChange}
        placeholder="Paste FASTA or raw DNA..."
        className="flex-1 min-h-[60px] w-full bg-strand-bg rounded-xl p-3 text-strand-text font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-strand-a/50 placeholder:text-strand-muted/50 transition-all"
      />

      {/* Footer */}
      <div className="shrink-0 flex justify-between items-center text-[10px] text-strand-muted mt-2 font-mono">
        <span>Supports A T C G N R Y...</span>
        <span>{sequence.length} bases</span>
      </div>
    </div>
  );
}
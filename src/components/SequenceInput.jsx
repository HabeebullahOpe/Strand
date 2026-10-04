import { useState } from 'react';
import { ClipboardPaste, RefreshCw, ClipboardX } from 'lucide-react';

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
    const rawValue = e.target.value;
    setInputValue(rawValue);
    setSequence(rawValue);
  };

  const handlePaste = (e) => {
    // Let the default paste happen, then sync state
    const pastedText = e.clipboardData.getData('text');
    const newValue = inputValue + pastedText;
    setInputValue(newValue);
    setSequence(newValue);
  };

  return (
    <div className="bg-strand-panel rounded-3xl p-6 space-y-4 shadow-lg border border-strand-muted/10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-strand-text">Sequence Input</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleLoadSample}
            className="p-2 bg-strand-bg rounded-xl text-strand-a hover:bg-strand-a/10 transition-colors"
            title="Load Sample"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={handleClear}
            className="p-2 bg-strand-bg rounded-xl text-strand-t hover:bg-strand-t/10 transition-colors"
            title="Clear"
          >
            <ClipboardX size={18} />
          </button>
        </div>
      </div>
      
      <textarea
        value={inputValue}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="Paste FASTA sequence or raw DNA here..."
        className="w-full h-32 bg-strand-bg rounded-2xl p-4 text-strand-text font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-strand-a/50 placeholder:text-strand-muted/50 transition-all"
      />
      
      <div className="flex justify-between items-center text-xs text-strand-muted">
        <span>Supports A, T, C, G</span>
        <span>{sequence.length} bases loaded</span>
      </div>
    </div>
  );
}
import { ArrowLeftRight } from 'lucide-react';

export default function ReverseComplementButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded transition-colors shrink-0 ${
        disabled
          ? 'bg-strand-bg text-strand-muted/40 cursor-not-allowed'
          : 'bg-strand-bg text-strand-muted hover:text-strand-text'
      }`}
      title={disabled ? 'No sequence loaded' : 'Reverse complement'}
    >
      <ArrowLeftRight size={10} />
      RC
    </button>
  );
}
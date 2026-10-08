import { useState, useRef, useEffect } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';

export default function AnnotationRow({
  annotation,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(annotation.label);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(annotation.label);
  }, [annotation.label]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== annotation.label) {
      onRename(annotation.id, trimmed);
    } else {
      setDraft(annotation.label);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(annotation.label);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') cancel();
  };

  return (
    <div
      onClick={() => !editing && onSelect(annotation.id)}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-strand-a/10 border border-strand-a/40'
          : 'bg-strand-bg border border-strand-muted/10 hover:border-strand-muted/30'
      }`}
    >
      <div
        className="w-1 h-6 rounded-full shrink-0"
        style={{ backgroundColor: annotation.color }}
      />

      {editing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            className="flex-1 min-w-0 bg-strand-panel rounded px-1.5 py-0.5 text-xs text-strand-text font-mono focus:outline-none"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            className="p-1 rounded text-strand-a hover:bg-strand-a/10 shrink-0"
            title="Save"
          >
            <Check size={11} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancel}
            className="p-1 rounded text-strand-muted hover:bg-strand-muted/10 shrink-0"
            title="Cancel"
          >
            <X size={11} />
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-strand-text font-medium truncate leading-tight">
              {annotation.label}
            </p>
            <p className="text-[10px] text-strand-muted font-mono leading-tight">
              {annotation.start + 1}–{annotation.end} · {annotation.end - annotation.start} bp
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="p-1 rounded text-strand-muted hover:text-strand-text hover:bg-strand-bg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Rename"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(annotation.id);
            }}
            className="p-1 rounded text-strand-muted hover:text-strand-t hover:bg-strand-t/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </>
      )}
    </div>
  );
}
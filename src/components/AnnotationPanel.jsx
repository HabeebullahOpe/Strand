import { Tag } from 'lucide-react';
import AnnotationRow from './AnnotationRow';

export default function AnnotationPanel({
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onRenameAnnotation,
  onDeleteAnnotation,
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-strand-a" />
          <h2 className="text-sm font-medium text-strand-text">Annotations</h2>
        </div>
        <span className="text-[10px] font-mono text-strand-muted bg-strand-bg px-1.5 py-1 rounded">
          {annotations.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
        {annotations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] font-mono text-strand-muted text-center px-3 leading-relaxed">
              No annotations yet.
              <br />
              Drag across the sequence in the DNA view to add one.
            </p>
          </div>
        ) : (
          annotations.map((ann) => (
            <AnnotationRow
              key={ann.id}
              annotation={ann}
              isSelected={ann.id === selectedAnnotationId}
              onSelect={onSelectAnnotation}
              onRename={onRenameAnnotation}
              onDelete={onDeleteAnnotation}
            />
          ))
        )}
      </div>
    </div>
  );
}
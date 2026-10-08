import { useState, useRef, useEffect } from 'react';
import AnnotationPanel from './AnnotationPanel';
import PrimerPanel from './PrimerPanel';
import VariantReport from './VariantReport';

const TABS = [
  { id: 'annotations', label: 'Annotations' },
  { id: 'primers', label: 'Primers' },
  { id: 'variants', label: 'Variants' },
];

export default function LeftAnalysisPanel({
  sequence,
  sequenceB,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onRenameAnnotation,
  onDeleteAnnotation,
  onJumpToDiff,
  activeDiffIndex,
}) {
  const [tab, setTab] = useState('annotations');
  const containerRef = useRef(null);
  const buttonRefs = useRef({});
  const [highlight, setHighlight] = useState({ left: 0, width: 0 });

  // Measure the active tab and position the highlight
  useEffect(() => {
    const btn = buttonRefs.current[tab];
    const container = containerRef.current;
    if (!btn || !container) return;
    const btnRect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setHighlight({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  }, [tab]);

  return (
    <div className="h-full bg-strand-panel rounded-2xl p-3 border border-strand-muted/10 flex flex-col">
      {/* Tab switcher */}
      <div className="shrink-0 mb-3 flex justify-center">
        <div
          ref={containerRef}
          className="relative bg-strand-bg rounded-full p-0.5 flex border border-strand-muted/10 overflow-hidden"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => (buttonRefs.current[t.id] = el)}
              onClick={() => setTab(t.id)}
              className={`relative px-2.5 py-1 text-[10px] font-medium transition-colors z-10 whitespace-nowrap ${
                tab === t.id ? 'text-strand-bg' : 'text-strand-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div
            className="absolute top-0.5 bottom-0.5 bg-strand-a rounded-full transition-all duration-200 ease-out pointer-events-none"
            style={{
              left: `${highlight.left}px`,
              width: `${highlight.width}px`,
            }}
          />
        </div>
      </div>

      {/* Tab body */}
      <div className="flex-1 min-h-0">
        {tab === 'annotations' && (
          <AnnotationPanel
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={onSelectAnnotation}
            onRenameAnnotation={onRenameAnnotation}
            onDeleteAnnotation={onDeleteAnnotation}
          />
        )}
        {tab === 'primers' && (
          <PrimerPanel
            sequence={sequence}
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
          />
        )}
        {tab === 'variants' && (
          <VariantReport
            sequenceA={sequence}
            sequenceB={sequenceB}
            onJumpToDiff={onJumpToDiff}
            externalActiveDiff={activeDiffIndex}
          />
        )}
      </div>
    </div>
  );
}
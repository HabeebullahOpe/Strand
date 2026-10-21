import { useState } from 'react';
import { Scissors, Languages, CircleDot, ArrowLeft, Wrench } from 'lucide-react';
import RestrictionSites from './RestrictionSites';
import SixFrameTranslation from './SixFrameTranslation';
import PlasmidMap from './PlasmidMap';

export default function ToolsHub({ sequence }) {
  const [activeTool, setActiveTool] = useState(null);

  const ToolWrapper = ({ children }) => (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full">
      <button
        onClick={() => setActiveTool(null)}
        className="self-start flex items-center gap-2 text-xs font-mono text-strand-muted hover:text-strand-text mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Tools
      </button>
      <div className="flex-1 min-h-0 bg-strand-panel rounded-2xl border border-strand-muted/10 overflow-hidden">
        {children}
      </div>
    </div>
  );

  if (activeTool === 'restriction') {
    return <ToolWrapper><RestrictionSites sequence={sequence} /></ToolWrapper>;
  }

  if (activeTool === 'six-frame') {
    return <ToolWrapper><SixFrameTranslation sequence={sequence} /></ToolWrapper>;
  }

  if (activeTool === 'plasmid') {
    return <ToolWrapper><PlasmidMap sequence={sequence} /></ToolWrapper>;
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-strand-panel rounded-xl border border-strand-muted/10">
          <Wrench size={20} className="text-strand-a" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-strand-text">Advanced Tools</h1>
          <p className="text-xs text-strand-muted mt-0.5">
            Specialized analysis modules for the current sequence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tool Card: Restriction Sites */}
        <button
          onClick={() => setActiveTool('restriction')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${
            sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Scissors size={18} className={sequence ? 'text-strand-g' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">Restriction Sites</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Scan the sequence for common restriction enzyme recognition sites and view their exact cut positions.
          </p>
        </button>

        {/* Tool Card: 6-Frame Translation */}
        <button
          onClick={() => setActiveTool('six-frame')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${
            sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Languages size={18} className={sequence ? 'text-strand-c' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">6-Frame Translation</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Translate all 3 forward and 3 reverse reading frames simultaneously to spot open reading frames.
          </p>
        </button>

        {/* Tool Card: Plasmid Map */}
        <button
          onClick={() => setActiveTool('plasmid')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${
            sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <CircleDot size={18} className={sequence ? 'text-strand-a' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">Plasmid Map</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Visualize the sequence as a circular map, with ORFs drawn as directional arrows and restriction sites on the outer ring.
          </p>
        </button>

        {/* Placeholder for future tools */}
        <div className="p-5 rounded-2xl border border-strand-muted/5 bg-strand-panel/30 opacity-50 flex items-center justify-center min-h-[120px]">
          <p className="text-[11px] font-mono text-strand-muted">More tools coming soon...</p>
        </div>
      </div>
    </div>
  );
}
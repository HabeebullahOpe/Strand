import { useState } from 'react';
import { Scissors, Languages, CircleDot, Activity, Network, Sparkles, TrendingUp, Grid2x2, ArrowLeft, Wrench } from 'lucide-react';
import RestrictionSites from './RestrictionSites';
import SixFrameTranslation from './SixFrameTranslation';
import PlasmidMap from './PlasmidMap';
import HydrophobicityPlot from './HydrophobicityPlot';
import SequenceFamily from './SequenceFamily';
import CodonOptimizer from './CodonOptimizer';
import GCTrackPanel from './GCTrackPanel';
import DotPlot from './DotPlot';

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

  if (activeTool === 'restriction') return <ToolWrapper><RestrictionSites sequence={sequence} /></ToolWrapper>;
  if (activeTool === 'six-frame') return <ToolWrapper><SixFrameTranslation sequence={sequence} /></ToolWrapper>;
  if (activeTool === 'plasmid') return <ToolWrapper><PlasmidMap sequence={sequence} /></ToolWrapper>;
  if (activeTool === 'hydrophobicity') return <ToolWrapper><HydrophobicityPlot sequence={sequence} /></ToolWrapper>;
  if (activeTool === 'family') return <ToolWrapper><SequenceFamily /></ToolWrapper>;
  if (activeTool === 'optimizer') return <ToolWrapper><CodonOptimizer sequence={sequence} /></ToolWrapper>;
  if (activeTool === 'gc-track') return <ToolWrapper><GCTrackPanel sequence={sequence} /></ToolWrapper>;
  if (activeTool === 'dot-plot') return <ToolWrapper><DotPlot sequence={sequence} /></ToolWrapper>;

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
        {/* Restriction Sites */}
        <button
          onClick={() => setActiveTool('restriction')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Scissors size={18} className={sequence ? 'text-strand-g' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">Restriction Sites</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Scan the sequence for common restriction enzyme recognition sites and view their exact cut positions.
          </p>
        </button>

        {/* 6-Frame Translation */}
        <button
          onClick={() => setActiveTool('six-frame')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Languages size={18} className={sequence ? 'text-strand-c' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">6-Frame Translation</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Translate all 3 forward and 3 reverse reading frames simultaneously to spot open reading frames.
          </p>
        </button>

        {/* Plasmid Map */}
        <button
          onClick={() => setActiveTool('plasmid')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <CircleDot size={18} className={sequence ? 'text-strand-a' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">Plasmid Map</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Visualize the sequence as a circular map, with ORFs drawn as directional arrows and restriction sites on the outer ring.
          </p>
        </button>

        {/* Hydrophobicity Plot */}
        <button
          onClick={() => setActiveTool('hydrophobicity')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Activity size={18} className={sequence ? 'text-strand-t' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">Hydrophobicity Plot</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Kyte-Doolittle plot to identify hydrophobic regions and potential transmembrane domains.
          </p>
        </button>

        {/* Sequence Family (MSA) */}
        <button
          onClick={() => setActiveTool('family')}
          className="text-left p-5 rounded-2xl border transition-all bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <Network size={18} className="text-strand-a" />
            <h3 className="text-sm font-medium text-strand-text">Sequence Family (MSA)</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Paste multiple sequences to generate a similarity heatmap and a consensus sequence.
          </p>
        </button>

        {/* Codon Optimizer */}
        <button
          onClick={() => setActiveTool('optimizer')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={18} className={sequence ? 'text-strand-g' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">Codon Optimizer</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Rewrite the DNA sequence using host-specific optimal codons for E. coli, Human, or Yeast.
          </p>
        </button>

        {/* GC Content Track */}
        <button
          onClick={() => setActiveTool('gc-track')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={18} className={sequence ? 'text-strand-c' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">GC Content Track</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Plot the GC content across the sequence using a sliding window to identify GC-rich regions.
          </p>
        </button>

        {/* Dot Plot */}
        <button
          onClick={() => setActiveTool('dot-plot')}
          disabled={!sequence}
          className={`text-left p-5 rounded-2xl border transition-all ${sequence ? 'bg-strand-panel border-strand-muted/10 hover:border-strand-a/50 cursor-pointer' : 'bg-strand-panel/50 border-strand-muted/5 opacity-50 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Grid2x2 size={18} className={sequence ? 'text-strand-t' : 'text-strand-muted'} />
            <h3 className="text-sm font-medium text-strand-text">Dot Plot</h3>
          </div>
          <p className="text-[11px] text-strand-muted leading-relaxed">
            Compare two sequences visually to find repeats, inversions, and structural similarities.
          </p>
        </button>
      </div>
    </div>
  );
}
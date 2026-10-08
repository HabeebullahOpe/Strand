import { useState } from 'react';
import {
  Dna, Menu, Bell, User, ArrowLeft, Upload, Download, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import SequenceInput from './components/SequenceInput';
import SequenceCanvas from './components/SequenceCanvas';
import ProteinView from './components/ProteinView';
import AlignmentView from './components/AlignmentView';
import StatsPanel from './components/StatsPanel';
import PrimerPanel from './components/PrimerPanel';
import { useLocalStorage } from './hooks/useLocalStorage';
import { reverseComplement } from './utils/sequence';

const MOBILE_TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'dna', label: 'DNA' },
  { id: 'protein', label: 'Protein' },
  { id: 'align', label: 'Align' },
];

function App() {
  const [sequence, setSequence] = useLocalStorage('strand.sequence', '');
  const [inputValue, setInputValue] = useLocalStorage('strand.inputValue', '');
  const [sequenceB, setSequenceB] = useLocalStorage('strand.sequenceB', '');
  const [inputValueB, setInputValueB] = useLocalStorage('strand.inputValueB', '');
  const [mobileView, setMobileView] = useLocalStorage('strand.mobileView', 'setup');
  const [collapsed, setCollapsed] = useLocalStorage('strand.collapsed', false);
  const [desktopView, setDesktopView] = useLocalStorage('strand.desktopView', 'dna');
  const [annotations, setAnnotations] = useLocalStorage('strand.annotations', []);
  const [selectedAnnotationId, setSelectedAnnotationId] = useLocalStorage('strand.selectedAnnotationId', null);

  const [activeTab, setActiveTab] = useState('home');

  const loadPreset = (preset) => {
    setInputValue(preset.sequence);
    setSequence(preset.sequence);
  };
  const loadPresetB = (preset) => {
    setInputValueB(preset.sequence);
    setSequenceB(preset.sequence);
  };

  const handleAddAnnotation = (ann) => {
    setAnnotations((prev) => [...prev, ann]);
    setSelectedAnnotationId(ann.id);
  };
  const handleReverseComplement = () => {
    if (!sequence) return;
    const rc = reverseComplement(sequence);
    setSequence(rc);
    setInputValue(rc);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-strand-bg text-strand-text font-sans overflow-hidden">
      {/* HEADER */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-strand-muted/10 relative z-30">
        <div className="flex items-center gap-2">
          <Dna className="text-strand-a w-5 h-5" />
          <span className="font-bold text-lg tracking-tight">
            DNA<span className="text-strand-a">+</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="p-2 rounded-full bg-strand-panel hover:bg-strand-muted/20 transition-colors cursor-pointer">
            <Upload size={18} className="text-strand-muted" />
            <input
              type="file"
              accept=".fasta,.fa,.txt,.seq"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  const text = event.target?.result;
                  if (typeof text === 'string') {
                    setInputValue(text);
                    setSequence(text);
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>

          <button
            onClick={() => {
              if (!sequence) return;
              const fasta = `>strand_export_${new Date().toISOString().slice(0, 10)}\n${sequence}`;
              const blob = new Blob([fasta], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `strand_${Date.now()}.fasta`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!sequence}
            className="p-2 rounded-full bg-strand-panel hover:bg-strand-muted/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={sequence ? 'Export as FASTA' : 'No sequence loaded'}
          >
            <Download size={18} className="text-strand-muted" />
          </button>

          <button
            onClick={() => {
              if (!window.confirm('Clear all saved data? This cannot be undone.')) return;
              Object.keys(window.localStorage)
                .filter((k) => k.startsWith('strand.'))
                .forEach((k) => window.localStorage.removeItem(k));
              window.location.reload();
            }}
            className="p-2 rounded-full bg-strand-panel hover:bg-strand-muted/20 transition-colors"
            title="Reset session"
          >
            <RotateCcw size={18} className="text-strand-muted" />
          </button>

          <button className="p-2 rounded-full bg-strand-panel hover:bg-strand-muted/20 transition-colors">
            <Bell size={18} className="text-strand-muted" />
          </button>

          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-strand-a to-strand-c flex items-center justify-center">
            <User size={14} className="text-strand-bg" />
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              {/* DESKTOP */}
              <div
                className={`hidden md:grid h-full p-4 gap-4 transition-[grid-template-columns] duration-300 ${collapsed ? 'md:grid-cols-[0px_1fr]' : 'md:grid-cols-2'
                  }`}
              >
                {/* LEFT COLUMN — Input / Compare / Primer */}
                <div
                  className={`min-h-0 min-w-0 overflow-hidden transition-opacity duration-200 ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                >
                  <div className="h-full flex flex-col gap-3">
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <SequenceInput
                        sequence={sequence}
                        setSequence={setSequence}
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        onLoadPreset={loadPreset}
                      />
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <SequenceInput
                        sequence={sequenceB}
                        setSequence={setSequenceB}
                        inputValue={inputValueB}
                        setInputValue={setInputValueB}
                        onLoadPreset={loadPresetB}
                        label="Compare With"
                      />
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <PrimerPanel
                        sequence={sequence}
                        annotations={annotations}
                        selectedAnnotationId={selectedAnnotationId}
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN — Viewer + Stats */}
                <div
                  className={`min-h-0 min-w-0 flex flex-col gap-4 transition-all duration-300 ${collapsed ? 'md:col-start-1 md:col-span-2' : ''
                    }`}
                >
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="shrink-0 flex justify-end mb-2">
                      <div className="flex bg-strand-panel rounded-lg p-0.5 border border-strand-muted/10">
                        {['dna', 'protein', 'align'].map((v) => (
                          <button
                            key={v}
                            onClick={() => setDesktopView(v)}
                            className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors capitalize ${desktopView === v
                              ? 'bg-strand-a text-strand-bg'
                              : 'text-strand-muted hover:text-strand-text'
                              }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      {desktopView === 'dna' ? (
                        <SequenceCanvas
                          sequence={sequence}
                          collapsed={collapsed}
                          onToggleCollapse={() => setCollapsed((c) => !c)}
                          annotations={annotations}
                          onAddAnnotation={handleAddAnnotation}
                          selectedAnnotationId={selectedAnnotationId}
                          onSelectAnnotation={setSelectedAnnotationId}
                          onReverseComplement={handleReverseComplement}
                        />
                      ) : desktopView === 'protein' ? (
                        <ProteinView sequence={sequence} />
                      ) : (
                        <AlignmentView sequenceA={sequence} sequenceB={sequenceB} />
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <StatsPanel sequence={sequence} />
                  </div>
                </div>
              </div>

              {/* MOBILE */}
              <div className="md:hidden h-full flex flex-col">
                <div className="shrink-0 px-3 pt-3 flex justify-center">
                  <div className="relative bg-strand-panel rounded-full p-0.5 flex border border-strand-muted/10">
                    {MOBILE_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setMobileView(tab.id)}
                        className={`relative px-2.5 py-1 text-[10px] font-medium transition-colors z-10 ${mobileView === tab.id ? 'text-strand-bg' : 'text-strand-muted'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                    <motion.div
                      initial={false}
                      animate={{
                        x:
                          mobileView === 'setup'
                            ? '0%'
                            : mobileView === 'dna'
                              ? '100%'
                              : mobileView === 'protein'
                                ? '200%'
                                : '300%',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(25%-2px)] bg-strand-a rounded-full"
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 relative overflow-hidden mt-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {mobileView === 'setup' && (
                      <motion.div
                        key="setup"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                        className="absolute inset-0 p-3 pt-0 flex flex-col gap-3 overflow-y-auto"
                      >
                        <div className="shrink-0 h-[140px]">
                          <SequenceInput
                            sequence={sequence}
                            setSequence={setSequence}
                            inputValue={inputValue}
                            setInputValue={setInputValue}
                            onLoadPreset={loadPreset}
                          />
                        </div>
                        <div className="shrink-0 h-[140px]">
                          <SequenceInput
                            sequence={sequenceB}
                            setSequence={setSequenceB}
                            inputValue={inputValueB}
                            setInputValue={setInputValueB}
                            onLoadPreset={loadPresetB}
                            label="Compare With"
                          />
                        </div>
                        <div className="shrink-0 h-[200px]">
                          <PrimerPanel
                            sequence={sequence}
                            annotations={annotations}
                            selectedAnnotationId={selectedAnnotationId}
                          />
                        </div>
                        <div className="flex-1 min-h-0">
                          <StatsPanel sequence={sequence} />
                        </div>
                      </motion.div>
                    )}

                    {mobileView === 'dna' && (
                      <motion.div
                        key="dna"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                        className="absolute inset-0 p-3 pt-0"
                      >
                        <SequenceCanvas
                          sequence={sequence}
                          annotations={annotations}
                          onAddAnnotation={handleAddAnnotation}
                          selectedAnnotationId={selectedAnnotationId}
                          onSelectAnnotation={setSelectedAnnotationId}
                          onReverseComplement={handleReverseComplement}
                        />
                      </motion.div>
                    )}

                    {mobileView === 'protein' && (
                      <motion.div
                        key="protein"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                        className="absolute inset-0 p-3 pt-0"
                      >
                        <ProteinView sequence={sequence} />
                      </motion.div>
                    )}

                    {mobileView === 'align' && (
                      <motion.div
                        key="align"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                        className="absolute inset-0 p-3 pt-0"
                      >
                        <AlignmentView sequenceA={sequence} sequenceB={sequenceB} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tests' && (
            <motion.div
              key="tests"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col p-4 overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setActiveTab('home')}
                  className="p-2 bg-strand-panel rounded-full"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold">My Tests</h2>
              </div>
              <div className="bg-strand-panel rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-strand-muted/20 flex items-center justify-center text-lg">🧬</div>
                  <div>
                    <h3 className="text-sm font-medium">Not Tested</h3>
                    <p className="text-xs text-strand-muted">Awaiting sample</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-strand-muted/20 flex items-center justify-center text-lg">👨‍🔬</div>
                  <div>
                    <h3 className="text-sm font-medium">XY Chromosome</h3>
                    <p className="text-xs text-strand-muted">Male pattern detected</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-strand-muted/20 flex items-center justify-center text-lg">👶</div>
                  <div>
                    <h3 className="text-sm font-medium">X Chromosome</h3>
                    <p className="text-xs text-strand-muted">Female pattern detected</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* NAV */}
      <nav className="shrink-0 flex items-center justify-around border-t border-strand-muted/10 bg-strand-panel/40 backdrop-blur-md px-4 py-2 relative z-30">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center justify-center p-3 rounded-2xl transition-colors ${activeTab === 'home'
            ? 'bg-strand-a/15 text-strand-a'
            : 'text-strand-muted hover:text-strand-text'
            }`}
        >
          <Dna size={22} />
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center justify-center p-3 rounded-2xl transition-colors ${activeTab === 'tests'
            ? 'bg-strand-a/15 text-strand-a'
            : 'text-strand-muted hover:text-strand-text'
            }`}
        >
          <Menu size={22} />
        </button>
        <button className="flex items-center justify-center p-3 rounded-2xl text-strand-muted hover:text-strand-text transition-colors">
          <User size={22} />
        </button>
      </nav>
    </div>
  );
}

export default App;
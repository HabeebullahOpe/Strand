import { useState } from 'react';
import { Dna, Menu, Bell, User, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import SequenceInput from './components/SequenceInput';
import SequenceCanvas from './components/SequenceCanvas';
import StatsPanel from './components/StatsPanel';

const MOBILE_TABS = [
  { id: 'setup', label: 'Setup' },
  { id: 'viewer', label: 'Viewer' },
];

function App() {
  const [sequence, setSequence] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [mobileView, setMobileView] = useState('setup');

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-strand-bg text-strand-text font-sans overflow-hidden">
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-strand-muted/10">
        <div className="flex items-center gap-2">
          <Dna className="text-strand-a w-5 h-5" />
          <span className="font-bold text-lg tracking-tight">
            Strand<span className="text-strand-a">+</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full bg-strand-panel hover:bg-strand-muted/20 transition-colors">
            <Bell size={18} className="text-strand-muted" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-strand-a to-strand-c flex items-center justify-center">
            <User size={14} className="text-strand-bg" />
          </div>
        </div>
      </header>

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
              <div className="hidden md:grid h-full p-4 gap-4 md:grid-cols-2 md:grid-rows-[1fr_auto]">
                <div className="shrink-0 md:col-start-1 md:row-start-1 min-h-0">
                  <SequenceInput sequence={sequence} setSequence={setSequence} />
                </div>
                <div className="shrink-0 md:col-span-2 md:row-start-2 min-h-0">
                  <StatsPanel sequence={sequence} />
                </div>
                <div className="min-h-0 md:col-start-2 md:row-start-1">
                  <SequenceCanvas sequence={sequence} />
                </div>
              </div>

              {/* MOBILE */}
              <div className="md:hidden h-full flex flex-col">
                {/* Segmented control pill */}
<div className="shrink-0 px-3 pt-3 flex justify-center">
  <div className="relative bg-strand-panel rounded-full p-0.5 flex border border-strand-muted/10">
    {MOBILE_TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => setMobileView(tab.id)}
        className={`relative px-4 py-1 text-[11px] font-medium transition-colors z-10 ${
          mobileView === tab.id ? 'text-strand-bg' : 'text-strand-muted'
        }`}
      >
        {tab.label}
      </button>
    ))}

    <motion.div
      layout
      initial={false}
      animate={{ x: mobileView === 'setup' ? '0%' : '100%' }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] bg-strand-a rounded-full"
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
                        className="absolute inset-0 p-3 pt-0 flex flex-col gap-3"
                      >
                        <div className="shrink-0 h-[180px]">
                          <SequenceInput sequence={sequence} setSequence={setSequence} />
                        </div>
                        <div className="flex-1 min-h-0">
                          <StatsPanel sequence={sequence} />
                        </div>
                      </motion.div>
                    )}

                    {mobileView === 'viewer' && (
                      <motion.div
                        key="viewer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                        className="absolute inset-0 p-3 pt-0"
                      >
                        <SequenceCanvas sequence={sequence} />
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

      <nav className="shrink-0 flex items-center justify-around border-t border-strand-muted/10 bg-strand-panel/40 backdrop-blur-md px-4 py-2">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center justify-center p-3 rounded-2xl transition-colors ${
            activeTab === 'home'
              ? 'bg-strand-a/15 text-strand-a'
              : 'text-strand-muted hover:text-strand-text'
          }`}
        >
          <Dna size={22} />
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center justify-center p-3 rounded-2xl transition-colors ${
            activeTab === 'tests'
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
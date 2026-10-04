import { useState } from 'react';
import { Dna, Menu, Bell, User, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import SequenceInput from './components/SequenceInput';
import SequenceCanvas from './components/SequenceCanvas';
import StatsPanel from './components/StatsPanel';

function App() {
  const [sequence, setSequence] = useState('');
  const [activeTab, setActiveTab] = useState('home'); 

  return (
    <div className="min-h-screen bg-strand-bg text-strand-text font-sans flex flex-col max-w-md mx-auto relative overflow-hidden">
      
      {/* --- Header --- */}
      <header className="flex items-center justify-between p-6 pb-2">
        <div className="flex items-center gap-2">
          <Dna className="text-strand-a w-6 h-6" />
          <span className="font-bold text-xl tracking-tight">DNA<span className="text-strand-a">+</span></span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full bg-strand-panel hover:bg-strand-muted/20 transition-colors">
            <Bell size={20} className="text-strand-muted" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-strand-a to-strand-c flex items-center justify-center">
            <User size={16} className="text-strand-bg" />
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <SequenceInput sequence={sequence} setSequence={setSequence} />
              <StatsPanel sequence={sequence} />
              <SequenceCanvas sequence={sequence} />
            </motion.div>
          )}

          {activeTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setActiveTab('home')} className="p-2 bg-strand-panel rounded-full">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-semibold">My Tests</h2>
              </div>
              {/* Placeholder for the "My Tests" card UI from the image */}
              <div className="bg-strand-panel rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-strand-muted/20 flex items-center justify-center text-2xl">🧬</div>
                  <div>
                    <h3 className="font-medium">Not Tested</h3>
                    <p className="text-sm text-strand-muted">Awaiting sample</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-strand-muted/20 flex items-center justify-center text-2xl">👨‍🔬</div>
                  <div>
                    <h3 className="font-medium">XY Chromosome</h3>
                    <p className="text-sm text-strand-muted">Male pattern detected</p>
                  </div>
                </div>
                 <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-strand-muted/20 flex items-center justify-center text-2xl">👶</div>
                  <div>
                    <h3 className="font-medium">X Chromosome</h3>
                    <p className="text-sm text-strand-muted">Female pattern detected</p>
                  </div>
                </div>
              </div>
              <button className="w-full py-4 bg-strand-panel rounded-2xl text-strand-a font-medium flex items-center justify-center gap-2 hover:bg-strand-panel/80 transition-colors">
                Learn More <ArrowLeft size={16} className="rotate-180" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Bottom Navigation (Like the image) --- */}
      <nav className="absolute bottom-0 left-0 right-0 bg-strand-bg/80 backdrop-blur-md border-t border-strand-panel p-4 flex justify-around items-center">
        <button 
          onClick={() => setActiveTab('home')}
          className={`p-3 rounded-2xl transition-colors ${activeTab === 'home' ? 'bg-strand-panel text-strand-a' : 'text-strand-muted hover:text-strand-text'}`}
        >
          <Dna size={24} />
        </button>
        <button 
          onClick={() => setActiveTab('input')}
          className={`p-3 rounded-2xl transition-colors ${activeTab === 'input' ? 'bg-strand-panel text-strand-a' : 'text-strand-muted hover:text-strand-text'}`}
        >
          <Menu size={24} />
        </button>
        <button 
          className="p-3 rounded-2xl text-strand-muted hover:text-strand-text transition-colors"
        >
          <User size={24} />
        </button>
      </nav>

    </div>
  );
}

export default App;
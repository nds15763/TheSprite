import React, { useState } from 'react';
import PixelFire from './components/PixelFire';

const App: React.FC = () => {
  const [isLit, setIsLit] = useState(false);

  const handleReset = () => {
    setIsLit(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 select-none touch-none">
      
      <div className="relative z-10 p-8 flex flex-col items-center">
        <PixelFire isLit={isLit} onLight={() => setIsLit(true)} />
        
        <div className="mt-8 text-center space-y-4 opacity-0 animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
          {!isLit ? (
            <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">
              Swipe match head to ignite
            </p>
          ) : (
            <button 
              onClick={handleReset}
              className="px-6 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 transition-colors font-mono text-xs uppercase tracking-widest rounded-full"
            >
              Extinguish & Reset
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
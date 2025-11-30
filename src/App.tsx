import React, { useState } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { VISUALIZER_PRESETS, VisualizerKey } from './components/visualizers';
import { Stage, xrStore } from './components/stage/Stage';
import IgnitionOverlay from './components/overlay/IgnitionOverlay';

const App: React.FC = () => {
  const { audioData, recentEvents, startAudioListener } = useAudioEngine();
  
  // State to track current visualizer
  const [currentStyle, setCurrentStyle] = useState<VisualizerKey>('TOUCH_FLOW');
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [hasIgnited, setHasIgnited] = useState(false); // 增加点火状态

  // Get current config
  const activeConfig = VISUALIZER_PRESETS[currentStyle];
  const CurrentVisualizer = activeConfig.component;

  const handleIgnite = () => {
    setHasIgnited(true);
    startAudioListener();
  };

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden select-none touch-none">
      
      {/* === Ignition Layer (The Ritual) === */}
      {!hasIgnited && (
         <IgnitionOverlay onIgnite={handleIgnite} />
      )}

      {/* === 3D Layer (Always present, but empty if not in 3D mode) === */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${hasIgnited ? 'opacity-100' : 'opacity-0'}`}>
        <Stage>
          {activeConfig.type === '3d' && (
            <CurrentVisualizer 
              data={audioData}
              events={recentEvents}
              isActive={hasIgnited}
            />
          )}
        </Stage>
      </div>

      {/* === 2D Layer (HTML Canvas) === */}
      {activeConfig.type === '2d' && (
        <div className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${hasIgnited ? 'opacity-100' : 'opacity-0'}`}>
           <CurrentVisualizer 
              data={audioData}
              events={recentEvents}
              isActive={hasIgnited}
           />
        </div>
      )}

      {/* === UI Layer (Fade in after ignition) === */}
      <div className={`absolute top-4 left-4 z-30 flex flex-col gap-2 transition-opacity duration-1000 delay-1000 ${hasIgnited ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOverlayOpen(!isOverlayOpen); }}
          className="text-zinc-500 hover:text-white font-mono text-xs uppercase tracking-widest border border-zinc-800 px-3 py-1 rounded backdrop-blur-sm w-32"
        >
          {isOverlayOpen ? 'Close' : 'Visuals'}
        </button>
        
        {/* AR Button (Only for 3D modes) */}
        {activeConfig.type === '3d' && (
           <button
              onClick={(e) => { e.stopPropagation(); xrStore.enterAR(); }}
              className="text-emerald-500 hover:text-emerald-300 font-mono text-xs uppercase tracking-widest border border-emerald-900 bg-emerald-950/30 px-3 py-1 rounded backdrop-blur-sm w-32"
           >
              Enter AR
           </button>
        )}

        {isOverlayOpen && (
          <div className="flex flex-col gap-2 mt-2 animate-fade-in w-48">
            {Object.entries(VISUALIZER_PRESETS).map(([key, config]) => (
              <button 
                key={key}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setCurrentStyle(key as VisualizerKey); 
                }}
                className={`text-left px-3 py-2 rounded border transition-all duration-300 ${
                  currentStyle === key 
                    ? 'bg-zinc-800 border-zinc-600 text-white' 
                    : 'bg-zinc-950/50 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div className="flex justify-between items-center">
                   <span className="font-mono text-xs font-bold">{config.name}</span>
                   <span className="text-[9px] px-1 bg-zinc-800 rounded text-zinc-400">{config.type}</span>
                </div>
                <div className="text-[10px] opacity-60 truncate">{config.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default App;

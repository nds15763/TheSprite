import React, { useState, useEffect } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { getToy } from './toys/registry';
import { Stage, xrStore } from './components/stage/Stage';
import LaunchScreen from './ui/LaunchScreen';
import ToyDrawer from './ui/ToyDrawer';
import { usePreferences } from './core/storage/usePreferences';
import { KeepAwake } from '@capacitor-community/keep-awake';

const App: React.FC = () => {
  const { audioData, recentEvents, startAudioListener } = useAudioEngine();
  const { getLastToyId, setLastToyId } = usePreferences();
  
  // 状态管理
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [currentToyId, setCurrentToyId] = useState<string>(getLastToyId());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  
  // 保持屏幕常亮
  useEffect(() => {
    const keepScreenOn = async () => {
      try {
        await KeepAwake.keepAwake();
      } catch (err) {
        console.log('KeepAwake not supported:', err);
      }
    };
    keepScreenOn();
  }, []);

  // 启动屏完成后自动开始音频
  const handleLaunchComplete = () => {
    setShowLaunchScreen(false);
    setIsStarted(true);
    startAudioListener();
  };

  // 切换玩具
  const handleSelectToy = (toyId: string) => {
    setCurrentToyId(toyId);
    setLastToyId(toyId);
  };

  // 获取当前玩具配置
  const currentToy = getToy(currentToyId);
  if (!currentToy) {
    return <div className="flex items-center justify-center h-screen text-white">
      玩具未找到: {currentToyId}
    </div>;
  }

  const CurrentToyComponent = currentToy.component;

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden select-none touch-none">
      
      {/* === 启动屏 === */}
      {showLaunchScreen && (
        <LaunchScreen onComplete={handleLaunchComplete} />
      )}

      {/* === 3D 渲染层 (React Three Fiber) === */}
      {currentToy.type === '3d' && (
        <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isStarted ? 'opacity-100' : 'opacity-0'}`}>
          <Stage>
            <CurrentToyComponent 
              data={audioData}
              events={recentEvents}
              isActive={isStarted}
            />
          </Stage>
        </div>
      )}

      {/* === 2D 渲染层 (HTML Canvas) === */}
      {currentToy.type === '2d' && (
        <div className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${isStarted ? 'opacity-100' : 'opacity-0'}`}>
          <CurrentToyComponent 
            data={audioData}
            events={recentEvents}
            isActive={isStarted}
          />
        </div>
      )}

      {/* === UI层 === */}
      <div 
        className={`absolute z-30 flex gap-2 transition-opacity duration-1000 delay-500 ${isStarted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ 
          left: 'max(1rem, env(safe-area-inset-left) + 1rem)',
          top: 'max(1rem, env(safe-area-inset-top) + 1rem)',
        }}
      >
        {/* 玩具选择按钮 */}
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="text-white hover:text-zinc-300 font-mono text-xs uppercase tracking-widest border border-zinc-700 bg-zinc-900/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg transition-all active:scale-95"
        >
          {currentToy.icon} {currentToy.name}
        </button>
        
        {/* AR按钮 (仅3D模式) */}
        {currentToy.type === '3d' && (
          <button
            onClick={() => xrStore.enterAR()}
            className="text-emerald-400 hover:text-emerald-300 font-mono text-xs uppercase tracking-widest border border-emerald-800 bg-emerald-950/50 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg transition-all active:scale-95"
          >
            AR
          </button>
        )}
      </div>

      {/* === 玩具选择抽屉 === */}
      <ToyDrawer 
        isOpen={isDrawerOpen}
        currentToyId={currentToyId}
        onSelectToy={handleSelectToy}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default App;

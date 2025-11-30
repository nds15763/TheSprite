import React, { useState, useRef, useEffect } from 'react';

interface IgnitionOverlayProps {
  onIgnite: () => void;
}

const IgnitionOverlay: React.FC<IgnitionOverlayProps> = ({ onIgnite }) => {
  const [isIgnited, setIsIgnited] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number, clientY: number) => {
    if (isIgnited) return;

    if (lastPosRef.current) {
      const dx = clientX - lastPosRef.current.x;
      const dy = clientY - lastPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 累积划动距离
      setScratchProgress(prev => {
        const newProgress = prev + dist * 0.005; // 灵敏度
        
        // 触发点火阈值
        if (newProgress >= 1.0 && !isIgnited) {
           triggerIgnition();
           return 1.0;
        }
        return newProgress;
      });
    }
    
    lastPosRef.current = { x: clientX, y: clientY };
  };

  const triggerIgnition = () => {
    setIsIgnited(true);
    if (navigator.vibrate) navigator.vibrate([50, 50, 100]); // 震动反馈
    setTimeout(() => {
      onIgnite();
    }, 1000); // 等待动画播放
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) { // 只有按下左键才算
        handleMove(e.clientX, e.clientY);
    }
  };

  if (isIgnited && scratchProgress >= 1.0) {
     // 已经点燃并且动画应该结束了，这里我们保持渲染直到父组件卸载它
     // 或者让它淡出
  }

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center transition-opacity duration-1000 ${isIgnited ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      onTouchMove={handleTouchMove}
      onMouseMove={handleMouseMove}
      onMouseDown={(e) => lastPosRef.current = {x: e.clientX, y: e.clientY}}
      onTouchStart={(e) => lastPosRef.current = {x: e.touches[0].clientX, y: e.touches[0].clientY}}
    >
      {/* 提示文字 */}
      <div className="text-zinc-600 font-mono text-xs tracking-[0.5em] uppercase animate-pulse mb-8 select-none">
        Strike to Ignite
      </div>

      {/* 视觉反馈：火柴头/擦痕 */}
      <div className="relative w-64 h-2 bg-zinc-900 rounded-full overflow-hidden">
         <div 
           className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-900 to-orange-500 transition-all duration-100"
           style={{ width: `${Math.min(scratchProgress * 100, 100)}%` }}
         />
         {/* 火花特效 (简单 CSS 模拟) */}
         {scratchProgress > 0.1 && !isIgnited && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-400 rounded-full blur-sm shadow-[0_0_15px_rgba(255,165,0,0.8)]"
              style={{ left: `${Math.min(scratchProgress * 100, 100)}%` }}
            />
         )}
      </div>

      {/* 点燃瞬间的白光闪烁 */}
      <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-300 ${isIgnited ? 'opacity-50' : 'opacity-0'}`} />
    </div>
  );
};

export default IgnitionOverlay;


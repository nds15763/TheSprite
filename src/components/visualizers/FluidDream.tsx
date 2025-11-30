import React, { useRef, useEffect } from 'react';
import { VisualizerProps } from '../../types/audio';

const FluidDream: React.FC<VisualizerProps> = ({ data, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);

  // Configuration for the "Dream Emulator" look
  const CONFIG = {
    width: 60,   
    height: 80,
    scale: 8,    
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const render = () => {
      if (!isActive) {
        // Fade out effect when inactive
        ctx.fillStyle = 'rgba(9, 9, 11, 0.1)';
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
        if (Math.random() > 0.9) { 
           frameIdRef.current = requestAnimationFrame(render);
        }
        return;
      }

      // Time flows faster with Energy
      timeRef.current += 0.02 + (data.energy * 0.1); 
      const t = timeRef.current;
      
      const imgData = ctx.getImageData(0, 0, CONFIG.width, CONFIG.height);
      const pixelData = imgData.data;

      // Metal Mode check
      const isHighEnergy = (data.energy || 0) > 0.6;
      
      for (let x = 0; x < CONFIG.width; x++) {
        for (let y = 0; y < CONFIG.height; y++) {
          const index = (x + y * CONFIG.width) * 4;

          const u = x / CONFIG.width;
          const v = y / CONFIG.height;

          // Energy distorts the space (The "Vibe")
          const energyWarp = data.energy * 15.0;
          
          let value = Math.sin(u * 5.0 + t);
          value += Math.sin((v * 5.0 + t) * 0.5);
          value += Math.sin((u + v + t) * 2.0);
          
          const cx = u + 0.5 * Math.sin(t * 0.3);
          const cy = v + 0.5 * Math.cos(t * 0.2);
          
          // The core fluid formula
          value += Math.sin(Math.sqrt(cx*cx + cy*cy + 1.0) * (5.0 + energyWarp));

          // Color Mapping
          // Base: Deep Blue
          let r = 20 + Math.sin(value + t) * 20;
          let g = 10 + Math.cos(value + t) * 10;
          let b = 60 + Math.sin(value + t * 0.5) * 40;

          // Reactivity: 
          // 1. Energy turns the world Purple/Red
          if (data.energy > 0.2) {
             r += data.energy * 80;
             b += data.energy * 40;
          }

          // 2. Highs add bright Cyan/White sparks
          if (data.energy > 0.3 && data.high > 0.4) {
             const spark = Math.sin(value * 10.0 + t * 5.0);
             if (spark > 0.9) {
                r += 100 * data.high;
                g += 150 * data.high;
                b += 200 * data.high;
             }
          }
          
          // 3. Soft Glow (High Energy)
          if (isHighEnergy) {
             r = Math.min(r + 40, 255);
             g = Math.min(g + 40, 255);
             b = Math.min(b + 60, 255);
          }

          pixelData[index] = r;
          pixelData[index + 1] = g;
          pixelData[index + 2] = b;
          pixelData[index + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Glitch Effect on Snare/High Energy
      if (data.energy > 0.4 && data.high > 0.3 && Math.random() > 0.7) {
         const sliceHeight = Math.floor(Math.random() * 10);
         const sliceY = Math.floor(Math.random() * (CONFIG.height - sliceHeight));
         const offset = Math.floor((Math.random() - 0.5) * 15); 
         
         ctx.globalCompositeOperation = 'screen';
         ctx.drawImage(canvas, 
            0, sliceY, CONFIG.width, sliceHeight, 
            offset, sliceY, CONFIG.width, sliceHeight
         );
         ctx.globalCompositeOperation = 'source-over';
      }

      frameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameIdRef.current);
  }, [isActive, data]);

  return (
    <div 
      className="absolute inset-0 transition-opacity duration-1000 pointer-events-none"
      style={{ opacity: isActive ? 1 : 0 }}
    >
      <canvas
        ref={canvasRef}
        width={CONFIG.width}
        height={CONFIG.height}
        className="w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-zinc-950/50 to-zinc-950" />
    </div>
  );
};

export default FluidDream;


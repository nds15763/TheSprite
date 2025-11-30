import React, { useRef, useEffect } from 'react';

interface VisionBackgroundProps {
  intensity: number; // 0 to 1, driven by audio volume
  isActive: boolean;
}

const VisionBackground: React.FC<VisionBackgroundProps> = ({ intensity, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);

  // Configuration for the "Dream Emulator" look
  const CONFIG = {
    width: 60,   // Extremely low res for that jagged PS1/LSD look
    height: 80,
    scale: 8,    // Scale up massively
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (!isActive) {
        // Fade to black slowly if inactive
        ctx.fillStyle = 'rgba(9, 9, 11, 0.1)';
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
        if (Math.random() > 0.9) { 
           frameIdRef.current = requestAnimationFrame(render);
        }
        return;
      }

      timeRef.current += 0.02 + (intensity * 0.1); // Time speeds up with voice
      const t = timeRef.current;
      
      const imgData = ctx.getImageData(0, 0, CONFIG.width, CONFIG.height);
      const data = imgData.data;

      // "Plasma" fluid algorithm
      for (let x = 0; x < CONFIG.width; x++) {
        for (let y = 0; y < CONFIG.height; y++) {
          const index = (x + y * CONFIG.width) * 4;

          // Normalized coordinates
          const u = x / CONFIG.width;
          const v = y / CONFIG.height;

          // Warping logic based on intensity (The "Drugcore" warping)
          const warp = intensity * 10.0;
          
          // Calculate plasma value
          // Base movement
          let value = Math.sin(u * 5.0 + t);
          value += Math.sin((v * 5.0 + t) * 0.5);
          value += Math.sin((u + v + t) * 2.0);
          // Circular movement
          const cx = u + 0.5 * Math.sin(t * 0.3);
          const cy = v + 0.5 * Math.cos(t * 0.2);
          value += Math.sin(Math.sqrt(cx*cx + cy*cy + 1.0) * (5.0 + warp));

          // Map value (-4 to 4) to colors
          // Theme: "Blue Night" (calm) -> "Neon/Negative" (intense)
          
          // Base Color (Deep Blue/Purple - Subconscious)
          let r = 20 + Math.sin(value + t) * 20;
          let g = 10 + Math.cos(value + t) * 10;
          let b = 60 + Math.sin(value + t * 0.5) * 40;

          // Reactivity: Inject Chaos colors when speaking
          if (intensity > 0.05) {
             // Add "Neon" layers based on voice volume
             const chaos = Math.min(intensity * 2, 1); // amplify effect
             
             // Flash Red/Magenta/Cyan
             r += Math.sin(value * 3.0) * 150 * chaos;
             g += Math.cos(value * 5.0) * 100 * chaos;
             b += Math.sin(value * 2.0 + t) * 100 * chaos;
          }

          data[index] = r;
          data[index + 1] = g;
          data[index + 2] = b;
          data[index + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Random "Glitch" artifacts (Data Moshing effect)
      if (intensity > 0.4 && Math.random() > 0.8) {
         const sliceHeight = Math.floor(Math.random() * 10);
         const sliceY = Math.floor(Math.random() * (CONFIG.height - sliceHeight));
         const offset = Math.floor((Math.random() - 0.5) * 10);
         ctx.drawImage(canvas, 
            0, sliceY, CONFIG.width, sliceHeight, 
            offset, sliceY, CONFIG.width, sliceHeight
         );
      }

      frameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameIdRef.current);
  }, [isActive, intensity]);

  return (
    <div 
      className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: isActive ? 1 : 0 }}
    >
      <canvas
        ref={canvasRef}
        width={CONFIG.width}
        height={CONFIG.height}
        className="w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Overlay vignette to keep focus on center (The Anchor) */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-zinc-950/50 to-zinc-950" />
    </div>
  );
};

export default VisionBackground;
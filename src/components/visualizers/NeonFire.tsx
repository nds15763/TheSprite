import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VisualizerProps, AudioData } from '../../types/audio';

// Configuration for the visual style
const CONFIG = {
  width: 280,
  height: 500,
  scale: 2,
  colors: {
    core: { r: 255, g: 255, b: 240 }, 
    inner: { r: 255, g: 220, b: 50 },  
    mid: { r: 255, g: 100, b: 0 },    
    outer: { r: 200, g: 40, b: 60 },  
    edge: { r: 100, g: 0, b: 80 },    
    base: { r: 60, g: 80, b: 200 },   
  }
};

const ASPECT_RATIO = CONFIG.width / CONFIG.height;
const DEFAULT_CONTAINER_SIZE = {
  width: CONFIG.width * CONFIG.scale,
  height: CONFIG.height * CONFIG.scale
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  radius: number;
}

const NeonFire: React.FC<VisualizerProps> = ({ data, isActive }) => {
  const getViewportSizedContainer = () => {
    if (typeof window === 'undefined') return DEFAULT_CONTAINER_SIZE;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const targetWidth = viewportHeight * ASPECT_RATIO;

    if (targetWidth > viewportWidth) {
      const adjustedHeight = viewportWidth / ASPECT_RATIO;
      return { width: viewportWidth, height: adjustedHeight };
    }
    return { width: targetWidth, height: viewportHeight };
  };

  const [containerSize, setContainerSize] = useState(() => getViewportSizedContainer());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameIdRef = useRef<number>(0);

  // Particle Logic
  const createParticle = (x: number, y: number, audio: AudioData): Particle => {
    const energy = audio.mid; 
    const chaosMod = audio.chaos || 0;
    
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * (1.5 + audio.high * 2 + chaosMod * 2), 
      vy: -1.5 - Math.random() * (1.5 + energy * 3.0), 
      life: 0.9 + energy * 0.8, 
      decay: 0.015 + Math.random() * 0.02,
      radius: (8 + Math.random() * 8) * (1 + audio.bass * 0.5), 
    };
  };

  const updateParticles = (ctx: CanvasRenderingContext2D, width: number, height: number, startY: number) => {
    if (isActive) {
      // Particle spawning logic
      let particleCount = 3;
      const volMod = data.vol * 3;
      particleCount = Math.max(1, Math.floor(particleCount + volMod * 2));

      if (data.chaos > 0.3) particleCount += 2;
      if (data.high > 0.3) particleCount += 2;
      
      for(let i=0; i<particleCount; i++) {
        const sourceX = width / 2;
        const sourceY = startY; 
        const chaosSpread = (data.chaos || 0) * 8;
        const spread = 14 + chaosSpread; 
        particlesRef.current.push(createParticle(sourceX + (Math.random()-0.5) * spread, sourceY, data));
      }
    }

    // Update Loop
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      
      p.x += Math.sin(p.y * 0.075 + frameIdRef.current * (0.1 + data.mid * 0.2)) * (0.4 + data.mid);
      
      p.life -= p.decay;
      p.radius -= 0.1; 

      if (p.life <= 0 || p.radius <= 1.0) {
        particlesRef.current.splice(i, 1);
      } else {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        gradient.addColorStop(0, `rgba(255, 255, 255, 0.25)`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const applyThreshold = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pData = imageData.data;
    const { colors } = CONFIG;
    const shift = (data.vol > 0.5) ? 20 : 0; 
    const isMetalMode = (data.energy || 0) > 0.8 && data.vol > 0.8;

    for (let i = 0; i < pData.length; i += 4) {
      const alpha = pData[i + 3];

      if (alpha > 10) {
        let r=0, g=0, b=0;
        let solid = false;

        if (isMetalMode && alpha > 150) {
            r = 255; g = 255; b = 255;
            solid = true;
        } else {
            if (alpha > 200 - shift) { 
              ({ r, g, b } = colors.core); solid = true;
            } else if (alpha > 140 - shift) { 
              ({ r, g, b } = colors.inner); solid = true;
            } else if (alpha > 100 - shift) { 
              ({ r, g, b } = colors.mid); solid = true;
            } else if (alpha > 60) { 
              ({ r, g, b } = colors.outer); solid = true;
            } else if (alpha > 20) { 
               // Base color logic simplified for NeonFire
               ({ r, g, b } = colors.base);
               if (data.bass > 0.4) { 
                  r = Math.min(r + 60, 100); 
                  g = Math.min(g + 60, 140); 
                  b = 255; 
               }
               solid = true;
            }
        }

        if (solid) {
          pData[i] = r;
          pData[i + 1] = g;
          pData[i + 2] = b;
          pData[i + 3] = 255; 
        } else {
            pData[i+3] = 0;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
    
    // Fire originates from bottom center
    const startY = CONFIG.height - 40;

    // 1. Draw Particles
    updateParticles(ctx, CONFIG.width, CONFIG.height, startY);
    
    // 2. Post-Process (Pixel Threshold)
    applyThreshold(ctx, CONFIG.width, CONFIG.height);
    
    frameIdRef.current = requestAnimationFrame(render);
  }, [isActive, data]);

  useEffect(() => {
    const updateSize = () => setContainerSize(getViewportSizedContainer());
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [render]);

  return (
    <div
      className={`relative flex justify-center items-end transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
      style={{
        width: containerSize.width,
        height: containerSize.height,
        maxHeight: '100vh'
      }}
    >
      <canvas
        ref={canvasRef}
        width={CONFIG.width}
        height={CONFIG.height}
        className="w-full h-full"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export default NeonFire;


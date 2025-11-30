import React, { useRef, useEffect, useCallback } from 'react';
import { AudioData } from '../App';

// Configuration for the visual style
const CONFIG = {
  width: 240, 
  height: 320, 
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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  radius: number;
}

interface PixelFireProps {
  isLit: boolean;
  onLight: () => void;
  audioData: AudioData;
  fuelProgress: number; // 0.0 (full) -> 1.0 (empty)
  lockViewToFire?: boolean; 
}

const PixelFire: React.FC<PixelFireProps> = ({ isLit, onLight, audioData, fuelProgress, lockViewToFire = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameIdRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);

  // Initialize Particles
  const createParticle = (x: number, y: number, audio: AudioData): Particle => {
    // Mids (Vocals/Music) drive the vertical speed (Height of flame)
    const energy = audio.mid; 
    
    return {
      x,
      y,
      // X Turbulence is affected by Highs (Flicker)
      vx: (Math.random() - 0.5) * (1.0 + audio.high * 4), 
      // Y Speed (Height) affected by Mids
      vy: -1.0 - Math.random() * (2.0 + energy * 4.5), 
      life: 1.0 + energy * 0.8,
      decay: 0.02 + Math.random() * 0.03,
      // Radius swells with Bass
      radius: (8 + Math.random() * 8) * (1 + audio.bass * 0.6), 
    };
  };

  const updateParticles = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTopY: number) => {
    if (isLit && fuelProgress < 0.98) {
      // Base particle count
      let particleCount = 3;
      
      // Music Reactivity: 
      // If Bass hits hard, spawn more base particles
      if (audioData.bass > 0.4) particleCount += 2;
      // If Highs hit hard (snare/hi-hat), spawn sparky particles
      if (audioData.high > 0.4) particleCount += 2;
      
      for(let i=0; i<particleCount; i++) {
        const sourceX = width / 2;
        const sourceY = currentTopY + 5; 
        const spread = 14 * (1 - fuelProgress * 0.5); 
        particlesRef.current.push(createParticle(sourceX + (Math.random()-0.5) * spread, sourceY, audioData));
      }
    }

    // Update existing particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      
      // Waving motion driven by Mids (Melody)
      p.x += Math.sin(p.y * 0.075 + frameIdRef.current * (0.1 + audioData.mid * 0.2)) * (0.4 + audioData.mid);
      
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

  const drawMatchstick = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTopY: number) => {
    const cx = Math.floor(width / 2);
    const startY = height / 2 + 20;
    const stickLength = 100;
    const stickWidth = 12; 
    const headWidth = 12;

    if (fuelProgress >= 1.0) return;

    const bottomY = startY + stickLength;
    const headThresholdY = startY + (stickLength * 0.15);
    const burnY = currentTopY;

    // --- Draw Wood Stick ---
    const stickTopY = Math.max(burnY, headThresholdY);
    if (stickTopY < bottomY) {
        const x = cx - stickWidth / 2;
        const h = bottomY - stickTopY;
        ctx.fillStyle = "#C19A6B";
        ctx.fillRect(x, stickTopY, stickWidth, h);
        ctx.fillStyle = "#8B5A2B";
        ctx.fillRect(x + stickWidth - 4, stickTopY, 4, h);
        
        if (burnY >= headThresholdY) {
            // The stick burn glow pulsates with Bass
            ctx.fillStyle = audioData.bass > 0.5 ? "#FFFFFF" : "#FFDD88"; 
            ctx.fillRect(x, stickTopY, stickWidth, 2);
        }
    }

    // --- Draw Blocky Head ---
    if (burnY < headThresholdY) {
        const headX = cx - headWidth / 2;
        const currentHeadH = headThresholdY - burnY;
        ctx.fillStyle = "#A41212";
        ctx.fillRect(headX, burnY, headWidth, currentHeadH);
        ctx.fillStyle = "#680B0B"; 
        ctx.fillRect(headX + headWidth - 4, burnY, 4, currentHeadH);

        // Head burn glow
        ctx.fillStyle = "#FFAA00"; 
        ctx.fillRect(headX, burnY, headWidth, 3);
    }
  };

  const applyThreshold = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTopY: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const { colors } = CONFIG;

    // React to Volume: If loud, colors shift hotter
    const shift = audioData.vol > 0.5 ? 20 : 0; 

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];

      if (alpha > 10) {
        let r=0, g=0, b=0;
        let solid = false;

        if (alpha > 200 - shift) { 
          ({ r, g, b } = colors.core);
          solid = true;
        } else if (alpha > 140 - shift) { 
          ({ r, g, b } = colors.inner);
          solid = true;
        } else if (alpha > 100 - shift) { 
          ({ r, g, b } = colors.mid);
          solid = true;
        } else if (alpha > 60) { 
          ({ r, g, b } = colors.outer);
          solid = true;
        } else if (alpha > 20) { 
          const pixelIndex = i / 4;
          const y = Math.floor(pixelIndex / width);
          const visualFlameBaseY = lockViewToFire ? (height / 2 + 20) : currentTopY;
          
          if (y > visualFlameBaseY - 15) {
             ({ r, g, b } = colors.base);
             // Bass Interaction: If bass is strong, base turns bright neon violet
             if (audioData.bass > 0.4) { r = 180; g = 50; b = 255; }
          } else {
             ({ r, g, b } = colors.edge);
          }
          solid = true;
        }

        if (solid) {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255; 
        } else {
            data[i+3] = 0;
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
    const startY = CONFIG.height / 2 + 20;
    const stickLength = 100;
    const currentTopY = startY + (stickLength * fuelProgress);

    // 1. Draw Particles
    ctx.save();
    if (lockViewToFire) {
       ctx.translate(0, (startY - currentTopY));
    }
    updateParticles(ctx, CONFIG.width, CONFIG.height, currentTopY);
    ctx.restore();

    // 2. Post-Process
    applyThreshold(ctx, CONFIG.width, CONFIG.height, currentTopY);
    
    // 3. Draw Matchstick
    ctx.save();
    if (lockViewToFire) {
       ctx.translate(0, (startY - currentTopY));
    }
    drawMatchstick(ctx, CONFIG.width, CONFIG.height, currentTopY);
    ctx.restore();

    frameIdRef.current = requestAnimationFrame(render);
  }, [isLit, audioData, fuelProgress, lockViewToFire]);

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [render]);

  // Input Handling
  const checkIgnition = (x: number, y: number) => {
      if (isLit) return;
      const matchHeadX = CONFIG.width / 2;
      const matchHeadY = CONFIG.height / 2 + 20;
      const dist = Math.sqrt(Math.pow(x - matchHeadX, 2) + Math.pow(y - matchHeadY, 2));
      if (dist < 40) onLight();
  };

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
    }
    const scaleX = CONFIG.width / rect.width;
    const scaleY = CONFIG.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      isDraggingRef.current = true;
      const pos = getCanvasCoordinates(e);
      lastPosRef.current = pos;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDraggingRef.current) return;
      const pos = getCanvasCoordinates(e);
      checkIgnition(pos.x, pos.y);
      lastPosRef.current = pos;
  };

  const handleEnd = () => {
      isDraggingRef.current = false;
      lastPosRef.current = null;
  };

  return (
    <div className="relative group cursor-pointer z-20" style={{ width: CONFIG.width * CONFIG.scale, height: CONFIG.height * CONFIG.scale }}>
      <canvas
        ref={canvasRef}
        width={CONFIG.width}
        height={CONFIG.height}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        className="w-full h-full" 
        style={{
          imageRendering: 'pixelated',
          touchAction: 'none'
        }}
      />
    </div>
  );
};

export default PixelFire;
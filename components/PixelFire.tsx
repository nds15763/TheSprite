import React, { useRef, useEffect, useCallback, useState } from 'react';
import { AudioData } from '../App';

  // Configuration for the visual style
  // Balanced dimensions: wider flame, controlled height
  const CONFIG = {
    width: 280,  // Wider canvas for fuller flame
    height: 500, // Increased height to prevent clipping 
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

interface PixelFireProps {
  isLit: boolean;
  onLight: () => void;
  audioData: AudioData;
  fuelProgress: number; // 0.0 (full) -> 1.0 (empty)
  lockViewToFire?: boolean; 
}

const PixelFire: React.FC<PixelFireProps> = ({ isLit, onLight, audioData, fuelProgress, lockViewToFire = false }) => {
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
  const isDraggingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);

  // Initialize Particles
  const createParticle = (x: number, y: number, audio: AudioData): Particle => {
    // Mids (Vocals/Music) drive the vertical speed (Height of flame)
    const energy = audio.mid; 
    // Chaos affects horizontal velocity range
    const chaosMod = audio.chaos || 0;
    
    return {
      x,
      y,
      // X Turbulence: Moderate horizontal spread for fuller flame
      vx: (Math.random() - 0.5) * (1.5 + audio.high * 2 + chaosMod * 2), 
      // Y Speed: Moderate upward velocity - not too tall
      vy: -1.5 - Math.random() * (1.5 + energy * 3.0), 
      // Life: Moderate life for controlled height
      life: 0.9 + energy * 0.8, 
      decay: 0.015 + Math.random() * 0.02,
      // Radius: Larger base radius for fuller flame
      radius: (8 + Math.random() * 8) * (1 + audio.bass * 0.5), 
    };
  };

  const updateParticles = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTopY: number) => {
    if (isLit && fuelProgress < 0.98) {
      // Base particle count
      let particleCount = 3;
      
      // Music Reactivity: 
      // Energy Density affects particle count multiplier
      // Vol affects particle count drastically
      const volMod = audioData.vol * 3; // 0 to 3
      particleCount = Math.max(1, Math.floor(particleCount + volMod * 2));

      // If Chaos hits hard, spawn more base particles
      if ((audioData.chaos || 0) > 0.3) particleCount += 2;
      // If Highs hit hard (snare/hi-hat), spawn sparky particles
      if (audioData.high > 0.3) particleCount += 2;
      
      for(let i=0; i<particleCount; i++) {
        const sourceX = width / 2;
        const sourceY = currentTopY + 5; 
        // Spread: Wider base spread for fuller flame
        const chaosSpread = (audioData.chaos || 0) * 8;
        const spread = 14 * (1 - fuelProgress * 0.5) + chaosSpread; 
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
    // Matchstick stick to the bottom, almost touching edge
    const startY = height - 40; 
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
    const shift = (audioData.vol > 0.5) ? 20 : 0; 

    // Metal Mode: If energy is super high, fire turns White Hot
    // High Vol + High Energy + High Bass
    const isMetalMode = (audioData.energy || 0) > 0.8 && audioData.vol > 0.8;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];

      if (alpha > 10) {
        let r=0, g=0, b=0;
        let solid = false;

        // White Hot Core override for Metal
        if (isMetalMode && alpha > 150) {
            r = 255; g = 255; b = 255;
            solid = true;
        } else {
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
              const visualFlameBaseY = lockViewToFire ? (height - 40) : currentTopY;
              
              // Improved Base Logic:
              // 1. No hard cutoff: Use distance from base for smooth transition
              // 2. No color flipping: Keep it blue, just brighter on bass
              const distFromBase = Math.abs(y - visualFlameBaseY);
              
              if (distFromBase < 20) {
                 ({ r, g, b } = colors.base);
                 // Bass makes the blue brighter, not purple
                 if (audioData.bass > 0.4) { 
                    r = Math.min(r + 60, 100); 
                    g = Math.min(g + 60, 140); 
                    b = 255; 
                 }
              } else {
                 ({ r, g, b } = colors.edge);
              }
              solid = true;
            }
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
    // Matchstick stick to the bottom, almost touching edge
    const startY = CONFIG.height - 40;
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
    const updateSize = () => setContainerSize(getViewportSizedContainer());
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [render]);

  // Input Handling
  const checkIgnition = (x: number, y: number) => {
      if (isLit) return;
      const matchHeadX = CONFIG.width / 2;
      const matchHeadY = CONFIG.height - 40;
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
    <div
      className="relative group cursor-pointer z-20"
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

import React, { useRef, useEffect, useCallback } from 'react';

// Configuration for the visual style
const CONFIG = {
  // Doubled resolution for sharper "High-Def" pixel art
  width: 240, 
  height: 320, 
  scale: 2, // Reduced scale so the on-screen size remains the same (480x640)
  particleCount: 100, // Increased slightly for smoother density at higher res
  colors: {
    core: { r: 255, g: 255, b: 220 }, // White/Yellow Core
    inner: { r: 255, g: 200, b: 0 },  // Bright Yellow
    mid: { r: 255, g: 100, b: 0 },    // Orange
    outer: { r: 200, g: 20, b: 60 },  // Deep Red
    edge: { r: 128, g: 0, b: 80 },    // Purple/Magenta Edge
    base: { r: 60, g: 80, b: 200 },   // Blue chemical reaction at base
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
}

const PixelFire: React.FC<PixelFireProps> = ({ isLit, onLight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameIdRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);

  // Initialize Particles
  const createParticle = (x: number, y: number): Particle => ({
    x,
    y,
    // Physics scaled up by 2x for new resolution
    vx: (Math.random() - 0.5) * 1.0, 
    vy: -1.0 - Math.random() * 2.4, 
    life: 1.0,
    decay: 0.02 + Math.random() * 0.03,
    // Radius scaled up ~2x
    radius: 8 + Math.random() * 10, 
  });

  const updateParticles = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // If lit, add new particles at the source constantly
    if (isLit) {
      // Add a few particles per frame to maintain density
      for(let i=0; i<3; i++) {
        // Source position: tip of the match
        const sourceX = width / 2;
        const sourceY = height / 2 + 20; // Offset scaled for new height
        // Spread scaled for new width
        particlesRef.current.push(createParticle(sourceX + (Math.random()-0.5)*12, sourceY));
      }
    }

    // Update existing particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      
      // Add some sinusoidal wave motion for "flame flicker"
      // Adjusted frequency and amplitude for new resolution
      p.x += Math.sin(p.y * 0.075) * 0.4;
      
      p.life -= p.decay;
      p.radius -= 0.1; // Shrink faster to match larger start size

      // Remove dead particles
      if (p.life <= 0 || p.radius <= 1.0) {
        particlesRef.current.splice(i, 1);
      } else {
        // Draw particle as a blurred circle (Metaball basis)
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

  const drawMatchstick = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2 + 20; // Match head center (scaled offset)

    // Stick
    ctx.strokeStyle = "#d4a373"; // Light wood
    ctx.lineWidth = 8; // Scaled thickness
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy + 100); // Scaled coordinates
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Stick Shadow (gives it the marker 3D feel)
    ctx.strokeStyle = "#8b5e34"; 
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy + 100);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();

    // Match Head
    ctx.fillStyle = "#5e1914"; // Dark brownish red
    ctx.beginPath();
    // Ellipse for the head, rotated slightly, scaled sizes
    ctx.ellipse(cx, cy, 12, 14, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Highlight on match head (marker style)
    if (!isLit) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.ellipse(cx - 4, cy - 4, 4, 6, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
    }
  };

  // The Magic: Threshold Rendering
  const applyThreshold = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const { colors } = CONFIG;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]; // The "Heat" map

      if (alpha > 10) {
        let r=0, g=0, b=0;
        let solid = false;

        // Color mapping based on density (alpha)
        if (alpha > 200) { // Core
          ({ r, g, b } = colors.core);
          solid = true;
        } else if (alpha > 140) { // Inner Yellow
          ({ r, g, b } = colors.inner);
          solid = true;
        } else if (alpha > 100) { // Mid Orange
          ({ r, g, b } = colors.mid);
          solid = true;
        } else if (alpha > 60) { // Outer Red
          ({ r, g, b } = colors.outer);
          solid = true;
        } else if (alpha > 20) { // Edge Purple or Blue Base
          
          // Determine if we are at the base of the flame (chemical reaction color)
          const pixelIndex = i / 4;
          const y = Math.floor(pixelIndex / width);
          const centerX = width / 2;
          const x = pixelIndex % width;
          
          // Scaled check logic for base color
          if (y > height / 2 + 10 && Math.abs(x - centerX) < 30) {
             ({ r, g, b } = colors.base);
          } else {
             ({ r, g, b } = colors.edge);
          }
          solid = true;
        }

        if (solid) {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255; // Force full opacity for "Marker" look
        } else {
            // Clean up low alpha noise
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

    // 1. Clear
    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

    // 2. Draw Particles (Heat Map)
    // IMPORTANT: We draw particles *first* to calculate the fire shape
    updateParticles(ctx, CONFIG.width, CONFIG.height);

    // 3. Apply Threshold (Convert Heat Map to Flat Colors)
    applyThreshold(ctx, CONFIG.width, CONFIG.height);

    // 4. Draw Matchstick
    drawMatchstick(ctx, CONFIG.width, CONFIG.height);

    frameIdRef.current = requestAnimationFrame(render);
  }, [isLit]);

  // Animation Loop
  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [render]);

  // Handle Swipe/Interaction
  const checkIgnition = (x: number, y: number) => {
      if (isLit) return;
      
      const matchHeadX = CONFIG.width / 2;
      const matchHeadY = CONFIG.height / 2 + 20;
      
      const dist = Math.sqrt(Math.pow(x - matchHeadX, 2) + Math.pow(y - matchHeadY, 2));
      
      // Increased hitbox size for new resolution
      if (dist < 40) {
          onLight();
      }
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

    // Map screen coordinates to internal canvas coordinates
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
      
      // Check for ignition if crossing the match head
      checkIgnition(pos.x, pos.y);
      
      lastPosRef.current = pos;
  };

  const handleEnd = () => {
      isDraggingRef.current = false;
      lastPosRef.current = null;
  };

  return (
    <div className="relative group cursor-pointer" style={{ width: CONFIG.width * CONFIG.scale, height: CONFIG.height * CONFIG.scale }}>
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
        className="w-full h-full bg-zinc-900 rounded-lg shadow-2xl shadow-orange-900/10"
        style={{
          imageRendering: 'pixelated', // CRITICAL for the style
        }}
      />
      {/* Decorative Glow behind the canvas */}
      {isLit && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-500/20 blur-[60px] rounded-full pointer-events-none transition-opacity duration-1000" />
      )}
    </div>
  );
};

export default PixelFire;
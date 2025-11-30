import React, { useRef, useEffect, useCallback } from 'react';

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
  intensity: number; // 0.0 - 1.0 (Audio volume)
  fuelProgress: number; // 0.0 (full) -> 1.0 (empty)
  lockViewToFire?: boolean; // If true, camera tracks the burning tip
}

const PixelFire: React.FC<PixelFireProps> = ({ isLit, onLight, intensity, fuelProgress, lockViewToFire = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameIdRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{x: number, y: number} | null>(null);

  // Initialize Particles
  const createParticle = (x: number, y: number, intensityMod: number): Particle => ({
    x,
    y,
    // Physics affected by voice intensity
    vx: (Math.random() - 0.5) * (1.0 + intensityMod * 2), 
    vy: -1.0 - Math.random() * (2.4 + intensityMod * 3), 
    life: 1.0 + intensityMod * 0.5,
    decay: 0.02 + Math.random() * 0.03,
    // Radius swells with voice
    radius: (8 + Math.random() * 8) * (1 + intensityMod * 0.5), 
  });

  const updateParticles = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTopY: number) => {
    // If lit, add new particles at the source constantly
    if (isLit && fuelProgress < 0.98) {
      // Audio boost
      const particleCount = 3 + Math.floor(intensity * 5);
      
      for(let i=0; i<particleCount; i++) {
        const sourceX = width / 2;
        // Emit from slightly below the top to blend with the object
        const sourceY = currentTopY + 5; 
        
        // Spread
        const spread = 14 * (1 - fuelProgress * 0.5); 
        particlesRef.current.push(createParticle(sourceX + (Math.random()-0.5) * spread, sourceY, intensity));
      }
    }

    // Update existing particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      
      // Turbulent flow (Synesthesia feeling)
      p.x += Math.sin(p.y * 0.075 + frameIdRef.current * 0.1) * (0.4 + intensity);
      
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
    const stickWidth = 12; // Blocky width
    const headWidth = 12;  // Matches stick width now

    // Stop drawing if completely burnt
    if (fuelProgress >= 1.0) return;

    const bottomY = startY + stickLength;
    const headThresholdY = startY + (stickLength * 0.15);

    // Using currentTopY passed from render loop
    const burnY = currentTopY;

    // --- Draw Wood Stick ---
    const stickTopY = Math.max(burnY, headThresholdY);
    
    if (stickTopY < bottomY) {
        const x = cx - stickWidth / 2;
        const h = bottomY - stickTopY;
        
        // Main Wood
        ctx.fillStyle = "#C19A6B"; // Light tan/wood
        ctx.fillRect(x, stickTopY, stickWidth, h);

        // Side Shadow (Right) - Voxel look
        ctx.fillStyle = "#8B5A2B"; // Darker wood
        ctx.fillRect(x + stickWidth - 4, stickTopY, 4, h);
        
        // Burning Tip Highlight (Stick phase)
        if (burnY >= headThresholdY) {
            ctx.fillStyle = "#FFDD88"; 
            ctx.fillRect(x, stickTopY, stickWidth, 2);
        }
    }

    // --- Draw Blocky Head ---
    if (burnY < headThresholdY) {
        const headX = cx - headWidth / 2;
        const currentHeadH = headThresholdY - burnY;
        
        // Main Red Block
        ctx.fillStyle = "#A41212"; // Deep red
        ctx.fillRect(headX, burnY, headWidth, currentHeadH);

        // Side Shadow (Right)
        ctx.fillStyle = "#680B0B"; // Darker red
        ctx.fillRect(headX + headWidth - 4, burnY, 4, currentHeadH);

        // Burning Tip Highlight (Head phase)
        ctx.fillStyle = "#FFAA00"; 
        ctx.fillRect(headX, burnY, headWidth, 3);
    }
  };

  const applyThreshold = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTopY: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const { colors } = CONFIG;

    // We only scan pixels where we expect fire. Optimization.
    // But since translation happens, we scan the whole viewport.
    
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];

      if (alpha > 10) {
        let r=0, g=0, b=0;
        let solid = false;

        const shift = intensity > 0.5 ? 20 : 0; 

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
          // Base logic - Purple/Blue aura at the bottom of flame
          const pixelIndex = i / 4;
          const y = Math.floor(pixelIndex / width);
          
          // In translated context, we need to map y back relative to currentTopY?
          // Actually, since we draw the particles relative to logic coordinates, 
          // and visual output is flat pixels, we can just use visual Y relative to where the flame is visually.
          // If lockViewToFire is true, the flame base is always at startY.
          // If false, it's at currentTopY.
          
          const visualFlameBaseY = lockViewToFire ? (height / 2 + 20) : currentTopY;
          
          if (y > visualFlameBaseY - 15) {
             ({ r, g, b } = colors.base);
             if (intensity > 0.6) { r = 200; g = 0; b = 255; }
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
    
    // Physics Logic
    const startY = CONFIG.height / 2 + 20;
    const stickLength = 100;
    // Current logical top of the match
    const currentTopY = startY + (stickLength * fuelProgress);

    ctx.save();

    // Camera Follow Logic:
    // If locked, we translate the world UP so that currentTopY is always rendered at startY.
    // logicalY - currentTopY + startY = visualY
    // translate(0, startY - currentTopY)
    if (lockViewToFire) {
      const offsetY = startY - currentTopY;
      ctx.translate(0, offsetY);
    }

    // 1. Draw Fire Particles (in logical space)
    updateParticles(ctx, CONFIG.width, CONFIG.height, currentTopY);
    
    // 2. Draw Matchstick (in logical space)
    // Drawn before threshold so it can be behind fire? 
    // Actually originally it was after to be sharp.
    // But Threshold works on alpha. Matchstick is solid.
    // If we draw matchstick first, it might get 'thresholded' if we aren't careful, 
    // but matchstick uses fillRect (alpha 255), so threshold function just recolors it if we aren't careful.
    // The previous code drew matchstick AFTER threshold. 
    // But threshold reads data.
    // Let's keep drawing Matchstick LAST so it stays sharp and retains its own colors.
    
    // We need to apply threshold to particles ONLY.
    // But threshold scans the whole canvas.
    // So we draw particles -> Threshold -> Matchstick.
    
    // PROBLEM: Threshold uses putImageData. putImageData ignores context translation!
    // It places pixels directly in device coordinates.
    // So if we use translate(), get/putImageData works on the *viewport*, not the transformed space.
    // This is actually GOOD for us. Visual output is what we want to filter.
    
    // However, if we translate the particles, they are drawn at Screen Y.
    // Then getImageData gets Screen pixels.
    // Then we threshold them.
    // Then we draw matchstick.
    
    // BUT matchstick needs to be drawn with translation too.
    
    // Restore context for ImageData? No, ImageData doesn't care about context state.
    
    ctx.restore(); // Restore context to default (no translation) for direct pixel manip?
    // Wait, we need the particles to be drawn WITH translation first.
    // So the 'save' was for the particle draw.
    
    // Actually, let's keep the translation active for drawing particles.
    // Then restore.
    // Then 'Apply Threshold' reads the canvas (which now has particles at the correct visual spot).
    // Then 'Draw Matchstick'. But Matchstick needs to be at the correct visual spot too.
    
    // Refined Order:
    // 1. ctx.save(); ctx.translate(...); drawParticles(); ctx.restore();
    // 2. applyThreshold() -> Processes visual pixels.
    // 3. ctx.save(); ctx.translate(...); drawMatchstick(); ctx.restore();
    
    // 1. Draw Particles
    ctx.save();
    if (lockViewToFire) {
       ctx.translate(0, (startY - currentTopY));
    }
    // Note: updateParticles renders to canvas.
    // We pass ctx.
    // But updateParticles computes physics. Physics should be persistent?
    // Particles have x,y state.
    // If we use translate, we are moving the *camera*.
    // The particles exist in World Space.
    // So we just translate the camera (ctx) before drawing.
    // But updateParticles currently does physics AND drawing.
    // We should separate them or just rely on the fact that ctx is passed.
    
    // We need to decouple update from draw in updateParticles loop?
    // No, standard particle systems update & draw in one loop for efficiency in small demos.
    // But here, 'draw' uses ctx.arc().
    // So if ctx is translated, arc is drawn translated.
    // Physics (p.x, p.y) remains in World Space. This is correct.
    // BUT we check 'isLit' inside to spawn new particles.
    // Spawning should use World Space source (currentTopY). Correct.
    
    // One edge case: ClearRect.
    // We cleared at 0,0. That's fine.
    
    // Execute Part 1
    // We need to manually draw particles here or change the function signature?
    // updateParticles does physics updates. It modifies ref state.
    // We must only call updateParticles ONCE per frame.
    // So we can't separate easily without refactoring.
    // That's fine. The ctx is transformed.
    // wait... updateParticles spawns at 'currentTopY'.
    // If ctx is translated up by 'startY - currentTopY'.
    // A particle spawned at 'currentTopY' will be drawn at 'startY'.
    // This is exactly what we want (Visual lock).
    
    // Wait, updateParticles spawns particles and *adds them to array*.
    // Then it iterates array and draws.
    // This is fine.
    
    // Call Particles (Draws to canvas)
    // We pass currentTopY to use as emitter source.
    updateParticles(ctx, CONFIG.width, CONFIG.height, currentTopY);
    ctx.restore();

    // 2. Threshold (Visual Post-process)
    // This works on whatever is on the canvas (the translated particles).
    applyThreshold(ctx, CONFIG.width, CONFIG.height, currentTopY);
    
    // 3. Matchstick
    // Needs same translation
    ctx.save();
    if (lockViewToFire) {
       ctx.translate(0, (startY - currentTopY));
    }
    drawMatchstick(ctx, CONFIG.width, CONFIG.height, currentTopY);
    ctx.restore();

    frameIdRef.current = requestAnimationFrame(render);
  }, [isLit, intensity, fuelProgress, lockViewToFire]);

  useEffect(() => {
    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [render]);

  // Swipe Logic (Keep logic in Screen/Canvas space, simpler)
  const checkIgnition = (x: number, y: number) => {
      if (isLit) return;
      const matchHeadX = CONFIG.width / 2;
      const matchHeadY = CONFIG.height / 2 + 20;
      const dist = Math.sqrt(Math.pow(x - matchHeadX, 2) + Math.pow(y - matchHeadY, 2));
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
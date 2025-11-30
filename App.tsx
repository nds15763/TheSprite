import React, { useState, useEffect, useRef } from 'react';
import PixelFire from './components/PixelFire';
import VisionBackground from './components/VisionBackground';

// Types of experience phases
type Phase = 'IDLE' | 'BURNING' | 'RESIDUE';

// Residue data generator
const generateResidue = () => {
  const phrases = [
    "Time is glue.",
    "The static speaks in colors.",
    "You are the anchor.",
    "Melting clocks, frozen feet.",
    "Echoes of a future memory.",
    "The smoke remembers what you said.",
    "Drifting in the velvet void.",
    "A temporary constellation.",
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [audioIntensity, setAudioIntensity] = useState(0);
  const [fuel, setFuel] = useState(100); // 0-100%
  const [residueText, setResidueText] = useState("");
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>(0);

  // Initialize Audio Logic
  const startAudioListener = async () => {
    try {
      if (!audioContextRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        
        source.connect(analyser);
        analyser.fftSize = 64; // Low res for performance
        
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      updateAudioAnalysis();
    } catch (err) {
      console.error("Audio permission denied or error:", err);
    }
  };

  const updateAudioAnalysis = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average volume (simple intensity)
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const avg = sum / dataArrayRef.current.length;
    const normalized = Math.min(avg / 128, 1); // Normalize 0-1
    
    // Smooth dampening
    setAudioIntensity(prev => prev * 0.8 + normalized * 0.2);
    
    animationRef.current = requestAnimationFrame(updateAudioAnalysis);
  };

  // Fuel Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (phase === 'BURNING') {
      interval = setInterval(() => {
        setFuel(prev => {
          if (prev <= 0) {
             setPhase('RESIDUE');
             setResidueText(generateResidue());
             return 0;
          }
          // Burn rate calculation for ~3 minutes duration
          // 3 minutes = 180 seconds = 180,000 ms
          // Update interval = 50 ms
          // Total ticks = 180,000 / 50 = 3600 ticks
          // Base consumption = 100 fuel / 3600 ticks ≈ 0.028 fuel/tick
          
          const baseBurn = 0.028;
          // Voice accelerates burning up to 3x speed, creating dynamic time dilation
          const burnRate = baseBurn * (1 + audioIntensity * 2); 
          
          return prev - burnRate;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [phase, audioIntensity]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handleIgnite = () => {
    setPhase('BURNING');
    setFuel(100);
    startAudioListener();
    // Trigger haptic if available
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleRestart = () => {
    setPhase('IDLE');
    setFuel(100);
    setAudioIntensity(0);
  };

  // Helper for dynamic transforms
  const getTransformClass = () => {
    if (phase === 'RESIDUE') return 'scale-50 opacity-0';
    if (phase === 'BURNING') {
       // Updated Zoom and Position:
       // Scale 1.3: Keeps the fire distinct but not overwhelming
       // Translate Y 45vh: Pushed further down to ensure the stick is completely off-screen
       // even on taller screens, leaving only the flame tip visible at the bottom.
       return 'scale-[1.3] translate-y-[45vh]'; 
    }
    return 'scale-100 translate-y-0 opacity-100'; // IDLE
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-zinc-950 overflow-hidden select-none touch-none">
      
      {/* 1. Vision Background (The Subconscious) */}
      {/* Stays mounted but fades in/out based on phase */}
      <VisionBackground 
        intensity={audioIntensity} 
        isActive={phase === 'BURNING'} 
      />

      {/* 2. Main Content Layer */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* The Anchor (Matchstick) */}
        <div className={`transition-transform duration-[2000ms] ease-in-out ${getTransformClass()}`}>
           <PixelFire 
              isLit={phase === 'BURNING'} 
              onLight={handleIgnite}
              intensity={audioIntensity}
              fuelProgress={1 - (fuel / 100)}
              lockViewToFire={phase === 'BURNING'}
           />
        </div>

        {/* UI / Text Feedback */}
        <div className="absolute top-full mt-8 text-center pointer-events-none transition-opacity duration-500"
             style={{ opacity: phase === 'IDLE' ? 1 : 0 }}
        >
              <p className="text-zinc-600 font-mono text-xs tracking-[0.2em] uppercase animate-pulse">
                Friction Required
              </p>
        </div>

        {/* 3. The Residue (Card) */}
        {phase === 'RESIDUE' && (
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-zinc-900 border border-zinc-800 p-8 max-w-xs text-center animate-fade-in shadow-2xl transform rotate-1">
                 {/* Capture the 'vibe' of the trip */}
                 <div className="w-full h-32 bg-zinc-950 mb-6 overflow-hidden relative">
                    {/* A static slice of the vision */}
                    <VisionBackground intensity={0.8} isActive={true} />
                    <div className="absolute inset-0 bg-black/20" />
                 </div>
                 
                 <p className="text-zinc-300 font-serif italic text-lg mb-4 leading-relaxed">
                   "{residueText}"
                 </p>
                 
                 <div className="h-px w-12 bg-zinc-800 mx-auto my-6" />
                 
                 <button 
                   onClick={handleRestart}
                   className="pointer-events-auto text-xs font-mono text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors"
                 >
                   Ignite Again
                 </button>
              </div>
           </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px) rotate(1deg); }
          to { opacity: 1; transform: translateY(0) rotate(1deg); }
        }
        .animate-fade-in {
          animation: fade-in 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
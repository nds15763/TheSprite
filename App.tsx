import React, { useState, useEffect, useRef } from 'react';
import PixelFire from './components/PixelFire';
import VisionBackground from './components/VisionBackground';

// Types of experience phases
type Phase = 'IDLE' | 'BURNING' | 'RESIDUE';

// Detailed Audio Data structure
export interface AudioData {
  vol: number;  // Overall volume (0-1)
  bass: number; // Low freq (0-1) - Drives Background Pulse
  mid: number;  // Mid freq (0-1) - Drives Fire Shape
  high: number; // High freq (0-1) - Drives Sparks/Glitches
  energy: number; // Average energy density (0-1) - Genre detection
  chaos: number; // Rate of change (0-1) - Transient detection
}

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
  
  // Replaced simple intensity with complex audio data
  const [audioData, setAudioData] = useState<AudioData>({ vol: 0, bass: 0, mid: 0, high: 0, energy: 0, chaos: 0 });
  
  const [fuel, setFuel] = useState(100); // 0-100%
  const [residueText, setResidueText] = useState("");
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>(0);
  const prevVolRef = useRef<number>(0);
  const prevEnergyRef = useRef<number>(0);

  // Initialize Audio Logic
  const startAudioListener = async () => {
    try {
      if (!audioContextRef.current) {
        // Disable audio processing features that might filter out music (Echo Cancellation, Noise Suppression)
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } 
        });
        
        const track = stream.getAudioTracks()[0];
        console.log("Microphone connected:", track.label);

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        
        source.connect(analyser);
        analyser.fftSize = 2048; // Increased resolution for frequency separation
        analyser.smoothingTimeConstant = 0.5; // Snappier response for music
        
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
    
    const bufferLength = dataArrayRef.current.length;
    
    // Frequency Split Calculation
    // 0-255 range for data
    
    // Bass: 40Hz - 250Hz (approx bins 2-12 at 48kHz sample rate/2048 fft)
    let bassSum = 0;
    const bassStart = 2;
    const bassEnd = 12;
    const bassCount = bassEnd - bassStart;
    
    for (let i = bassStart; i < bassEnd; i++) bassSum += dataArrayRef.current[i];
    
    // Boost bass sensitivity
    const rawBass = (bassSum / bassCount) / 255;
    const bass = Math.min(rawBass * 1.5, 1);

    // Mids: 250Hz - 2kHz (approx bins 13-100)
    let midSum = 0;
    const midStart = 13;
    const midEnd = 100;
    const midCount = midEnd - midStart;
    
    for (let i = midStart; i < midEnd; i++) midSum += dataArrayRef.current[i];
    
    const rawMid = (midSum / midCount) / 255;
    const mid = Math.min(rawMid * 1.5, 1);

    // Highs: 2kHz+ (approx bins 101+)
    let highSum = 0;
    const highStart = 101;
    // We don't need to go all the way to 1024, energy drops off. 
    // Go to 512 (~10kHz)
    const highEnd = 512; 
    const highCount = highEnd - highStart;
    
    for (let i = highStart; i < highEnd; i++) highSum += dataArrayRef.current[i];
    
    const rawHigh = (highSum / highCount) / 255;
    const high = Math.min(rawHigh * 2.0, 1); // Highs need more boost usually

    // Energy Density: Average of all bands
    // We use a rolling average (Exponential Moving Average) for smoothness
    // Get previous energy from ref or default to 0
    const prevEnergy = prevEnergyRef.current;
    
    const totalSum = bassSum + midSum + highSum;
    const totalCount = bassCount + midCount + highCount;
    const rawEnergy = (totalSum / totalCount) / 255;
    
    // Smooth Factor: 0.05 means it takes ~20 frames (0.3s) to catch up
    // This creates the "Atmosphere" lag
    const energy = prevEnergy * 0.95 + rawEnergy * 1.5 * 0.05;
    
    // Store for next frame
    prevEnergyRef.current = energy;

    // Chaos: Transient detection (difference from last frame volume)
    // We need a ref to store previous volume
    const prevVol = prevVolRef.current;
    const currentVol = (bass + mid + high) / 3;
    let chaos = Math.abs(currentVol - prevVol) * 10.0; // Amplify changes
    chaos = Math.min(chaos, 1);
    
    // Store for next frame
    prevVolRef.current = currentVol;

    // Overall Volume
    const vol = Math.min(currentVol * 1.5, 1);

    // React State update
    // We update state for React rendering, but for 60fps canvas, 
    // components might ideally read from a ref, but passing props is okay for this complexity.
    setAudioData({
      vol,
      bass,
      mid,
      high,
      energy,
      chaos
    });
    
    // Debug Log (Throttled)
    if (Math.random() > 0.98) {
       console.log("Audio Stats:", { 
          vol: vol.toFixed(2), 
          energy: energy.toFixed(2), 
          ctxState: audioContextRef.current?.state,
          micActive: audioContextRef.current?.state === 'running'
       });
    }
    
    animationRef.current = requestAnimationFrame(updateAudioAnalysis);
  };

  // Fuel Logic - Disabled: Fire burns forever now
  // useEffect(() => {
  //   let interval: ReturnType<typeof setInterval>;
  //   if (phase === 'BURNING') {
  //     interval = setInterval(() => {
  //       setFuel(prev => {
  //         if (prev <= 0) {
  //            setPhase('RESIDUE');
  //            setResidueText(generateResidue());
  //            return 0;
  //         }
  //         const baseBurn = 0.028;
  //         const burnRate = baseBurn * (1 + audioData.vol * 2); 
  //         return prev - burnRate;
  //       });
  //     }, 50);
  //   }
  //   return () => clearInterval(interval);
  // }, [phase, audioData.vol]);

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
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleRestart = () => {
    setPhase('IDLE');
    setFuel(100);
    setAudioData({ vol: 0, bass: 0, mid: 0, high: 0, energy: 0, chaos: 0 });
  };

  // Helper for dynamic transforms
  const getTransformClass = () => {
    if (phase === 'RESIDUE') return 'scale-50 opacity-0';
    if (phase === 'BURNING') {
       // Burning mode: No translate needed since flame is internally at bottom
       return 'scale-[1.0]'; 
    }
    return 'scale-100 translate-y-0 opacity-100'; // IDLE
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-zinc-950 overflow-hidden select-none touch-none">
      
      {/* 1. Vision Background (The Subconscious) */}
      <VisionBackground 
        audioData={audioData} 
        isActive={phase === 'BURNING'} 
      />

      {/* 2. Main Content Layer */}
      <div className="relative z-10 flex flex-col items-center justify-end min-h-screen pb-0">
        
        {/* The Anchor (Matchstick) */}
        <div className={`transition-all duration-[2000ms] ease-in-out ${getTransformClass()}`}>
           <PixelFire 
              isLit={phase === 'BURNING'} 
              onLight={handleIgnite}
              audioData={audioData}
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
                 <div className="w-full h-32 bg-zinc-950 mb-6 overflow-hidden relative">
                    {/* Residue snapshot uses current audio mood */}
                    <VisionBackground audioData={{vol: 0.5, bass: 0.8, mid: 0.2, high: 0.1, energy: 0.6, chaos: 0.3}} isActive={true} />
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
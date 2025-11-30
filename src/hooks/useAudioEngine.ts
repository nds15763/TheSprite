import { useState, useRef, useEffect } from 'react';
import { AudioData, AudioEvent } from '../types/audio';

export const useAudioEngine = () => {
  const [audioData, setAudioData] = useState<AudioData>({ 
    vol: 0, bass: 0, mid: 0, high: 0, energy: 0, chaos: 0 
  });
  const [recentEvents, setRecentEvents] = useState<AudioEvent[]>([]);
  
  // Refs for Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>(0);
  
  // Refs for Analysis State
  const prevVolRef = useRef<number>(0);
  const prevEnergyRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);

  const startAudioListener = async () => {
    try {
      if (!audioContextRef.current) {
        // 配置音频流，关闭自动增益和降噪，以获取原始音乐信号
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } 
        });
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        
        source.connect(analyser);
        analyser.fftSize = 2048; 
        analyser.smoothingTimeConstant = 0.5; // 响应速度
        
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyzeFrame();
    } catch (err) {
      console.error("Audio permission denied or error:", err);
    }
  };

  const analyzeFrame = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // === 1. 频段分析 ===
    // Bass: 40Hz - 250Hz (bins 2-12 @ 48kHz)
    let bassSum = 0;
    for (let i = 2; i < 12; i++) bassSum += dataArrayRef.current[i];
    const bass = Math.min((bassSum / 10) / 255 * 1.5, 1);

    // Mids: 250Hz - 2kHz (bins 13-100)
    let midSum = 0;
    for (let i = 13; i < 100; i++) midSum += dataArrayRef.current[i];
    const mid = Math.min((midSum / 87) / 255 * 1.5, 1);

    // Highs: 2kHz - 10kHz (bins 101-512)
    let highSum = 0;
    for (let i = 101; i < 512; i++) highSum += dataArrayRef.current[i];
    const high = Math.min((highSum / 411) / 255 * 2.0, 1);

    // Energy (EMA Smoothing)
    const currentVol = (bass + mid + high) / 3;
    const rawEnergy = (bassSum + midSum + highSum) / (10 + 87 + 411) / 255;
    const energy = prevEnergyRef.current * 0.95 + rawEnergy * 1.5 * 0.05;
    prevEnergyRef.current = energy;

    // Chaos (Transient Detection)
    let chaos = Math.abs(currentVol - prevVolRef.current) * 10.0;
    chaos = Math.min(chaos, 1);

    // === 2. 事件检测 (Event Detection) ===
    const currentEvents: AudioEvent[] = [];
    const now = Date.now();

    // Detect Note Onset (Sudden Volume Spike)
    // 类似于吉他拨弦的瞬间
    if (chaos > 0.4 && (now - lastBeatTimeRef.current > 100)) {
       currentEvents.push({
         type: 'ON_NOTE_ONSET',
         intensity: chaos,
         timestamp: now
       });
       lastBeatTimeRef.current = now;
    }

    // Detect Heavy Beat (Low End Kick)
    if (bass > 0.8 && chaos > 0.2 && (now - lastBeatTimeRef.current > 300)) {
       currentEvents.push({
         type: 'ON_BEAT',
         intensity: bass,
         timestamp: now
       });
    }

    prevVolRef.current = currentVol;

    // Update State
    setAudioData({
      vol: Math.min(currentVol * 1.5, 1),
      bass,
      mid,
      high,
      energy,
      chaos
    });

    if (currentEvents.length > 0) {
      setRecentEvents(currentEvents);
    }

    animationRef.current = requestAnimationFrame(analyzeFrame);
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return { audioData, recentEvents, startAudioListener };
};


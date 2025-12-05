import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { ToyProps } from '../../core/types';

// --- Types ---
export interface ThemeConfig {
  name: string;
  skyColor: string;
  waterColor: string;
  waterOpacity: number;
  boatColor: string;
  waveHeight: number;
  waveSpeed: number;
  sunColor: string;
  description: string;
}

// Augment the global JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// --- Default Theme ---
const DEFAULT_THEME: ThemeConfig = {
  name: "Ocean Blue",
  skyColor: "#f5f5f5",
  waterColor: "#0066aa",
  waterOpacity: 0.9,
  boatColor: "#ffcc00",
  waveHeight: 0.3,
  waveSpeed: 1.0,
  sunColor: "#ffffff",
  description: "Clear blue ocean"
};

// --- Constants ---
const WATER_WIDTH = 60; // Wide enough to cover screen when tilted
const WATER_DEPTH = 30;
const WATER_HEIGHT = 20; // Deep enough to fill bottom
const RES_X = 50; // Grid resolution for waves
const RES_Z = 20;

const Boat = ({ theme, waterTilt }: { theme: ThemeConfig, waterTilt: { x: number, z: number } }) => {
  const group = useRef<THREE.Group>(null);
  
  // Boat Physics State (Local Space relative to Water Surface)
  const physics = useRef({
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    wobble: 0
  });
  
  useFrame((state, delta) => {
    if (!group.current) return;
    
    // 1. Gravity Sliding Logic
    // We are inside the Water Group, which rotates.
    // Gravity in World is (0, -1, 0).
    // If Water tilts Z by angle alpha, Gravity X component in Local is sin(alpha).
    // WaterTilt.z is the rotation of the water around Z axis.
    
    // Slide force based on tilt
    const gravityForceX = Math.sin(-waterTilt.z) * 25.0; // Slide left/right
    const gravityForceZ = Math.sin(-waterTilt.x) * 25.0; // Slide forward/back
    
    physics.current.vx += gravityForceX * delta;
    physics.current.vz += gravityForceZ * delta;
    
    // Drag/Friction
    physics.current.vx *= 0.95;
    physics.current.vz *= 0.95;
    
    // Update Position
    physics.current.x += physics.current.vx * delta;
    physics.current.z += physics.current.vz * delta;
    
    // Wall Bouncing (Local Limits)
    // The screen width in world units at Z=0 is approx 20 units wide.
    const limitX = 9; // Approx half screen width
    const limitZ = 4; 
    
    if (physics.current.x > limitX) { physics.current.x = limitX; physics.current.vx *= -0.5; }
    if (physics.current.x < -limitX) { physics.current.x = -limitX; physics.current.vx *= -0.5; }
    if (physics.current.z > limitZ) { physics.current.z = limitZ; physics.current.vz *= -0.5; }
    if (physics.current.z < -limitZ) { physics.current.z = -limitZ; physics.current.vz *= -0.5; }
    // 2. Visual Updates
    const time = state.clock.elapsedTime;
    
    // Sample "Wave" height approx (matches the vertex shader logic conceptually)
    // Simple composite wave
    const waveY = Math.sin(physics.current.x * 0.5 + time * theme.waveSpeed) * theme.waveHeight 
                + Math.cos(physics.current.z * 0.5 + time * theme.waveSpeed * 1.3) * theme.waveHeight * 0.5;
    group.current.position.set(physics.current.x, waveY + 0.2, physics.current.z);
    
    // Rotation: Match wave normal + tilt inertia
    // If moving fast X, tilt back slightly (hydrodynamics)
    const tiltLag = physics.current.vx * 0.05;
    
    group.current.rotation.z = Math.cos(time * 2) * 0.05 - tiltLag; 
    group.current.rotation.x = Math.sin(time * 1.5) * 0.05 + (physics.current.vz * 0.05);
    group.current.rotation.y = Math.sin(time * 0.5) * 0.1; // Gentle yaw
  });
  return (
    <group ref={group}>
      <group scale={0.4}>
          {/* Hull */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.2, 0.8, 1.4]} />
            <meshStandardMaterial color={theme.boatColor} roughness={0.2} flatShading />
          </mesh>
          {/* Deck stripe */}
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[2.3, 0.15, 1.5]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} flatShading />
          </mesh>
          {/* Cabin */}
          <mesh position={[-0.4, 0.8, 0]}>
            <boxGeometry args={[1.1, 0.9, 1.1]} />
            <meshStandardMaterial color={theme.boatColor} roughness={0.2} flatShading />
          </mesh>
          {/* Beak */}
          <mesh position={[0.4, 0.7, 0]} rotation={[0, 0, -Math.PI/2]}>
             <coneGeometry args={[0.3, 0.6, 16]} />
             <meshStandardMaterial color="#ffaa00" roughness={0.4} flatShading />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.1, 0.9, 0.56]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color="black" roughness={0.0} flatShading />
          </mesh>
           <mesh position={[-0.1, 0.9, -0.56]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color="black" roughness={0.0} flatShading />
          </mesh>
      </group>
    </group>
  );
};

const WaterVolume = ({ theme, tilt, setWaterRot }: { theme: ThemeConfig, tilt: { x: number, y: number }, setWaterRot: (r: {x:number, z:number}) => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const noise3D = useMemo(() => createNoise3D(), []);
  
  // Physics State for the Water Container Rotation
  const sim = useRef({
    rx: 0, // Current rotation X (Pitch)
    rz: 0, // Current rotation Z (Roll)
    vrx: 0, // Velocity X
    vrz: 0  // Velocity Z
  });
  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;
    // --- 1. Container Physics (Spring Damper System) ---
    // Target: We want the water surface to stay "Level" in world space.
    // If Device tilts Z (Roll), Screen rotates. Water must rotate opposite relative to Screen.
    // Tilt X input is -1 to 1 (approx -45 to 45 deg).
    // Multiplier 1.0 means 1:1 rotation (Realism).
    const targetRz = -tilt.x * 1.5; // Roll (Left/Right)
    const targetRx = -tilt.y * 1.2; // Pitch (Front/Back) - limit this a bit more so we don't look under the skirt
    const stiffness = 4.0;
    const damping = 0.92;
    const dx = targetRx - sim.current.rx;
    const dz = targetRz - sim.current.rz;
    sim.current.vrx += dx * stiffness * delta;
    sim.current.vrz += dz * stiffness * delta;
    
    sim.current.vrx *= damping;
    sim.current.vrz *= damping;
    sim.current.rx += sim.current.vrx;
    sim.current.rz += sim.current.vrz;
    // Apply rotation to the GROUP
    groupRef.current.rotation.x = sim.current.rx;
    groupRef.current.rotation.z = sim.current.rz;
    
    // Share rotation with Boat for gravity calc
    setWaterRot({ x: sim.current.rx, z: sim.current.rz });
    // --- 2. Wave Vertex Animation ---
    const time = state.clock.elapsedTime * theme.waveSpeed;
    const pos = meshRef.current.geometry.attributes.position;
    
    // We only want to animate the TOP face vertices.
    // The BoxGeometry is created with segments. 
    // We need to identify vertices where y approx equals top (WATER_HEIGHT/2 due to center pivot of geometry logic, but we shifted it).
    // Actually, we'll shift the mesh geometry down so Y=0 is the top surface.
    
    for (let i = 0; i < pos.count; i++) {
        // Read original Y (assuming we don't overwrite it permanently with accumulating error, 
        // ideally we should store base position but for simple noise it's okay if we just reset or use X/Z)
        // Wait, standard BoxGeometry vertices are reused. We need to be careful.
        // Let's just check if vertex Y is near 0 (the top).
        
        const y = pos.getY(i);
        // Our box is shifted so top is at Y=0, bottom at Y=-Height.
        if (y > -0.1) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            
            // Noise based waves
            const n1 = noise3D(x * 0.15, z * 0.15, time) * theme.waveHeight;
            const n2 = noise3D(x * 0.4 + time, z * 0.4, time * 1.5) * (theme.waveHeight * 0.3);
            
            // Add "Slosh" displacement based on angular velocity
            // If rotating Z fast, edges go up/down
            const slosh = (x * -sim.current.vrz * 2.0) + (z * sim.current.vrx * 2.0);
            pos.setY(i, n1 + n2 + slosh);
        }
    }
    pos.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });
  // Construct geometry once
  const geometry = useMemo(() => {
    // Width, Height, Depth, WidthSegs, HeightSegs, DepthSegs
    // High segs on Width/Depth for waves. Low on Height.
    const geo = new THREE.BoxGeometry(WATER_WIDTH, WATER_HEIGHT, WATER_DEPTH, RES_X, 1, RES_Z);
    // Important: Move the box DOWN so the origin (0,0,0) is at the center of the TOP face.
    // Box center is normally (0,0,0). Top is at +H/2.
    // We translate -H/2 on Y.
    geo.translate(0, -WATER_HEIGHT / 2, 0);
    return geo;
  }, []);
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
        <mesh ref={meshRef} geometry={geometry}>
            <meshPhysicalMaterial
                color={theme.waterColor}
                transmission={0.2}
                opacity={0.9}
                transparent
                roughness={0.3}
                metalness={0.0}
                ior={1.33}
                thickness={1.0}
                flatShading={true}
            />
        </mesh>
        
        {/* Boat is child of Water so it rotates with it, but we animate it sliding */}
        <Boat theme={theme} waterTilt={{ x: sim.current.rx, z: sim.current.rz }} />
    </group>
  );
};

const Scene = ({ theme }: { theme: ThemeConfig }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [waterRot, setWaterRot] = useState({ x: 0, z: 0 }); // Shared state for debug or future use
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let tx = 0;
      let ty = 0;
      const isLandscape = window.screen.orientation?.type?.includes('landscape');
      
      if (e.gamma !== null && e.beta !== null) {
          // Mapping for "Looking at phone screen"
          // Portrait: Gamma is Left/Right Tilt (Roll). Beta is Front/Back (Pitch).
          // Landscape: Beta is Roll. Gamma is Pitch.
          
          if (isLandscape) {
              // In landscape, holding phone like a steering wheel:
              // Left/Right tilt is Beta.
              tx = Math.max(-45, Math.min(45, e.beta)) / 45; 
              // Forward/Back tilt is Gamma.
              ty = -Math.max(-45, Math.min(45, e.gamma)) / 45; 
          } else {
              // Portrait
              tx = Math.max(-45, Math.min(45, e.gamma)) / 45;
              ty = Math.max(-45, Math.min(45, e.beta)) / 45; 
          }
      }
      setTilt({ x: tx, y: ty });
    };
    const handleMouseMove = (e: MouseEvent) => {
       const x = (e.clientX / window.innerWidth) * 2 - 1;
       const y = (e.clientY / window.innerHeight) * 2 - 1;
       setTilt({ x: x, y: y });
    };
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation);
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  return (
    <>
      {/* 
        Camera: Slightly elevated front view.
        We look at (0,0,0) which is the water surface center.
        Z=8 gives us a good FOV of the "tank".
      */}
      <PerspectiveCamera makeDefault position={[0, 1.5, 8]} fov={50} />
      
      {/* Lighting */}
      <ambientLight intensity={0.25} color="#ffffff" />
      <directionalLight position={[10, 20, 10]} intensity={0.5} color="#ffffff" />
      <spotLight position={[-10, 10, 5]} intensity={0.3} color="#ffffff" angle={0.5} penumbra={1} />
      {/* The Dynamic Water Block */}
      <WaterVolume theme={theme} tilt={tilt} setWaterRot={setWaterRot} />
      {/* Background */}
      <color attach="background" args={["#f5f5f5"]} />
      <fog attach="fog" args={["#f5f5f5", 10, 40]} />
    </>
  );
};

/**
 * 🚢 Wave Bottle - 瓶中船物理模拟
 * 
 * 侧面平视视角，模拟透过倾斜窗口观察水平水面：
 * - 相机固定在侧面平视位置
 * - 水体容器旋转保持水面世界水平
 * - 船只在容器内因重力滑动
 * - Simplex noise 生成真实波浪
 * - Low-Poly + 玻璃质感
 */
const WaveBottle: React.FC<ToyProps> = ({ isActive }) => {
  const [theme] = useState(DEFAULT_THEME);
  
  return <Scene theme={theme} />;
};

export default WaveBottle;

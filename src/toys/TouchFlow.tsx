import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three-stdlib';
import { ToyProps } from '../core/types';
import { simulationFragmentShader } from '../shaders/simulationShaders';
import { renderVertexShader, renderFragmentShader } from '../shaders/renderShaders';

// Extend Three.js with custom buffer geometry if needed, 
// but standard BufferGeometry is fine.

const TEXTURE_WIDTH = 128; // 128x128 = 16,384 particles
const TOTAL_PARTICLES = TEXTURE_WIDTH * TEXTURE_WIDTH;

const TouchFlow: React.FC<ToyProps> = ({ data, isActive }) => {
  const { gl, size } = useThree();
  const gpuCompute = useRef<GPUComputationRenderer | null>(null);
  const positionVariable = useRef<any>(null);
  
  const pointsRef = useRef<THREE.Points>(null);
  const uniformsRef = useRef({
    uPositionTexture: { value: null },
    uSize: { value: 1.5 }, // Reduced from 3.0 to make particles finer
    uBass: { value: 0.0 },
    uHigh: { value: 0.0 },
    uEnergy: { value: 0.0 } // Added energy uniform for color shifting
  });

  // 1. Initialize GPGPU
  useEffect(() => {
    if (!gl) return;

    const gpu = new GPUComputationRenderer(TEXTURE_WIDTH, TEXTURE_WIDTH, gl);

    // Create initial texture with random positions
    const dtPosition = gpu.createTexture();
    const posArray = dtPosition.image.data;
    
    for (let k = 0; k < posArray.length; k += 4) {
      const r = Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      
      posArray[k + 0] = Math.cos(theta) * r; // x
      posArray[k + 1] = (Math.random() - 0.5) * 4.0; // y
      posArray[k + 2] = Math.sin(theta) * r; // z
      posArray[k + 3] = Math.random(); // w: Life (0-1)
    }

    // Add Variable
    const posVar = gpu.addVariable('uTexture', simulationFragmentShader, dtPosition);
    gpu.setVariableDependencies(posVar, [posVar]);

    // Add Uniforms to Simulation Shader
    posVar.material.uniforms = {
      uTime: { value: 0 },
      uDelta: { value: 0 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) }, // z=0 inactive, z=1 active
      uEnergy: { value: 0 }
    };

    // Initialize
    const error = gpu.init();
    if (error !== null) {
      console.error(error);
    }

    gpuCompute.current = gpu;
    positionVariable.current = posVar;

  }, [gl]);

  // 2. Create Geometry (References to texture UVs)
  const particlesGeo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(TOTAL_PARTICLES * 3); // Dummy positions
    const references = new Float32Array(TOTAL_PARTICLES * 2); // UV map
    
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      // UV coordinates (0,0) to (1,1) for texture lookup
      const xx = (i % TEXTURE_WIDTH) / TEXTURE_WIDTH;
      const yy = Math.floor(i / TEXTURE_WIDTH) / TEXTURE_WIDTH;
      
      references[i * 2] = xx;
      references[i * 2 + 1] = yy;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('reference', new THREE.BufferAttribute(references, 2));
    
    return geometry;
  }, []);

  // 3. Render Loop
  useFrame((state, delta) => {
    if (!gpuCompute.current || !positionVariable.current || !pointsRef.current) return;

    // A. Update Simulation Uniforms
    const simUniforms = positionVariable.current.material.uniforms;
    simUniforms.uTime.value = state.clock.elapsedTime;
    simUniforms.uDelta.value = delta;
    simUniforms.uEnergy.value = data.energy;
    
    // Handle Mouse Interaction (Project 2D mouse to 3D plane approx)
    // Normalized Device Coordinates (-1 to +1)
    const mouse = state.pointer; // x, y
    // We map mouse x (-1,1) to World X (-5,5) approx
    // This is a rough mapping for "Touch Flow", accurate raycasting is heavier
    if (isActive) { 
        // Use a simple activation logic: assume always active if pointer moves?
        // For now we assume z=1 if data.energy > 0 (music plays) or just always on
        simUniforms.uMouse.value.set(mouse.x * 5.0, mouse.y * 5.0, 1.0);
    } else {
        simUniforms.uMouse.value.z = 0.0;
    }

    // B. Compute GPGPU
    gpuCompute.current.compute();

    // C. Update Render Uniforms (Feed the computed texture to the points material)
    const targetTexture = gpuCompute.current.getCurrentRenderTarget(positionVariable.current).texture;
    
    // We access the custom shader material uniforms directly
    const renderMaterial = pointsRef.current.material as THREE.ShaderMaterial;
    renderMaterial.uniforms.uPositionTexture.value = targetTexture;
    renderMaterial.uniforms.uBass.value = data.bass;
    renderMaterial.uniforms.uHigh.value = data.high;
    renderMaterial.uniforms.uEnergy.value = data.energy; // Pass energy to render shader
  });

  return (
    <points ref={pointsRef} geometry={particlesGeo}>
      <shaderMaterial
        vertexShader={renderVertexShader}
        fragmentShader={renderFragmentShader}
        uniforms={uniformsRef.current}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default TouchFlow;

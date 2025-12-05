import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { ToyProps } from '../../core/types';
import { useGyroscope } from '../../core/sensors/useGyroscope';
import * as THREE from 'three';

/**
 * 🚢 Wave Bottle - 晃动小船游戏
 * 
 * 模拟亚克力水晶容器中的液体和漂浮物
 */
const WaveBottle: React.FC<ToyProps> = ({ isActive }) => {
  const gyroData = useGyroscope(isActive);
  const waterRef = useRef<THREE.Mesh>(null);
  const boatRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  // 液体波浪Shader
  const waterShader = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      tiltX: { value: 0 },
      tiltY: { value: 0 },
      waveHeight: { value: 0.3 },
    },
    vertexShader: `
      uniform float time;
      uniform float tiltX;
      uniform float tiltY;
      uniform float waveHeight;
      
      varying vec2 vUv;
      varying float vElevation;
      
      void main() {
        vUv = uv;
        vec3 pos = position;
        
        // 基于倾斜的波浪偏移
        float wave1 = sin(pos.x * 2.0 + time) * 0.1;
        float wave2 = cos(pos.y * 2.0 + time * 0.8) * 0.1;
        
        // 倾斜影响
        float tiltEffect = tiltX * pos.x * 0.5 + tiltY * pos.y * 0.5;
        
        pos.z += (wave1 + wave2) * waveHeight + tiltEffect;
        vElevation = pos.z;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      varying float vElevation;
      
      void main() {
        // 蓝色渐变水面
        vec3 shallowColor = vec3(0.4, 0.7, 1.0);
        vec3 deepColor = vec3(0.0, 0.2, 0.6);
        
        float mixStrength = vElevation * 0.5 + 0.5;
        vec3 color = mix(deepColor, shallowColor, mixStrength);
        
        // 波光粼粼效果
        float sparkle = sin(vUv.x * 30.0 + time * 2.0) * sin(vUv.y * 30.0 + time * 1.5);
        color += sparkle * 0.1;
        
        gl_FragColor = vec4(color, 0.8);
      }
    `,
  }), []);

  // 动画循环
  useFrame((state, delta) => {
    if (!isActive) return;
    
    timeRef.current += delta;
    
    // 更新液体shader
    if (waterRef.current) {
      const material = waterRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = timeRef.current;
      material.uniforms.tiltX.value = gyroData.tilt.x;
      material.uniforms.tiltY.value = gyroData.tilt.y;
      material.uniforms.waveHeight.value = 0.3 + gyroData.shake * 0.5;
    }
    
    // 小船跟随波浪浮动
    if (boatRef.current && waterRef.current) {
      const tiltX = gyroData.tilt.x;
      const tiltY = gyroData.tilt.y;
      
      // 波浪高度计算（简化版）
      const waveHeight = Math.sin(timeRef.current * 2.0) * 0.1 + 
                        Math.cos(timeRef.current * 1.5) * 0.08;
      
      boatRef.current.position.z = waveHeight + tiltX * 0.3;
      boatRef.current.position.x = tiltX * 1.5;
      boatRef.current.position.y = tiltY * 1.2;
      
      // 小船倾斜
      boatRef.current.rotation.z = -tiltX * 0.3;
      boatRef.current.rotation.x = tiltY * 0.2;
    }
  });

  return (
    <group>
      {/* 环境光 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      
      {/* 容器外壳（透明亚克力） */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[8, 4, 2.5]} />
        <meshPhysicalMaterial 
          color="#88ccff"
          transparent
          opacity={0.15}
          roughness={0.1}
          metalness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>
      
      {/* 容器边框 */}
      <lineSegments position={[0, 0, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(8, 4, 2.5)]} />
        <lineBasicMaterial color="#66aadd" linewidth={2} />
      </lineSegments>
      
      {/* 液体表面 */}
      <mesh 
        ref={waterRef} 
        position={[0, -0.5, -0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[7.5, 3.5, 32, 32]} />
        <shaderMaterial 
          args={[waterShader]}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* 小船 */}
      <group ref={boatRef} position={[0, 0, 0]}>
        {/* 船体 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 0.6, 0.4]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        
        {/* 船帆杆 */}
        <mesh position={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        
        {/* 帆 */}
        <mesh position={[0.3, 0, 0.5]} rotation={[0, 0, 0.1]}>
          <planeGeometry args={[0.6, 0.8]} />
          <meshStandardMaterial 
            color="#f5f5dc" 
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      
      {/* 漂浮冰山（装饰） */}
      <mesh position={[-2.5, 0.5, 0.3]}>
        <coneGeometry args={[0.3, 0.5, 6]} />
        <meshStandardMaterial color="#E0F7FF" />
      </mesh>
    </group>
  );
};

export default WaveBottle;

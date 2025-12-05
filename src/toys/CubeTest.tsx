import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { ToyProps } from '../core/types';

const CubeTest: React.FC<ToyProps> = ({ data }) => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // 旋转
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.2;

    // 音频反应：缩放
    // Bass 驱动大小
    const scale = 1 + data.bass * 1.5;
    meshRef.current.scale.set(scale, scale, scale);

    // 音频反应：颜色 (通过 Material props 或者在这里直接改颜色)
    // 这里我们保持简单，只做几何变换
  });

  return (
    <group>
       {/* 
         在 AR 模式下，通常我们会把物体放在用户面前。
         这里暂时放在 (0,0,0) 
       */}
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
           color={data.energy > 0.5 ? "hotpink" : "orange"} 
           wireframe={true}
        />
      </mesh>
    </group>
  );
};

export default CubeTest;

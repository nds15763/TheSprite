import React, { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { Vector2 } from 'three';

// 创建 XR Store (类似于 AR 会话管理器)
export const xrStore = createXRStore({
  depthSensing: true,
  hitTest: true,
});

// 背景控制器
const BackgroundController = () => {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = null; 
  }, [scene]);
  return null;
};

// 后处理效果控制器
const Effects = () => {
  return (
    <EffectComposer disableNormalPass>
      <Bloom 
        luminanceThreshold={0.1} // 降低阈值，让更多粒子发光
        mipmapBlur 
        intensity={2.0} // 增强光感
        radius={0.5} 
      />
      <ChromaticAberration 
         offset={new Vector2(0.004, 0.004)} // 色差偏移，制造迷幻边缘
         radialModulation={false}
         modulationOffset={0}
      />
      <Noise opacity={0.05} /> 
      {/* <Vignette eskil={false} offset={0.1} darkness={1.1} /> */}
    </EffectComposer>
  );
};

interface StageProps {
  children: React.ReactNode;
}

export const Stage: React.FC<StageProps> = ({ children }) => {
  return (
    <div className="w-full h-full relative bg-zinc-950">
      <Canvas
        gl={{ alpha: true, antialias: false }} 
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]} 
      >
        <XR store={xrStore}>
          <BackgroundController />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          
          {children}
          
          <Effects />
        </XR>
      </Canvas>
    </div>
  );
};

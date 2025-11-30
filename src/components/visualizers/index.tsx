import React from 'react';
import FluidDream from './FluidDream';
import NeonFire from './NeonFire';
import CubeTest from './CubeTest';
import TouchFlow from './TouchFlow';
import { VisualizerProps } from '../../types/audio';

// 定义注册表项的结构
interface VisualizerConfig {
  component: React.FC<VisualizerProps>;
  name: string;
  description: string;
  type: '2d' | '3d'; // 区分渲染模式
}

// 注册表常量
export const VISUALIZER_PRESETS: Record<string, VisualizerConfig> = {
  'TOUCH_FLOW': {
    component: TouchFlow,
    name: 'Touch Flow',
    description: 'GPGPU Particle Fluid',
    type: '3d'
  },
  'FLUID': {
    component: FluidDream,
    name: 'Fluid Dream',
    description: 'Subconscious fluid dynamics',
    type: '2d'
  },
  'FIRE': {
    component: NeonFire,
    name: 'Neon Fire',
    description: 'Energy intensity visualization',
    type: '2d'
  },
  'CUBE': {
    component: CubeTest,
    name: 'Bass Cube (3D)',
    description: 'R3F WebGL Test',
    type: '3d'
  }
};

export type VisualizerKey = keyof typeof VISUALIZER_PRESETS;

import { ToyConfig } from '../core/types';
import FluidDream from './FluidDream';
import NeonFire from './NeonFire';
import CubeTest from './CubeTest';
import TouchFlow from './TouchFlow';
import WaveBottle from './wave-bottle/WaveBottle';

/**
 * 🎮 玩具/游戏注册表
 * 
 * 添加新游戏步骤：
 * 1. 在 toys/ 目录下创建新文件夹
 * 2. 导入组件
 * 3. 在下方 TOY_REGISTRY 中添加配置
 */
export const TOY_REGISTRY: Record<string, ToyConfig> = {
  'touch-flow': {
    id: 'touch-flow',
    name: 'Touch Flow',
    icon: '🌊',
    description: 'GPGPU 粒子流体',
    category: 'ambient',
    type: '3d',
    inputs: {
      microphone: true,
      touch: true,
    },
    component: TouchFlow,
  },
  
  'fluid-dream': {
    id: 'fluid-dream',
    name: 'Fluid Dream',
    icon: '🌈',
    description: '迷幻流体动态',
    category: 'ambient',
    type: '2d',
    inputs: {
      microphone: true,
    },
    component: FluidDream,
  },
  
  'neon-fire': {
    id: 'neon-fire',
    name: 'Neon Fire',
    icon: '🔥',
    description: '霓虹火焰可视化',
    category: 'ambient',
    type: '2d',
    inputs: {
      microphone: true,
    },
    component: NeonFire,
  },
  
  'bass-cube': {
    id: 'bass-cube',
    name: 'Bass Cube',
    icon: '📦',
    description: '低音方块测试',
    category: 'ambient',
    type: '3d',
    inputs: {
      microphone: true,
    },
    component: CubeTest,
  },
  
  'wave-bottle': {
    id: 'wave-bottle',
    name: 'Wave Bottle',
    icon: '🚢',
    description: '晃动小船水晶玩具',
    category: 'interactive',
    type: '3d',
    inputs: {
      gyroscope: true,
    },
    component: WaveBottle,
  },
};

/**
 * 获取所有玩具ID列表
 */
export const getToyIds = (): string[] => Object.keys(TOY_REGISTRY);

/**
 * 根据ID获取玩具配置
 */
export const getToy = (id: string): ToyConfig | undefined => TOY_REGISTRY[id];

/**
 * 获取所有玩具配置数组
 */
export const getAllToys = (): ToyConfig[] => Object.values(TOY_REGISTRY);

/**
 * 根据类别筛选玩具
 */
export const getToysByCategory = (category: 'ambient' | 'interactive'): ToyConfig[] => {
  return getAllToys().filter(toy => toy.category === category);
};

/**
 * 默认玩具ID
 */
export const DEFAULT_TOY_ID = 'touch-flow';

import React from 'react';

/**
 * 玩具/游戏的标准属性接口
 * 每个toy都会接收这些props
 */
export interface ToyProps {
  data: any;           // 传感器数据（音频、陀螺仪等）
  events?: any[];      // 离散事件（如音频突变）
  isActive: boolean;   // 激活状态
}

/**
 * 玩具/游戏的配置接口
 * 用于注册表中描述每个可玩的toy
 */
export interface ToyConfig {
  id: string;                        // 唯一标识符（kebab-case）
  name: string;                      // 显示名称
  icon: string;                      // 图标（emoji 或图片路径）
  description: string;               // 简短描述
  
  /**
   * 类别：
   * - ambient: 背景型（粒子流体、火焰等，主要观赏）
   * - interactive: 交互型（需要倾斜、点击等操作）
   */
  category: 'ambient' | 'interactive';
  
  /**
   * 渲染类型：
   * - 2d: HTML Canvas 2D
   * - 3d: React Three Fiber (WebGL)
   */
  type: '2d' | '3d';
  
  /**
   * 需要的输入源（系统会自动注入对应的传感器数据）
   */
  inputs?: {
    gyroscope?: boolean;       // 需要陀螺仪/加速度计
    microphone?: boolean;      // 需要麦克风音频
    touch?: boolean;           // 需要触摸输入
  };
  
  /**
   * 主组件（必须遵循 ToyProps 接口）
   */
  component: React.FC<ToyProps>;
  
  /**
   * 可选的设置面板组件
   * （例如：皮肤选择、颜色调整等）
   */
  settingsComponent?: React.FC;
}

/**
 * 陀螺仪/加速度计数据
 */
export interface GyroData {
  tilt: {
    x: number;   // 左右倾斜 (-1 到 1)
    y: number;   // 前后倾斜 (-1 到 1)
  };
  shake: number; // 震动强度 (0 到 1)
}

/**
 * 用户偏好设置（本地存储）
 */
export interface UserPreferences {
  lastToyId: string | null;           // 上次玩的游戏ID
  toySettings: Record<string, any>;   // 每个toy的自定义设置
}

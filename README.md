# Bored 🎮

**Bored** 是一个横屏挂机玩具沙盒应用，收集各种解压的小游戏和桌面摆件。

## 特性

- 🎨 **多样化玩具** - 5种内置玩具，从粒子流体到晃动小船
- 🔄 **即时切换** - 底部抽屉快速切换不同游戏
- 📱 **横屏体验** - 专为横屏设计的沉浸式界面
- 🎮 **传感器支持** - 陀螺仪、麦克风、触摸交互
- 🔌 **插件化架构** - 轻松添加新游戏
- 🌐 **AR 模式** - 3D 玩具支持增强现实

## 内置玩具

### 环境类 (Ambient)
- **🌊 Touch Flow** - GPGPU 粒子流体，响应触摸和音频
- **🌈 Fluid Dream** - 迷幻流体动态可视化
- **🔥 Neon Fire** - 霓虹火焰能量可视化
- **📦 Bass Cube** - 低音驱动的3D方块

### 交互类 (Interactive)
- **🚢 Wave Bottle** - 晃动小船水晶玩具（陀螺仪控制）

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建
```bash
npm run build
```

### Android 打包
```bash
npx cap sync
npx cap open android
```

## 添加新游戏

### 1. 创建游戏组件
在 `src/toys/` 下创建新文件夹，例如 `my-game/MyGame.tsx`:

```tsx
import React from 'react';
import { ToyProps } from '../../core/types';

const MyGame: React.FC<ToyProps> = ({ data, events, isActive }) => {
  // 游戏逻辑
  return <group>{/* Three.js 场景 */}</group>;
};

export default MyGame;
```

### 2. 注册到系统
在 `src/toys/registry.ts` 中添加：

```tsx
import MyGame from './my-game/MyGame';

export const TOY_REGISTRY: Record<string, ToyConfig> = {
  // ... 现有玩具
  'my-game': {
    id: 'my-game',
    name: 'My Game',
    icon: '🎯',
    description: '我的新游戏',
    category: 'interactive',
    type: '3d',
    inputs: {
      gyroscope: true,
      touch: true,
    },
    component: MyGame,
  },
};
```

### 3. 完成！
重启开发服务器，新游戏就会出现在抽屉中。

## 架构

```
src/
├── core/                  # 核心基础设施
│   ├── types.ts           # 类型定义
│   ├── sensors/           # 传感器Hook
│   │   └── useGyroscope.ts
│   └── storage/           # 本地存储
│       └── usePreferences.ts
│
├── toys/                  # 游戏/玩具目录
│   ├── registry.ts        # 注册表
│   ├── touch-flow/        # 粒子流体
│   ├── wave-bottle/       # 小船游戏
│   └── ...
│
├── ui/                    # UI组件
│   ├── LaunchScreen.tsx   # 启动屏
│   └── ToyDrawer.tsx      # 游戏选择器
│
├── components/stage/      # 3D舞台
└── hooks/                 # React Hooks
```

## 技术栈

- **框架**: React + TypeScript
- **3D引擎**: Three.js + React Three Fiber
- **打包**: Vite
- **移动端**: Capacitor
- **样式**: Tailwind CSS (CDN)

## 传感器使用

### 陀螺仪
```tsx
import { useGyroscope } from '../core/sensors/useGyroscope';

const gyroData = useGyroscope(true);
// gyroData.tilt.x, gyroData.tilt.y, gyroData.shake
```

### 麦克风
```tsx
import { useAudioEngine } from '../hooks/useAudioEngine';

const { audioData, recentEvents } = useAudioEngine();
// audioData.bass, audioData.highs, audioData.energy
```

## 许可

MIT License

---

**Concept**: 一个永远不会玩腻的数字百宝箱 🎁

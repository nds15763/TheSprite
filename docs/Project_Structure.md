# The Sprite - 项目结构与文件简介

> 本文档用于帮助开发者快速理解项目文件结构及各模块职责。

## 1. 根目录结构
- **src/**: 源代码目录
- **docs/**: 项目文档 (Roadmap, Architecture)
- **public/**: 静态资源
- **vite.config.ts**: 构建配置

## 2. 核心源码 (`src/`)

### 2.1 入口与主逻辑
- **App.tsx**: 
  - 应用主入口。
  - 负责 UI 布局、视觉组件切换逻辑。
  - 同时管理 3D `Stage` (R3F) 和 2D Overlay 层。
- **types/audio.ts**: 
  - **核心类型定义**。
  - `AudioData`: 每一帧的音频特征 (vol, bass, energy)。
  - `VisualizerProps`: 所有视觉组件必须遵守的接口契约。

### 2.2 音频引擎 (`src/hooks/`)
- **useAudioEngine.ts**: 
  - **系统心脏**。
  - 封装 Web Audio API (`AnalyserNode`)。
  - 实时计算 FFT 频谱数据。
  - 实现事件检测逻辑 (Onset Detection, Kick Detection)。

### 2.3 视觉系统 (`src/components/visualizers/`)
所有视觉效果组件都存放于此，分为 2D 和 3D 两类。

- **index.tsx**: 
  - **注册表**。
  - 导出 `VISUALIZER_PRESETS`，管理所有可用的视觉效果。
- **NeonFire.tsx** (2D): 
  - 基于 HTML Canvas 的像素火焰效果。
  - 旧版 `PixelFire` 的重构版。
- **FluidDream.tsx** (2D): 
  - 基于 HTML Canvas 的流体模拟效果。
  - 旧版 `VisionBackground` 的重构版。
- **CubeTest.tsx** (3D): 
  - 基于 R3F 的 WebGL 测试组件。
  - 随低音跳动的立方体，用于验证 AR/3D 管线。

### 2.4 舞台与基础设施 (`src/components/stage/`)
- **Stage.tsx**: 
  - **3D 容器**。
  - 封装了 `@react-three/fiber` 的 `<Canvas>` 和 `@react-three/xr` 的 `<XR>`。
  - 处理 AR 模式下的背景透明化 (Passthrough)。

## 3. 关键依赖
- **three**: 3D 引擎核心。
- **@react-three/fiber**: React 的 Three.js 渲染器。
- **@react-three/xr**: WebXR (AR/VR) 支持库。
- **@react-three/drei**: R3F 的实用工具库 (OrbitControls, Environment 等)。

---
*最后更新: 2025-11-30 (Phase 2 Completed)*


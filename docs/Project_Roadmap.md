# The Sprite - 项目开发路线图 (Project Roadmap)

> "我看一根火柴，它在倾听我的故事。"

## 1. 愿景与核心理念 (Vision & Philosophy)
**目标体验**: 在手机端实现类似 "TouchDesigner" 风格的交互式音频可视化。
**核心概念**: 一个探索式的“意识空间”，视觉效果会同时响应 **音乐 (信号)** 和 **触摸 (交互)**。
**风格定位**: Whimsigothic (怪诞哥特), Drugcore (迷幻), 治愈系, 沉浸式, 无文字。
**关键机制**:
- **信号系统 (Signal System)**: 高精度的音频分析 (瞬态检测、能量分析、包络跟随)。
- **视觉表现 (Visuals)**: GPU 加速的粒子系统、流场 (Flow Fields)、Shader 特效。
- **交互反馈 (Interaction)**: 触摸可扰动流体、点燃事件、生成物质。

---

## 2. 架构设计 (Architecture)
为了支持复杂的 Shader 和可切换的视觉风格，我们需要一个模块化的架构。

### 核心模块
- **音频引擎 (Audio Engine / Publisher)**:
  - 负责音频流分析 (FFT)。
  - 检测离散事件 (Onset/拨弦, Kick/重音)。
  - 发布 `AudioData` (连续帧数据) 和 `AudioEvent` (瞬间事件)。
- **事件总线 (Event Bus)**:
  - 解耦音频逻辑与视觉渲染。
- **视觉注册表 (Visualizer Registry / Plugin System)**:
  - 定义标准接口 `VisualizerProps`。
  - 管理所有视觉效果组件 (Fire, Fluid, Particles)，支持热切换。

---

## 3. 实施阶段 (Implementation Phases)

### Phase 1: 架构重构 (当前重点)
*目标: 清理 `App.tsx`，建立插件化系统基础。*

- [ ] **抽离音频引擎**: 将逻辑移至 `src/hooks/useAudioEngine.ts`。
- [ ] **定义类型**: 创建 `src/types/audio.ts` (定义数据流和事件接口)。
- [ ] **创建注册表**: 建立 `src/components/visualizers/index.tsx` 管理不同风格。
- [ ] **重构现有组件**: 
    - `VisionBackground` -> `FluidDream` (流体梦境)
    - `PixelFire` -> `NeonFire` (霓虹火焰)
- [ ] **UI**: 在 `App.tsx` 添加简单的切换器，用于测试不同效果。

### Phase 2: WebGL 基础设施 & AR 准备 (引擎升级)
*目标: 从 2D Canvas 迈向 3D/Shader 世界，并为 AR 铺路。*

- [ ] **引入 R3F 技术栈**: 安装 `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/xr`。
- [ ] **场景解耦 (Stage Abstraction)**: 建立 `Stage` 概念，区分普通模式 (黑色背景) 和 AR 模式 (透明背景)。
- [ ] **Canvas 设置**: 用 R3F 的 `<Canvas>` 替换原本的 HTML 容器，并配置 `<XR>` 组件。
- [ ] **Shader 模板**: 建立基础的 GLSL Shader 开发模板，确保支持透明度混合 (Blending)。

### Phase 3: "Touch Flow" 粒子系统 (终极目标)
*目标: 实现参考图中的 GPGPU 粒子流体交互效果。*

- [ ] **GPGPU 逻辑**: 实现 FBO (帧缓存对象) 位置模拟。
- [ ] **流场设计**: 编写基于噪声 (Noise) 的 GLSL 向量场。
- [ ] **交互实现**: 
    - **Screen Mode**: 将触摸坐标映射为 Shader 中的“斥力/引力”源。
    - **AR Mode**: 使用 Raycasting 将触摸投射到现实平面，在物理空间中产生扰动。
- [ ] **音频响应**: 低音(Bass)控制粒子大小，高音(Highs)控制发光强度(Bloom)。

### Phase 4: 仪式感与打磨 (The Ritual)
*目标: 增强“入口体验”和整体质感。*

- [ ] **点火仪式**: “划火柴”的手势启动动画。
- [ ] **后处理**: 添加 Bloom (泛光), Noise (噪点), Chromatic Aberration (色差)。
- [ ] **世界状态**: 记录用户的选择和心境。

---

## 4. 开发日志与笔记 (Dev Log)

### 音频信号思路
- **Chaos (混乱度)**: `Math.abs(currentVol - prevVol)` - 适合检测“扫弦”或突发声音。
- **Energy (能量)**: 用于控制视觉的时间流逝速度。

### 技术栈决策
- **渲染器**: React Three Fiber (声明式 3D)。
- **状态管理**: React Context 或 Zustand (后期需要时引入)。
- **音频**: Web Audio API (原生)。

---

*最后更新: 2025-11-30*

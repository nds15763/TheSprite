// 连续的音频数据流 (每帧更新)
export interface AudioData {
  vol: number;    // 总体音量 (0-1)
  bass: number;   // 低频 (0-1) - 驱动背景脉冲/大小
  mid: number;    // 中频 (0-1) - 驱动形状/旋律
  high: number;   // 高频 (0-1) - 驱动火花/发光/纹理
  energy: number; // 平均能量密度 (0-1) - 用于时间流逝速度
  chaos: number;  // 瞬态/混乱度 (0-1) - 用于突发事件
}

// 离散的音频事件 (瞬间发生)
export type AudioEventType = 'ON_BEAT' | 'ON_NOTE_ONSET' | 'ON_SILENCE';

export interface AudioEvent {
  type: AudioEventType;
  intensity: number; // 事件强度 0-1
  timestamp: number; // 发生时间戳
}

// 视觉组件的统一接口
export interface VisualizerProps {
  data: AudioData;        // 每一帧的数据
  events: AudioEvent[];   // 这一帧发生的事件列表
  isActive: boolean;      // 是否处于激活/显示状态
  isAR?: boolean;         // (预留) 是否处于 AR 透视模式
}


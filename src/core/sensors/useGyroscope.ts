import { useState, useEffect } from 'react';
import { GyroData } from '../types';

/**
 * 陀螺仪/加速度计Hook
 * 
 * 提供设备倾斜和震动检测
 * 使用 DeviceOrientation API (Web) 或 Capacitor Motion (Native)
 */
export const useGyroscope = (enabled: boolean = true): GyroData => {
  const [gyroData, setGyroData] = useState<GyroData>({
    tilt: { x: 0, y: 0 },
    shake: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    let lastTime = Date.now();
    let lastAccel = { x: 0, y: 0, z: 0 };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // beta: 前后倾斜 (-180 到 180)
      // gamma: 左右倾斜 (-90 到 90)
      const beta = event.beta || 0;
      const gamma = event.gamma || 0;

      // 归一化到 -1 到 1
      const tiltX = Math.max(-1, Math.min(1, gamma / 45));
      const tiltY = Math.max(-1, Math.min(1, beta / 45));

      setGyroData(prev => ({
        ...prev,
        tilt: { x: tiltX, y: tiltY },
      }));
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;

      const x = accel.x || 0;
      const y = accel.y || 0;
      const z = accel.z || 0;

      // 计算加速度变化量（检测震动）
      const now = Date.now();
      const timeDelta = (now - lastTime) / 1000;
      if (timeDelta > 0.05) { // 限制更新频率
        const deltaX = Math.abs(x - lastAccel.x);
        const deltaY = Math.abs(y - lastAccel.y);
        const deltaZ = Math.abs(z - lastAccel.z);
        
        const shakeIntensity = (deltaX + deltaY + deltaZ) / 30; // 归一化
        const shake = Math.max(0, Math.min(1, shakeIntensity));

        setGyroData(prev => ({
          ...prev,
          shake: shake * 0.3 + prev.shake * 0.7, // 平滑处理
        }));

        lastAccel = { x, y, z };
        lastTime = now;
      }
    };

    // 请求权限（iOS 13+需要）
    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission !== 'granted') {
            console.warn('Gyroscope permission denied');
            return;
          }
        } catch (error) {
          console.error('Error requesting gyroscope permission:', error);
          return;
        }
      }

      // 添加事件监听
      window.addEventListener('deviceorientation', handleOrientation);
      window.addEventListener('devicemotion', handleMotion);
    };

    requestPermission();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled]);

  return gyroData;
};

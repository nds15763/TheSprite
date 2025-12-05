import React, { useEffect, useState } from 'react';

interface LaunchScreenProps {
  onComplete: () => void;
}

/**
 * 启动屏组件
 * 简单的渐入渐出效果，1秒后自动消失
 */
const LaunchScreen: React.FC<LaunchScreenProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 1秒后开始淡出
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 1000);

    // 1.5秒后完全移除
    const removeTimer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">Bored</h1>
        <p className="text-zinc-500 font-mono text-sm tracking-widest">
          IDLE TOYS SANDBOX
        </p>
      </div>
    </div>
  );
};

export default LaunchScreen;

import React from 'react';
import { ToyConfig } from '../core/types';
import { getAllToys } from '../toys/registry';

interface ToyDrawerProps {
  isOpen: boolean;
  currentToyId: string;
  onSelectToy: (toyId: string) => void;
  onClose: () => void;
}

/**
 * 玩具选择抽屉
 * 从底部滑出，展示所有可玩的游戏
 */
const ToyDrawer: React.FC<ToyDrawerProps> = ({
  isOpen,
  currentToyId,
  onSelectToy,
  onClose,
}) => {
  const toys = getAllToys();

  const handleSelect = (toyId: string) => {
    onSelectToy(toyId);
    onClose();
  };

  return (
    <>
      {/* 背景遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* 抽屉 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          maxHeight: '70vh',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* 拖动指示条 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* 标题 */}
        <div className="px-6 py-3 border-b border-zinc-800">
          <h2 className="text-white font-mono text-lg font-bold">
            选择玩具 🎮
          </h2>
          <p className="text-zinc-500 text-xs mt-1">
            {toys.length} 个可用
          </p>
        </div>

        {/* 游戏列表 */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: '50vh' }}>
          <div className="grid grid-cols-2 gap-3">
            {toys.map((toy: ToyConfig) => (
              <button
                key={toy.id}
                onClick={() => handleSelect(toy.id)}
                className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                  currentToyId === toy.id
                    ? 'bg-zinc-800 border-zinc-600 shadow-lg shadow-zinc-900/50'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 active:scale-95'
                }`}
              >
                {/* 图标 */}
                <div className="text-4xl mb-2">{toy.icon}</div>

                {/* 名称 */}
                <div className="font-mono text-sm font-bold text-white mb-1">
                  {toy.name}
                </div>

                {/* 描述 */}
                <div className="text-[10px] text-zinc-500 leading-tight">
                  {toy.description}
                </div>

                {/* 标签 */}
                <div className="flex gap-1 mt-2">
                  <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 uppercase">
                    {toy.type}
                  </span>
                  <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 uppercase">
                    {toy.category}
                  </span>
                </div>

                {/* 当前标记 */}
                {currentToyId === toy.id && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ToyDrawer;

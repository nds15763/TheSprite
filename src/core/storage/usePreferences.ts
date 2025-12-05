import { useState, useEffect } from 'react';
import { UserPreferences } from '../types';
import { DEFAULT_TOY_ID } from '../../toys/registry';

const STORAGE_KEY = 'bored_preferences';

/**
 * 用户偏好设置Hook
 * 
 * 用于保存和读取：
 * - 上次玩的游戏ID
 * - 每个游戏的自定义设置（如皮肤选择）
 */
export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    lastToyId: null,
    toySettings: {},
  });

  // 读取本地存储
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  // 保存到本地存储
  const savePreferences = (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  // 设置上次玩的游戏
  const setLastToyId = (toyId: string) => {
    savePreferences({ lastToyId: toyId });
  };

  // 获取上次玩的游戏ID（如果没有则返回默认）
  const getLastToyId = (): string => {
    return preferences.lastToyId || DEFAULT_TOY_ID;
  };

  // 保存某个游戏的设置
  const setToySettings = (toyId: string, settings: any) => {
    savePreferences({
      toySettings: {
        ...preferences.toySettings,
        [toyId]: settings,
      },
    });
  };

  // 获取某个游戏的设置
  const getToySettings = (toyId: string): any => {
    return preferences.toySettings[toyId] || {};
  };

  return {
    preferences,
    setLastToyId,
    getLastToyId,
    setToySettings,
    getToySettings,
  };
};

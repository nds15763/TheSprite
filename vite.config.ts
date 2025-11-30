import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // 强制所有 'three' 的导入都指向 node_modules 下的同一个包
          'three': path.resolve(__dirname, 'node_modules/three'),
          'three-stdlib': path.resolve(__dirname, 'node_modules/three-stdlib')
        }
      },
      optimizeDeps: {
        // 预构建这些包，避免 CommonJS/ESM 混用导致的重复加载
        include: ['three', 'three-stdlib', '@react-three/fiber', '@react-three/drei']
      }
    };
});

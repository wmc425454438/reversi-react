import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 允许局域网访问
    port: 3000,        // 设置端口为3000
    strictPort: true,  // 如果端口被占用则退出
  }
})
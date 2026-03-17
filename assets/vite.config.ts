import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      host: '192.168.1.109',
      port: 5173,
      protocol: 'ws',
    },
  },
  plugins: [
    nitro(),
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
  ],
  build: {
    outDir: '../priv/static/app',
    emptyOutDir: true,
  },
})

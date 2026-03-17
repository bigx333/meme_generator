import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ command }) => ({
  server:
    command === 'serve'
      ? {
          host: '0.0.0.0',
          port: 5173,
          strictPort: true,
          hmr: process.env.VITE_HMR_HOST
            ? {
                host: process.env.VITE_HMR_HOST,
                port: Number(process.env.VITE_HMR_PORT ?? 5173),
                protocol: process.env.VITE_HMR_PROTOCOL ?? 'ws',
              }
            : undefined,
        }
      : undefined,
  preview: {
    host: '127.0.0.1',
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
}))

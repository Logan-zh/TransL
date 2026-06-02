import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.TRANSL_API_URL || 'http://localhost:3000'

  return {
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __TRANSL_API_URL__: JSON.stringify(apiUrl)
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
          selectionTrigger: resolve(__dirname, 'src/renderer/selection-trigger/index.html'),
          settings: resolve(__dirname, 'src/renderer/settings/index.html'),
          capture: resolve(__dirname, 'src/renderer/capture/index.html'),
          login: resolve(__dirname, 'src/renderer/login/index.html')
        }
      }
    }
  }
  }
})

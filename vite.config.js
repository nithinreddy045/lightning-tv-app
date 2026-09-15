/// <reference types="vite/client" />

import { defineConfig } from 'vite'
import blitsVitePlugins from '@lightningjs/blits/vite'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig(({ command, mode, ssrBuild }) => {
  return {
    base: './',
    plugins: [
      ...blitsVitePlugins,

      {
        name: 'copy-webos-appinfo',

        closeBundle() {
          mkdirSync('./dist', { recursive: true })

          copyFileSync(
            './webos/appinfo.json',
            './dist/appinfo.json'
          )
        },
      },
    ],

    resolve: {
      mainFields: ['browser', 'module', 'jsnext:main', 'jsnext'],
    },

    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },

      fs: {
        allow: ['..'],
      },
    },

    worker: {
      format: 'es',
    },
  }
})
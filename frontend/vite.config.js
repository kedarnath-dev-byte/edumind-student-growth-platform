/**
 * @file vite.config.js
 * @description Vite build configuration for EduMind AI frontend.
 *              Registers TailwindCSS as a Vite plugin for zero-config styling.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
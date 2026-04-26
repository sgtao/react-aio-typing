// vitest.config.ts
import react from '@vitejs/plugin-react';
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
// import { defineConfig } from 'vitest/config';
import { defineConfig } from "vite";

export default defineConfig(() => ({
  base: process.env.GITHUB_ACTIONS ? '/react-aio-typing/' : '/',
  plugins: [
    tailwindcss(),
    process.env.NODE_ENV === 'test' ? react() : reactRouter(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/test-setup.ts'],
  },
}));

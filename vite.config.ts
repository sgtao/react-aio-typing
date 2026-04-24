import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(),tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
})

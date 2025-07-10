import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  server: {
    host: '0.0.0.0',
    hmr: true, // Change this line to false disable auto-refreshing.
    port: 5173,
    allowedHosts: [
      "f9513b7f-ba88-4efc-a5c1-2396a64fb74e-00-wwhh8oaqjdua.picard.replit.dev"
    ]
  },
})

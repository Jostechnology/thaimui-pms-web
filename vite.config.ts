import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const healthCheckPlugin = (): Plugin => ({
  name: "vite-plugin-health-check",
  configureServer(server) {
    server.middlewares.use("/health_check", (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          app: "frontend-react",
          status: "healthy",
          mode: "dev",
          timestamp: new Date().toISOString(),
        })
      );
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use("/health_check", (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          app: "frontend-react",
          status: "healthy",
          mode: "preview",
          timestamp: new Date().toISOString(),
        })
      );
    });
  },
});

export default defineConfig({
  plugins: [
    react(),
    healthCheckPlugin(), // 👈 เพิ่ม plugin เข้าไป
    nodePolyfills()
    
  ],
  base: "/",
  build: {
    chunkSizeWarningLimit: 3000,
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    open: true,
    cors: true,
    allowedHosts: ["test-pms.jostechnology.co.th"],
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});

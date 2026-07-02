import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The design-system repo root is served so approved assets in ../assets/
// can be referenced read-only. App code itself lives entirely under app/.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      // allow serving files from the repo root (read-only: assets/, tokens/)
      allow: [".."],
    },
  },
});

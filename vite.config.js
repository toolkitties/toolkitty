import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// @ts-expect-error process is a nodejs global
const port = process.env.TAURI_CLI_PORT || 1420;

// @ts-expect-error process is a nodejs global
const disableHmr = process.env.VITE_DISABLE_HMR ? true : false;

export default defineConfig(async () => ({
  plugins: [sveltekit()],

  // vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`:
  //
  // 1. Prevent vite from obscuring rust errors
  clearScreen: false,
  server: {
    port,
    // 2. Tauri expects a fixed port, fail if that port is not available
    strictPort: true,
    host: host || false,
    hmr: disableHmr
      ? false
      : host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: process.env.VITEST
    ? {
        conditions: ["browser"],
      }
    : undefined,
}));

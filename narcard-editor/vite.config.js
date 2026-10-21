import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tauri writes Rust build artifacts under this directory while Vite is running.
      // Watching it causes Node 24 on Windows to fail with EBUSY when cargo replaces binaries.
      ignored: ['**/src-tauri/**'],
    },
  },
});

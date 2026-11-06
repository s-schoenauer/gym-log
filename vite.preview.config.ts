import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file for the hosted preview (no service worker there).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist-preview', assetsInlineLimit: 100_000_000 }
});

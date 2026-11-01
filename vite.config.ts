import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base so the build can be served from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});

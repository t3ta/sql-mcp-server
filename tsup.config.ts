import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'], // もしくは ['esm', 'cjs'] 両対応もOK
  target: 'node18',
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});

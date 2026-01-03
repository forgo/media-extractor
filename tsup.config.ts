import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'detectors/index': 'src/detectors/index.ts',
    'parsers/index': 'src/parsers/index.ts',
    'security/index': 'src/security/index.ts',
    'filters/index': 'src/filters/index.ts',
    'utils/index': 'src/utils/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  external: [],
});

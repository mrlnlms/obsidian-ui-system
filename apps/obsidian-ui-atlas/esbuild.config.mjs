import esbuild from 'esbuild';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const production = process.argv[2] === 'production';
const require = createRequire(import.meta.url);
const { version: obsidianSdkVersion } = JSON.parse(readFileSync(require.resolve('obsidian/package.json'), 'utf8'));
const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/*',
    '@lezer/*',
    ...builtinModules,
  ],
  format: 'cjs',
  target: 'es2021',
  logLevel: 'info',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  define: { __OBSIDIAN_SDK_VERSION__: JSON.stringify(obsidianSdkVersion) },
  outfile: 'main.js',
  minify: production,
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}

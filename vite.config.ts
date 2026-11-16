import path from 'node:path';
import { build } from 'esbuild';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * `virtual:player-bundle`: src/player/main.ts bundled into one minified IIFE string, which the editor inlines
 * into exported presentations. Built with esbuild on demand, rebuilt in dev when a player source changes.
 */
function playerBundle(): Plugin {
  const id = 'virtual:player-bundle';
  const rid = '\0' + id;
  return {
    name: 'player-bundle',
    resolveId: (i) => (i === id ? rid : undefined),
    async load(i) {
      if (i !== rid) return;
      const r = await build({
        entryPoints: [path.resolve('src/player/main.ts')],
        bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', metafile: true, legalComments: 'none',
      });
      for (const f of Object.keys(r.metafile.inputs)) this.addWatchFile(path.resolve(f));
      return 'export default ' + JSON.stringify(r.outputFiles[0].text);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [playerBundle()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    css: true, // the export embeds stylesheets imported with ?raw; vitest stubs CSS otherwise
  },
});

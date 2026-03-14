// web/vite.config.ts

//import * as path from 'path';
import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    // Standard output — Gradle will copy this into the plugin resources.
    // Do NOT hardcode a path into the Kotlin project here; keep web project
    // fully standalone so it can be opened, built, and tested on its own.
    outDir: 'dist',
    //outDir: path.resolve(__dirname, '../src/main/resources/web'),
    emptyOutDir: true,
    minify: true, // We can minify again
  },
});

// database-diagram-web/vite.config.ts


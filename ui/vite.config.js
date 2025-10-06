import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';

// Replicate __dirname functionality in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@ui': path.resolve(__dirname, './src'),
            '@core': path.resolve(__dirname, '../core'),
            '@common': path.resolve(__dirname, '../common'),
        },
    },
    define: {
        global: 'globalThis',
    },
    build: {
        rollupOptions: {
            external: ['ws'],  // Mark ws as external for browser builds
        },
    },
    optimizeDeps: {
        exclude: ['ws'],  // Exclude ws from optimization for browser
    },
});
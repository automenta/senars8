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
            // Ensure the browser-specific version of common is used
            '@common/services/connection': path.resolve(__dirname, '../common/services/BrowserConnectionManager.js'),
        },
    },
    define: {
        global: 'globalThis',
        // Define environment constants
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    server: {
        // Better error reporting for development
        open: false, // Don't automatically open browser
        // Use 0.0.0.0 to allow external connections
        host: true,
        // Increase timeout for large projects
        cors: true,
    },
    build: {
        target: 'esnext',  // Use modern JS features
        cssCodeSplit: true,  // Enable CSS code splitting
        sourcemap: true,  // Generate sourcemaps for debugging
        rollupOptions: {
            output: {
                // Optimize chunking to reduce bundle size
                manualChunks: {
                    // Separate React and React DOM to their own chunk
                    'react-vendor': ['react', 'react-dom'],
                    // Group other common libraries
                    'ui-vendor': ['flexlayout-react', 'reactflow'],
                }
            }
        },
    },
    optimizeDeps: {
        include: [
            // Pre-bundle common dependencies to speed up cold starts
            'react',
            'react-dom',
            'prop-types',
        ],
        exclude: [
            // Don't pre-bundle packages that might have Node.js dependencies
        ]
    },
    // Enable strict CSS selectors to catch potential issues
    css: {
        modules: {
            localsConvention: 'camelCase',
        }
    }
});
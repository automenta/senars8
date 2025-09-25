import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@core': path.resolve(__dirname, '../core'),
            '@agent': path.resolve(__dirname, '../agent'),
            '@ui': path.resolve(__dirname, './src'),
            '@ui/components': path.resolve(__dirname, './src/components'),
        },
    },
})

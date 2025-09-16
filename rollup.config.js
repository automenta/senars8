import {babel} from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import fs from 'fs';

// Read package.json synchronously
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const external = Object.keys(packageJson.dependencies);

export default {
    input: 'src/index.js',
    output: [
        {
            dir: 'dist',
            entryFileNames: 'senars.esm.js',
            format: 'esm',
            sourcemap: true,
        },
        {
            dir: 'dist',
            entryFileNames: 'senars.umd.js',
            format: 'umd',
            name: 'senars',
            sourcemap: true,
        },
    ],
    plugins: [
        nodeResolve(),
        commonjs(),
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
        }),
    ],
    external,
};

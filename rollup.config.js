import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import packageJson from './package.json' assert { type: 'json' };

const external = Object.keys(packageJson.dependencies);

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/senars.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/senars.umd.js',
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

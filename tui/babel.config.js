/**
 * @type {import('@babel/core').ConfigFunction}
 */
export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
};
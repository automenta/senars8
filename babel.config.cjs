module.exports = {
    presets: [
        ['@babel/preset-env', {
            targets: {
                node: 'current'
            }
        }],
        ['@babel/preset-react', {
            runtime: 'automatic'
        }]
    ],
    plugins: [
        'babel-plugin-transform-import-meta',
        '@babel/plugin-transform-optional-chaining',
        '@babel/plugin-transform-nullish-coalescing-operator'
    ],
};

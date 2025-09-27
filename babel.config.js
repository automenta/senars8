export default {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current',
                },
                modules: 'commonjs', // Transform ES modules to CommonJS for Jest compatibility
                // Minimize transpiling for modern JS in development
                useBuiltIns: 'usage',
                corejs: 3,
                shippedProposals: true,
            },
        ],
        '@babel/preset-react',
    ],
};
module.exports = {
    presets: [
        '@babel/preset-env',
        ['@babel/preset-react', {runtime: 'automatic'}]
    ],
    plugins: [
        'babel-plugin-transform-import-meta',
        ['module-resolver', {
            root: ['./'],
            alias: {
                '@': './ui/src',
                '@ui': './ui/src',
                '@core': './core',
                '@common': './common'
            }
        }]
    ]
};
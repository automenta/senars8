export default {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverage: false,
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    transformIgnorePatterns: [
        // This pattern is crucial for Jest to correctly transpile modules within node_modules
        // that are necessary for testing, specifically '@xenova/transformers'.
        // Without this, Jest might skip transforming these modules, leading to syntax errors
        // during test execution if they use modern JavaScript features not natively supported
        // by the Node.js version Jest is running on, or if they are not in CommonJS format.
        '/node_modules/(?!@xenova/transformers)'
    ],
};

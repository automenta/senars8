export default {
    projects: [
        {
            displayName: 'core',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/**/*.test.js'],
            transform: {
                '^.+\\.(js|mjs): ['babel-jest', { presets: ['@babel/preset-env'] }],
            },
            moduleNameMapper: {
                '^@core/(.*): '<rootDir>/core/$1',
            },
            transformIgnorePatterns: [
                "/node_modules/(?!(synckit|@xenova/transformers|jerrypick|force-graph|d3-.*|react-kapsule|internmap|lodash-es|kapsule|accessor-fn|canvas-color-tracker|tinycolor2|float-tooltip|index-array-by|@babel/runtime))"
            ],
        },
        {
            displayName: 'tui',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tui/tests/**/*.test.js'],
            transform: {
                '^.+\\.(js|mjs): ['babel-jest', { presets: ['@babel/preset-env'] }],
            },
            moduleNameMapper: {
                '^@core/(.*): '<rootDir>/../core/$1',
                '^@common/(.*): '<rootDir>/../common/$1',
                '^@/(.*): '<rootDir>/src/$1',
            },
            transformIgnorePatterns: [
                "/node_modules/(?!(@xenova/transformers|jerrypick|force-graph|d3-.*|react-kapsule|internmap|lodash-es|kapsule|accessor-fn|canvas-color-tracker|tinycolor2|float-tooltip|index-array-by|@babel/runtime))"
            ],
            rootDir: 'tui',
        },
        {
            displayName: 'ui',
            testEnvironment: 'jsdom',
            testEnvironmentOptions: {
                customExportConditions: ['', 'node', 'import']
            },
            testMatch: ['<rootDir>/ui/src/**/__tests__/**/*.test.jsx'],
            setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/ui/jest.setup.js'],
            transform: {
                '^.+\\.(js|jsx|mjs): ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-react'] }],
            },
            moduleNameMapper: {
                '\\.(css|less|scss|sass): 'identity-obj-proxy',
                '^@core/(.*): '<rootDir>/core/$1',
                '^@common/(.*): '<rootDir>/common/$1',
                '^@/(.*): '<rootDir>/ui/src/$1',
                '^@ui/(.*): '<rootDir>/ui/src/$1',
            },
            transformIgnorePatterns: [
                "/node_modules/(?!(@xenova/transformers|react-force-graph-2d|react-kapsule|force-graph|jerrypick|d3-.*|internmap|lodash-es|kapsule|accessor-fn|canvas-color-tracker|tinycolor2|float-tooltip|preact|index-array-by|@babel/runtime|synckit))"
            ],
        },
    ],
    collectCoverage: false,
    maxWorkers: '50%',
};
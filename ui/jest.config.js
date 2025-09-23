export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
    moduleDirectories: ['node_modules', 'src'],
    moduleNameMapper: {
        '\\.css$': '<rootDir>/__mocks__/styleMock.js',
    },
};

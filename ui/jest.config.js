export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
    moduleDirectories: ['node_modules', 'src'],
    moduleNameMapper: {
        '\\.css$': '<rootDir>/__mocks__/styleMock.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
    },
};

export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
    },
    roots: ['<rootDir>/src'],
    moduleNameMapper: {
        '\\.css$': '<rootDir>/__mocks__/styleMock.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
    },
};

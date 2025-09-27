module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/../common/$1',
    '^@core/(.*)$': '<rootDir>/../core/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>/../node_modules', 'src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
    {
        ignores: ["dist/**"],
    },
    // Main configuration for React files
    {
        files: ['src/**/*.{js,jsx}'],
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                ecmaFeatures: {jsx: true},
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': 'warn',
            'no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]'}],
        },
    },
    // Configuration for test files
    {
        files: ['**/*.test.js', '**/*.test.jsx'],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
    // Configuration for mocks
    {
        files: ['**/__mocks__/**'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node,
            },
            parserOptions: {
                ecmaFeatures: {jsx: true},
            }
        },
    },
    // Configuration for Node.js script files
    {
        files: ['vite.config.js', 'jest.config.js', 'babel.config.cjs', 'eslint.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];

import js from '@eslint/js';
import promise from 'eslint-plugin-promise';

export default [
    js.configs.recommended,
    promise.configs['flat/recommended'],
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Node.js globals
                console: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                structuredClone: 'readonly',

                // Jest globals
                describe: 'readonly',
                test: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                jest: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            'no-shadow': 'error'
        }
    }
];
// @ts-check
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 6,
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        rules: {
            'curly': 'warn',
            'eqeqeq': 'warn',
            'no-throw-literal': 'warn',
            'semi': 'warn'
        }
    }
];

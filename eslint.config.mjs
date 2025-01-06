import globals from "globals";
import pluginJs from "@eslint/js";
import pluginJest from 'eslint-plugin-jest';

/** @type {import('eslint').Linter.Config[]} */
export default [
    { 
        files: ["**/*.js"],
        languageOptions: {
            sourceType: "commonjs",
        }
    },
    {
        files: ['**/*.spec.js', '**/*.test.js'],
        plugins: { jest: pluginJest },
        languageOptions: {
            globals: pluginJest.environments.globals.globals,
        },
        rules: {
            'jest/no-disabled-tests': 'warn',
            'jest/no-focused-tests': 'error',
            'jest/no-identical-title': 'error',
            'jest/prefer-to-have-length': 'warn',
            'jest/valid-expect': 'error',
        },
    },
    {
        languageOptions: { 
            globals: globals.browser 
        },
    },
    pluginJs.configs.recommended,
];
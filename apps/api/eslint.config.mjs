import baseConfig from '@registro/config/eslint/base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];

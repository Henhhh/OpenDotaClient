import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
export default defineConfig({
  files: ['src/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.ts'],
  extends: [js.configs.recommended, tseslint.configs.recommended],
  rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
}, {
  files: ['tests/**/*.ts'],
  rules: { '@typescript-eslint/no-explicit-any': 'off' },
});

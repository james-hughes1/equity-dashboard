import { FlatCompat } from '@eslint/eslintrc';
import prettier from 'eslint-plugin-prettier';

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
});

export default [
  // Next.js recommended rules
  ...compat.extends('next/core-web-vitals'),
  ...compat.extends('next/typescript'),

  // Project-specific rules
  {
    plugins: {
      prettier,
    },
    rules: {
      // Prettier enforcement
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          semi: true,
          printWidth: 100,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Ignore generated files
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
];

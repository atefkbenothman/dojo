import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

export default [
  ...compat.extends('next/core-web-vitals', 'prettier', 'next/typescript'),
  {
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
];

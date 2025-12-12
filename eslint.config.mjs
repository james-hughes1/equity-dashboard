import { FlatCompat } from "@eslint/eslintrc";

// FlatCompat allows extending old-style ESLint configs
const compat = new FlatCompat({
  baseDirectory: process.cwd(),
});

export default [
  // Extend Next.js recommended configs
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("next/typescript"),

  // Override global ignores
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

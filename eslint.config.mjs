import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
      ".agents/**",
      ".gemini/**",
      "scripts/**",
      "public/**/*.mjs",
      "public/**/*.js"
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      
      // React rules
      "react-hooks/purity": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      
      // Next.js rules
      "@next/next/no-img-element": "off",
      
      // General JavaScript rules
      "no-debugger": "error",
      "no-unreachable": "error",
      "no-fallthrough": "error",
      "no-redeclare": "error",
    },
  },
];

export default eslintConfig;

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
  {
    files: ["scripts/**/*.{js,mjs}", "tools/**/*.{js,mjs}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Architectural Boundaries: Domains only import through approved public APIs and cannot import higher-level feature slices
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    ignores: ["src/lib/adhkar/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/adhkar/**",
                "@/lib/arabic/**",
                "@/lib/book-text/**",
                "@/lib/books/**",
                "@/lib/fatwa/**",
                "@/lib/hadith/**",
                "@/lib/pdf/**",
                "@/lib/quran/**",
                "@/lib/radio/**",
                "@/lib/shared/**",
                "@/lib/sheikh/**",
                "@/features",
                "@/features/**",
              ],
              message:
                "Architecture violation: Lower-level library domain modules must not import from higher-level feature slices ('@/features'), and cross-domain imports must go through approved domain facades.",
            },
          ],
        },
      ],
    },
  },

  // Architectural Boundaries: Components, hooks, stores must access domain & feature functionality through approved facades
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/stores/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/adhkar/**",
                "@/lib/arabic/**",
                "@/lib/book-text/**",
                "@/lib/books/**",
                "@/lib/fatwa/**",
                "@/lib/hadith/**",
                "@/lib/pdf/**",
                "@/lib/quran/**",
                "@/lib/radio/**",
                "@/lib/shared/**",
                "@/lib/sheikh/**",
                "@/features/*/**",
              ],
              message:
                "Architecture violation: Components and UI state layers must access domain/feature functionality through approved root facades (e.g. '@/lib/quran', '@/features/adhkar'), not private internal subpaths.",
            },
          ],
        },
      ],
    },
  },
  // Architectural Boundaries: App routes may access approved root facades, feature facades, and server facade '@/lib/shared/server'
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/adhkar/**",
                "@/lib/arabic/**",
                "@/lib/book-text/**",
                "@/lib/books/**",
                "@/lib/fatwa/**",
                "@/lib/hadith/**",
                "@/lib/pdf/**",
                "@/lib/quran/**",
                "@/lib/radio/**",
                "@/lib/shared/!(server)",
                "@/lib/shared/!(server)/**",
                "@/lib/sheikh/**",
                "@/features/*/**",
              ],
              message:
                "Architecture violation: App layer must access domain/feature functionality through approved root facades (e.g. '@/features/adhkar') or approved server facade ('@/lib/shared/server').",
            },
          ],
        },
      ],
    },
  },
  // Architectural Boundaries: Feature Slices boundary enforcement
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/*/**",
                "@/lib/adhkar/**",
                "@/lib/arabic/**",
                "@/lib/book-text/**",
                "@/lib/books/**",
                "@/lib/fatwa/**",
                "@/lib/hadith/**",
                "@/lib/pdf/**",
                "@/lib/quran/**",
                "@/lib/radio/**",
                "@/lib/sheikh/**",
              ],
              message:
                "Architecture violation: Features must only access other features or domains through their approved root public facade, not internal private subpaths.",
            },
          ],
        },
      ],
    },
  },
  // Architectural Boundaries: src/lib/shared must not import from feature domains (preventing inverted/circular dependencies)
  {
    files: ["src/lib/shared/**/*.{ts,tsx}"],
    ignores: ["src/lib/shared/micro-shard-engine.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/adhkar", "@/lib/adhkar/**",
                "@/lib/books", "@/lib/books/**",
                "@/lib/book-text", "@/lib/book-text/**",
                "@/lib/fatwa", "@/lib/fatwa/**",
                "@/lib/hadith", "@/lib/hadith/**",
                "@/lib/pdf", "@/lib/pdf/**",
                "@/lib/quran", "@/lib/quran/**",
                "@/lib/radio", "@/lib/radio/**",
                "@/lib/sheikh", "@/lib/sheikh/**",
                "@/features", "@/features/**",
                "../adhkar", "../adhkar/**",
                "../books", "../books/**",
                "../book-text", "../book-text/**",
                "../fatwa", "../fatwa/**",
                "../hadith", "../hadith/**",
                "../pdf", "../pdf/**",
                "../quran", "../quran/**",
                "../radio", "../radio/**",
                "../sheikh", "../sheikh/**",
              ],
              message:
                "Architecture violation: src/lib/shared must not import from feature domains (preventing inverted/circular dependencies).",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;

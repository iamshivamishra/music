import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const testIgnores = ["**/*.test.ts", "**/*.test.tsx"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: testIgnores,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/repositories",
                "@/lib/repositories/*",
                "@/lib/models",
                "@/lib/models/*",
              ],
              message:
                "Pages and API routes must call services, not repositories or models.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    ignores: testIgnores,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/services",
                "@/lib/services/*",
                "@/lib/repositories",
                "@/lib/repositories/*",
                "@/lib/models",
                "@/lib/models/*",
              ],
              message:
                "UI code must not import services, repositories, or models.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/services/**/*.ts"],
    ignores: testIgnores,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/models", "@/lib/models/*"],
              message:
                "Services must call repositories, not Mongoose models.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    ignores: [
      ...testIgnores,
      "src/lib/services/**",
      "src/lib/repositories/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/repositories", "@/lib/repositories/*"],
              allowTypeImports: true,
              message:
                "Only services and repositories may import repositories. Serializers may import types.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
  ]),
]);

export default eslintConfig;

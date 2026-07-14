import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Tailwind CSS v4 linting (better-tailwindcss). The `recommended` config runs
  // stylistic rules as warnings and correctness rules (no-unknown-classes,
  // no-conflicting-classes, no-deprecated-classes) as errors. There is no
  // tailwind.config.js — v4 config lives in globals.css, so we point the plugin
  // at that CSS entry point (resolved relative to this config's cwd = apps/web).
  {
    extends: [betterTailwindcss.configs.recommended],
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app/globals.css",
      },
    },
    rules: {
      // Prettier (prettier-plugin-tailwindcss) owns class ordering; disable the
      // ESLint order rule so the two tools don't fight over the same fix.
      "better-tailwindcss/enforce-consistent-class-order": "off",
      // Prettier already controls line width; this rule only reflows class
      // strings onto multiple lines and conflicts with Prettier's formatting.
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      // These are our own project-global classes, not Tailwind utilities:
      //   sa-*                 — theme classes / Swiper hooks (see globals.css + theme.css)
      //   is-visible           — scroll-reveal toggle (globals.css .sa-reveal.is-visible)
      //   animate-ripple-effect — custom keyframe utility (globals.css)
      // Whitelist them so the rule still catches genuine typos elsewhere.
      "better-tailwindcss/no-unknown-classes": ["error", { ignore: ["^sa-", "^is-visible$", "^animate-"] }],
      // Convert arbitrary pixel values to the spacing scale where an exact scale
      // step exists: min-h-[34px] -> min-h-8.5, px-[16px] -> px-4, etc.
      // Requires the <html> root font size (16px) to map px -> rem scale steps.
      "better-tailwindcss/enforce-canonical-classes": ["warn", { rootFontSize: 16 }],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

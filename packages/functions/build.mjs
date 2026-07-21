/**
 * Bundle each Lambda handler into a single ESM file under functions/dist/.
 *
 * Output contract (consumed by infra/src/lambdas.ts):
 *   - dist/<name>.js   : bundled ESM, exporting the same names as the source
 *     handler (e.g. `handler`, or `createHandler`/`finalizeHandler`/`failHandler`).
 *   - `pg` is bundled in; nothing else needs to ship.
 *
 * The infra layer ships dist/<name>.js as <name>.mjs and sets the Lambda handler
 * to "<name>.<export>". nodejs20.x runs ESM from a .mjs file natively.
 *
 * Run: `npm run build` (from functions/). Run BEFORE `pulumi up`.
 */
import { build } from "esbuild";
import { mkdirSync, rmSync } from "node:fs";

const entries = [
  // Merged fetch+write per page (data never crosses Step Functions state).
  { name: "syncCarsPage", entry: "syncCarsPage/handler.ts" },
  { name: "syncArchivedLotsPage", entry: "syncArchivedLotsPage/handler.ts" },
  { name: "syncReferenceData", entry: "syncReferenceData/handler.ts" },
  { name: "refreshListingDetail", entry: "refreshListingDetail/handler.ts" },
  { name: "syncRunLifecycle", entry: "syncRunLifecycle/handler.ts" },
  // Periodic projection drift-repair sweep (looped state machine; 3 handlers).
  { name: "driftSweep", entry: "driftSweep/handler.ts" },
  // Async card-thumbnail baker. `sharp` is NATIVE and cannot be bundled into a
  // single ESM file — it is provided at runtime by the sharp Lambda layer (see
  // infra/src/lambdas.ts), so mark it external here.
  { name: "bakeThumbnail", entry: "bakeThumbnail/handler.ts", external: ["sharp"] },
];

// Clean first so renamed/removed handlers don't leave stale bundles behind.
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

await Promise.all(
  entries.map((e) =>
    build({
      entryPoints: [e.entry],
      outfile: `dist/${e.name}.js`,
      bundle: true,
      platform: "node",
      target: "node20",
      format: "esm",
      sourcemap: true,
      minify: false,
      // nodejs20.x provides @aws-sdk/* natively; plus any per-entry externals
      // (e.g. `sharp`, which ships via a Lambda layer instead of the bundle).
      external: ["@aws-sdk/*", ...(e.external ?? [])],
      // ESM interop shim so bundled CJS deps (pg) resolve require/__dirname.
      banner: {
        js: [
          "import { createRequire as __cr } from 'module';",
          "import { fileURLToPath as __ftu } from 'url';",
          "import { dirname as __dn } from 'path';",
          "const require = __cr(import.meta.url);",
          "const __filename = __ftu(import.meta.url);",
          "const __dirname = __dn(__filename);",
        ].join("\n"),
      },
    }),
  ),
);

console.log(`Built ${entries.length} Lambda bundles into dist/`);

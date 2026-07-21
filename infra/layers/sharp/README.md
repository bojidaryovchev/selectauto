# sharp Lambda layer

The `bakeThumbnail` Lambda resizes source images with [`sharp`](https://sharp.pixelplumbing.com/),
which has **native binaries** and therefore cannot be bundled into the single-file
esbuild output the other handlers use. Instead it is shipped as a Lambda layer and
marked `external` in `packages/functions/build.mjs`.

## Prep (run BEFORE `pulumi up`, like `pnpm --filter @auctions-ingestion/functions build`)

The layer must contain the **Linux x64 glibc** build that matches the `nodejs20.x`
runtime (Amazon Linux 2), regardless of the OS you deploy from:

```bash
cd infra/layers/sharp/nodejs
npm install --os=linux --cpu=x64 --libc=glibc --cpu-flags= sharp
```

This produces `infra/layers/sharp/nodejs/node_modules/sharp/...` with the correct
prebuilt binary. Lambda expects layer node modules under `nodejs/node_modules/`,
which is exactly this layout. Pulumi ships the whole `infra/layers/sharp` directory
via `pulumi.asset.FileArchive` (see `infra/src/lambdas.ts` `sharpLayer`).

> If you install without the `--os/--cpu/--libc` flags on macOS/Windows you get the
> wrong binary and the worker crashes at import with
> `Could not load the "sharp" module using the <platform> runtime`. Re-run the
> command above with the flags.

## node_modules is not committed

`node_modules/` here is git-ignored — regenerate it with the command above on a
fresh checkout / CI before deploying. Keep the `sharp` version here in sync with
`packages/functions/package.json` (used for local type-checking).

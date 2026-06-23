/**
 * Lambda: syncReferenceData
 *
 * Flow 4 — reference data sync. Triggered manually and optionally daily.
 *
 * Steps (each upstream call respects 1 req/sec via the in-handler delay; this
 * flow is NOT a Step Functions loop because the call count is bounded and small
 * relative to the page loops, and the calls are dependent — models depend on
 * manufacturer ids, generations on model ids):
 *
 *   1. GET /api/manufacturers/cars
 *   2. for each manufacturer: GET /api/models/{manufacturer_id}/cars
 *   3. for each model:        GET /api/generations/{model_id}/cars
 *
 * Skips work entirely if reference data already exists, UNLESS `force: true`.
 *
 * NOTE on timeout: expanding every manufacturer -> models -> generations at
 * 1 req/sec can exceed the Lambda 15-min limit for large catalogs. v1 supports
 * `maxManufacturers` to bound a single invocation; a future version should move
 * this into its own Step Functions loop. See README "Reference sync scaling".
 */
import { AuctionsApiClient } from "../shared/auctionsApiClient.js";
import {
  countManufacturers,
  createSyncRun,
  updateSyncRun,
  upsertGeneration,
  upsertManufacturer,
  upsertModel,
} from "../shared/db.js";
import { Logger } from "../shared/logger.js";
import { normalizeGeneration, normalizeManufacturer, normalizeModel } from "../shared/normalize.js";
import type { ReferenceSyncInput } from "../shared/types.js";

const RATE_LIMIT_MS = 1000; // 1 request / second

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const handler = async (
  input: ReferenceSyncInput = {},
): Promise<{
  syncRunId: number;
  manufacturers: number;
  models: number;
  generations: number;
  skipped: boolean;
}> => {
  const client = new AuctionsApiClient();
  const syncRunId = await createSyncRun("reference", { force: !!input.force });
  const log = new Logger({ flowType: "reference", syncRunId, force: !!input.force });
  log.info("reference_sync_start");

  try {
    // Skip if we already have reference data and not forced.
    if (!input.force && (await countManufacturers()) > 0) {
      await updateSyncRun(syncRunId, { status: "succeeded", finished: true });
      log.info("reference_sync_skipped", { reason: "data_exists" });
      return { syncRunId, manufacturers: 0, models: 0, generations: 0, skipped: true };
    }

    let mfgCount = 0;
    let modelCount = 0;
    let genCount = 0;

    // ---- 1. manufacturers ----
    const manufacturers = await client.getManufacturers();
    await sleep(RATE_LIMIT_MS);

    const limited =
      typeof input.maxManufacturers === "number" ? manufacturers.slice(0, input.maxManufacturers) : manufacturers;

    for (const rawMfg of limited) {
      const m = normalizeManufacturer(rawMfg as Record<string, unknown>);
      if (m.externalId === null) continue;
      await upsertManufacturer({
        externalId: m.externalId,
        name: m.name,
        imageUrl: m.imageUrl,
        carsQty: m.carsQty,
        rawJson: m.rawJson,
      });
      mfgCount += 1;

      // ---- 2. models for this manufacturer ----
      const models = await client.getModels(m.externalId);
      await sleep(RATE_LIMIT_MS);

      for (const rawModel of models) {
        const mod = normalizeModel(rawModel as Record<string, unknown>);
        if (mod.externalId === null) continue;
        await upsertModel({
          externalId: mod.externalId,
          manufacturerExternalId: mod.manufacturerExternalId ?? m.externalId,
          name: mod.name,
          imageUrl: mod.imageUrl,
          carsQty: mod.carsQty,
          rawJson: mod.rawJson,
        });
        modelCount += 1;

        // ---- 3. generations for this model ----
        const generations = await client.getGenerations(mod.externalId);
        await sleep(RATE_LIMIT_MS);

        for (const rawGen of generations) {
          const g = normalizeGeneration(rawGen as Record<string, unknown>);
          if (g.externalId === null) continue;
          await upsertGeneration({
            externalId: g.externalId,
            modelExternalId: g.modelExternalId ?? mod.externalId,
            name: g.name,
            fromYear: g.fromYear,
            toYear: g.toYear,
            rawJson: g.rawJson,
          });
          genCount += 1;
        }
      }

      await updateSyncRun(syncRunId, {
        recordsProcessedDelta: 0,
        lastPageProcessed: mfgCount,
      });
    }

    await updateSyncRun(syncRunId, {
      status: "succeeded",
      recordsProcessedDelta: mfgCount + modelCount + genCount,
      finished: true,
    });
    log.info("reference_sync_done", {
      manufacturers: mfgCount,
      models: modelCount,
      generations: genCount,
    });

    return { syncRunId, manufacturers: mfgCount, models: modelCount, generations: genCount, skipped: false };
  } catch (err) {
    await updateSyncRun(syncRunId, {
      status: "failed",
      errorMessage: (err as Error).message?.slice(0, 4000),
      finished: true,
    });
    log.error("reference_sync_failed", { error: (err as Error).message });
    throw err;
  }
};

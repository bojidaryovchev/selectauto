/**
 * Lambda(s): reference data sync — Flow 4.
 *
 * This file exports TWO ways to sync manufacturers -> models -> generations:
 *
 *  1. `handler` (legacy single-Lambda): does the whole walk in one invocation.
 *     Bounded by `maxManufacturers` for quick tests. The full catalog (~424
 *     manufacturers, ~5.5k models at 1 req/sec ≈ 1 hour) WILL exceed the 15-min
 *     Lambda limit, so use this only for small/forced runs.
 *
 *  2. The looped state-machine handlers (`referenceInitHandler`,
 *     `referenceManufacturerHandler`, `referenceFinalizeHandler`): the
 *     timeout-proof path. The `referenceSync` state machine processes ONE
 *     manufacturer per invocation with a 1s Wait between, so no single
 *     invocation runs long. This is what the daily schedule triggers.
 *
 * Endpoints:
 *   GET /api/manufacturers/cars
 *   GET /api/models/{manufacturer_id}/cars
 *   GET /api/generations/{model_id}/cars
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
import type {
  ReferenceInitOutput,
  ReferenceStepOutput,
  ReferenceSyncInput,
  ReferenceSyncState,
} from "../shared/types.js";

const RATE_LIMIT_MS = 1000; // 1 request / second

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Process ONE manufacturer's models + generations. Shared by both the legacy
 * single-Lambda `handler` and the new per-manufacturer state-machine step.
 * Returns the number of models + generations written. Paces each upstream call
 * by RATE_LIMIT_MS so the in-Lambda calls also respect ~1 req/sec.
 */
async function processManufacturerModels(
  client: AuctionsApiClient,
  manufacturerExternalId: number,
): Promise<{ models: number; generations: number }> {
  let models = 0;
  let generations = 0;

  const rawModels = await client.getModels(manufacturerExternalId);
  await sleep(RATE_LIMIT_MS);

  for (const rawModel of rawModels) {
    const mod = normalizeModel(rawModel as Record<string, unknown>);
    if (mod.externalId === null) continue;
    await upsertModel({
      externalId: mod.externalId,
      manufacturerExternalId: mod.manufacturerExternalId ?? manufacturerExternalId,
      name: mod.name,
      imageUrl: mod.imageUrl,
      carsQty: mod.carsQty,
      rawJson: mod.rawJson,
    });
    models += 1;

    const rawGens = await client.getGenerations(mod.externalId);
    await sleep(RATE_LIMIT_MS);

    for (const rawGen of rawGens) {
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
      generations += 1;
    }
  }

  return { models, generations };
}

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
    // NOTE: this gate is coarse — it checks PRESENCE, not COMPLETENESS. If a
    // prior run inserted some manufacturers then died (timeout / maxManufacturers
    // / API error), this returns early and the catalog stays half-synced until
    // someone runs with { force: true }. Acceptable for v1; the real fix is to
    // move reference sync into its own Step Functions loop (see README
    // "Reference-sync scaling"). Run with force:true after any partial failure.
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

      const { models, generations } = await processManufacturerModels(client, m.externalId);
      modelCount += models;
      genCount += generations;

      await updateSyncRun(syncRunId, { lastPageProcessed: mfgCount });
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

/* ===========================================================================
 * Timeout-proof reference sync — Step Functions loop (one manufacturer / step).
 *
 *   ReferenceInit                       (this file: referenceInitHandler)
 *     -> upsert ALL manufacturers, build the work-list of those with cars,
 *        create the sync_runs row, return { manufacturerIds, index:0, ... }
 *   SyncManufacturer (loop)             (this file: referenceManufacturerHandler)
 *     -> process manufacturerIds[index]'s models + generations, index++
 *   HasMore? --yes--> Wait 1s --> SyncManufacturer
 *            --no---> ReferenceFinalize (this file: referenceFinalizeHandler)
 *
 * Each SyncManufacturer invocation makes only ~1 + (models)*1 calls, always well
 * under the 15-min Lambda limit. The loop is resumable via sync_runs.
 * ======================================================================== */

interface ReferenceInitInput {
  force?: boolean;
  /** When true, also expand manufacturers with cars_qty = 0 (default: skip them). */
  includeEmpty?: boolean;
}

/** ReferenceInit: upsert all manufacturers, return the work-list + run state. */
export const referenceInitHandler = async (input: ReferenceInitInput = {}): Promise<ReferenceInitOutput> => {
  const client = new AuctionsApiClient();
  const syncRunId = await createSyncRun("reference", {
    mode: "looped",
    force: !!input.force,
    includeEmpty: !!input.includeEmpty,
  });
  const log = new Logger({ flowType: "reference", syncRunId });
  log.info("reference_init_start");

  try {
    const rawManufacturers = await client.getManufacturers();
    const ids: number[] = [];
    let upserted = 0;

    for (const raw of rawManufacturers) {
      const m = normalizeManufacturer(raw as Record<string, unknown>);
      if (m.externalId === null) continue;
      await upsertManufacturer({
        externalId: m.externalId,
        name: m.name,
        imageUrl: m.imageUrl,
        carsQty: m.carsQty,
        rawJson: m.rawJson,
      });
      upserted += 1;
      // Skip manufacturers with no cars unless explicitly included — ~3/4 of the
      // catalog has cars_qty = 0 and expanding them wastes the rate budget.
      if (input.includeEmpty || (m.carsQty ?? 0) > 0) {
        ids.push(m.externalId);
      }
    }

    await updateSyncRun(syncRunId, { recordsProcessedDelta: upserted });
    log.info("reference_init_done", { manufacturers: upserted, toExpand: ids.length });

    return {
      flowType: "reference",
      syncRunId,
      manufacturerIds: ids,
      index: 0,
      manufacturersDone: upserted,
      modelsDone: 0,
      generationsDone: 0,
      hasMore: ids.length > 0,
    };
  } catch (err) {
    await updateSyncRun(syncRunId, {
      status: "failed",
      errorMessage: (err as Error).message?.slice(0, 4000),
      finished: true,
    });
    log.error("reference_init_failed", { error: (err as Error).message });
    throw err;
  }
};

/** SyncManufacturer: process ONE manufacturer (models + generations), advance index. */
export const referenceManufacturerHandler = async (state: ReferenceSyncState): Promise<ReferenceStepOutput> => {
  const client = new AuctionsApiClient();
  const log = new Logger({ flowType: "reference", syncRunId: state.syncRunId, index: state.index });

  const manufacturerExternalId = state.manufacturerIds[state.index];
  const { models, generations } = await processManufacturerModels(client, manufacturerExternalId);

  const index = state.index + 1;
  const modelsDone = state.modelsDone + models;
  const generationsDone = state.generationsDone + generations;

  await updateSyncRun(state.syncRunId, {
    lastPageProcessed: index, // reuse as "manufacturers processed" checkpoint
    recordsProcessedDelta: models + generations,
  });
  log.info("reference_manufacturer_done", { manufacturerExternalId, models, generations, index });

  return {
    ...state,
    index,
    modelsDone,
    generationsDone,
    hasMore: index < state.manufacturerIds.length,
  };
};

/** ReferenceFinalize: mark the run succeeded. */
export const referenceFinalizeHandler = async (state: ReferenceSyncState): Promise<ReferenceSyncState> => {
  await updateSyncRun(state.syncRunId, { status: "succeeded", finished: true });
  new Logger({ flowType: "reference", syncRunId: state.syncRunId }).info("reference_sync_done", {
    manufacturers: state.manufacturersDone,
    models: state.modelsDone,
    generations: state.generationsDone,
  });
  return state;
};

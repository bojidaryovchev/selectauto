"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBackOfficeSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import {
  MobilebgError,
  addPictures,
  countAdvertPictures,
  isConfigured,
  logout,
  publishAdvert,
} from "@/lib/mobilebg/client";
import type { MobilebgOverrides } from "@/lib/mobilebg/map-car";
import { preparePictures } from "@/lib/mobilebg/pictures";
import { getMobilebgPreview } from "@/queries/mobilebg/get-advert-preview.query";
import type { ActionResult } from "@/types/action-result.type";

/**
 * Publish one car to mobile.bg — or correct the advert we already have there.
 *
 * Open to the whole back office, „Наблюдаващ“ included (the owner asked for it,
 * 18.09.2026) — a deliberate exception to the rule in lib/admin.ts that an
 * observer never edits. The guard is still the first statement, because a server
 * action is a POST anyone who can forge the request may call, and this one spends
 * money on an external platform and puts our name on a public advert. What stands
 * between a mistake and a paid advert is the preview, the blockers and the confirm
 * dialog — not the role.
 *
 * ── The order of operations is the whole design ─────────────────────────────
 *
 *  1. **Recompute the payload server-side.** The client sends only the car id and
 *     the admin's overrides — never the params. A preview that has gone stale (a
 *     tariff edit, a mapping fix, the lot archiving) must not be what we publish.
 *
 *  2. **Refuse on blockers or invalid list values.** `validateListValues` checks
 *     the payload against mobile.bg's LIVE vocabulary, and the mapper blocks on
 *     every field the API requires, so a payload mobile.bg would bounce is
 *     caught in the preview instead of as a failed call.
 *
 *  3. **Verify the photos BEFORE creating the advert.** mobile.bg downloads them
 *     from us; an advert whose photos fail is already billable and needs a second
 *     round of calls to repair. `preparePictures` fetches each candidate and
 *     confirms it is genuine JPEG.
 *
 *  4. **Claim the row, then call.** The `mobilebg_adverts` row is written first
 *     (status `pending`), so a crash between the API call and the bookkeeping
 *     leaves a visible, diagnosable record rather than a silent orphan advert we
 *     keep paying for.
 *
 *  5. **Pass the stored `ida` when we have one.** With it, `advertpub` is an edit;
 *     without it, a new — billable — advert. Losing that id means paying twice
 *     for the same car, which is why it is stored under a PK on `car_id`.
 *
 *  6. **Record what went live the moment it does.** Once `advertpub` succeeds the
 *     new price is public, whatever happens to the photos afterwards, so the
 *     sent price and payload hash are stored right then. They used to be stored
 *     only after the photos, and the stored price was the CALCULATED one even
 *     when an admin typed another, so the record could disagree with the advert.
 *
 *  7. **An edit leaves existing photos alone.** `advertpicts action=add` APPENDS,
 *     and an advert already holding 17 answers „No picts data", so re-adding them
 *     on every correction failed each one after its price had gone live (seen
 *     24.09.2026). Photos are added only when the advert has none.
 */

export type PublishAdvertInput = {
  carId: number;
  overrides?: MobilebgOverrides;
  /** Re-send even when the payload hash matches the last publish. */
  force?: boolean;
};

export type PublishAdvertResult = {
  ida: string;
  pictureCount: number;
  skippedPictures: { index: number; reason: string }[];
  priceEur: number | null;
  edited: boolean;
};

export async function publishCarToMobilebg(
  input: PublishAdvertInput,
): Promise<ActionResult<PublishAdvertResult>> {
  const session = await getBackOfficeSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const carId = Number(input?.carId);
  if (!Number.isInteger(carId) || carId <= 0) {
    return { success: false, error: "Невалиден автомобил." };
  }
  if (!isConfigured()) {
    return {
      success: false,
      error:
        "Импортът към mobile.bg не е конфигуриран (липсват MOBILEBG_USERNAME / MOBILEBG_PASSWORD). Акаунтът трябва да бъде оторизиран от mobile.bg.",
    };
  }

  // 1. Recompute — never trust a payload that came from the browser.
  const preview = await getMobilebgPreview(carId, input.overrides);
  if (!preview) return { success: false, error: "Автомобилът не е намерен или е скрит." };

  // 2. Refuse anything mobile.bg would mis-file.
  if (preview.mapped.blockers.length > 0) {
    return { success: false, error: preview.mapped.blockers.join(" ") };
  }
  if (preview.mapped.missing.length > 0) {
    return { success: false, error: preview.mapped.missing.map((m) => m.message).join(" ") };
  }
  if (preview.invalidValues.length > 0) {
    const list = preview.invalidValues.map((v) => `${v.field}="${v.value}"`).join(", ");
    return {
      success: false,
      error: `Стойности, които mobile.bg не разпознава: ${list}. Публикуването е спряно, за да не се плати обява в грешна категория.`,
    };
  }
  if (preview.unchanged && !input.force) {
    return { success: false, error: "Обявата вече е публикувана без промени." };
  }

  const db = getDb();
  const existingIda = preview.advert?.ida ?? null;

  // 3. Photos first — an advert with broken photos is already paid for.
  const { picts, skipped } = await preparePictures(carId, preview.source.images);
  if (picts.length === 0) {
    return {
      success: false,
      error: "Нито една снимка не е достъпна или не е в JPEG формат — обявата не е създадена.",
    };
  }

  // 4. Claim the row before the external call.
  await db
    .insert(schema.mobilebgAdverts)
    .values({
      carId,
      status: "pending",
      priceEur: preview.mapped.sentPriceEur?.toString() ?? null,
      markupPct: preview.markupPct.toString(),
      createdBy: session.user?.id ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.mobilebgAdverts.carId,
      set: { status: "pending", lastError: null, updatedAt: new Date() },
    });

  const sentPriceEur = preview.mapped.sentPriceEur;
  const logFields = {
    carId,
    user: session.user?.email ?? null,
    priceEur: sentPriceEur,
    computedPriceEur: preview.mapped.computedPriceEur,
    manualPrice: input.overrides?.priceEur !== undefined,
    payloadHash: preview.payloadHash,
  };

  // 5. Publish, then attach the photos to the advert it returned.
  let ida: string | null = null;
  let pictureCount = picts.length;
  try {
    const published = await publishAdvert(preview.mapped.params, existingIda);
    ida = published.ida;
    if (!ida) {
      throw new MobilebgError("/advertpub", "no_ida", "mobile.bg не върна ID на обявата.");
    }

    // 6. Live now: record exactly what was sent before anything else can fail.
    await db
      .update(schema.mobilebgAdverts)
      .set({
        ida,
        payloadHash: preview.payloadHash,
        priceEur: sentPriceEur?.toString() ?? null,
        markupPct: preview.markupPct.toString(),
        updatedAt: new Date(),
      })
      .where(eq(schema.mobilebgAdverts.carId, carId));

    // 7. An edited advert keeps its photos; only an advert with none gets them.
    const existingPictures = existingIda ? await countAdvertPictures(ida) : 0;
    if (existingPictures > 0) pictureCount = existingPictures;
    else await addPictures(ida, picts);
  } catch (error) {
    let message =
      error instanceof MobilebgError ? `${error.status}: ${error.message}` : String(error);
    // Name the rejected fields, with mobile.bg's own label where it has one.
    if (error instanceof MobilebgError && error.fields.length > 0) {
      const named = error.fields.map((f) => {
        const label = preview.catfields[f]?.ftext;
        return label ? `${f} („${label}“)` : f;
      });
      message += `. Грешни полета: ${named.join(", ")}`;
    }
    console.error("[mobilebg] publish failed", { ...logFields, ida: ida ?? existingIda, message });

    // Keep any id we DID get: the advert may exist and be billable, and the next
    // attempt must edit it rather than create a second one.
    await db
      .update(schema.mobilebgAdverts)
      .set({ status: "failed", lastError: message, ida: ida ?? existingIda, updatedAt: new Date() })
      .where(eq(schema.mobilebgAdverts.carId, carId));

    await logout();
    // Past `advertpub` the advert IS live with the new values; say so rather
    // than leave the admin believing nothing changed.
    const live = ida
      ? ` Обявата вече е обновена в mobile.bg с цена ${sentPriceEur !== null ? `${sentPriceEur.toLocaleString("bg-BG")} €` : "„при запитване“"}, но снимките не бяха добавени.`
      : "";
    return { success: false, error: `Публикуването се провали: ${message}.${live}` };
  }

  await db
    .update(schema.mobilebgAdverts)
    .set({
      ida,
      status: "published",
      payloadHash: preview.payloadHash,
      priceEur: sentPriceEur?.toString() ?? null,
      markupPct: preview.markupPct.toString(),
      pictureCount,
      lastError: null,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.mobilebgAdverts.carId, carId));

  // Audit row — same convention as the de-index desk, rendered by /admin/dnevnik.
  await db.insert(schema.contractEvents).values({
    entity: "mobilebg_advert",
    entityId: carId,
    action: existingIda ? "updated" : "published",
    actorId: session.user?.id ?? null,
    data: {
      ida,
      priceEur: sentPriceEur,
      computedPriceEur: preview.mapped.computedPriceEur,
      manualPrice: logFields.manualPrice,
      markupPct: preview.markupPct,
      pictures: pictureCount,
      skipped: skipped.length,
      payloadHash: preview.payloadHash,
    },
  });
  console.log(existingIda ? "[mobilebg] advert updated" : "[mobilebg] advert published", {
    ...logFields,
    ida,
    pictures: pictureCount,
  });

  await logout();
  revalidatePath("/admin/mobile-bg");

  return {
    success: true,
    data: {
      ida,
      pictureCount,
      skippedPictures: existingIda ? [] : skipped,
      priceEur: sentPriceEur,
      edited: Boolean(existingIda),
    },
  };
}

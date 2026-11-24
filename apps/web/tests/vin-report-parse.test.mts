/**
 * AuctionsAPI's reports answers as `src/lib/vin-report-parse.ts` reads them, and its history walk.
 *
 * The answers are the docs' samples (auctionsapi.com/docs/reports) and the live API's shapes of 24.11.2026, which
 * add fields the docs don't show (`available_usd`, `active_reports_*`, `is_verified_real`, `currency`). VINs other than
 * the docs' free test VIN are made up: this repository is public.
 *
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type * as Parse from "../src/lib/vin-report-parse";

// Node strips the types and needs the file's real name; TypeScript (noEmit, bundler resolution) won't take a `.ts`
// import path without `allowImportingTsExtensions`, so the types come from the type-only import above.
const {
  classifyOrderResponse,
  collectMissingHistory,
  FREE_TEST_VIN,
  normalizeVin,
  parseBalance,
  parseHistoryPage,
  parsePurchasedReport,
  reportMatchesClaim,
} = (await import(new URL("../src/lib/vin-report-parse.ts", import.meta.url).href)) as typeof Parse;
type HistoryItem = Parse.HistoryItem;
type HistoryPage = Parse.HistoryPage;

const CDN = "https://report-cars.b-cdn.net/reports/carfax";

describe("parseBalance", () => {
  test("the live answer", () => {
    assert.deepEqual(
      parseBalance({
        balance: 37,
        balance_usd: 37,
        active_reports_count: 0,
        active_reports_usd: 0,
        available_usd: 37,
        currency: "USD",
      }),
      { reports: 37, balanceUsd: 37, availableUsd: 37, activeReports: 0, activeUsd: 0, currency: "USD" },
    );
  });

  test("the docs' sample, without the live fields", () => {
    assert.deepEqual(parseBalance({ balance: 20, balance_usd: 15, currency: "USD" }), {
      reports: 20,
      balanceUsd: 15,
      availableUsd: 15,
      activeReports: 0,
      activeUsd: 0,
      currency: "USD",
    });
  });

  test("a report being generated holds part of the balance", () => {
    const b = parseBalance({ balance: 10, balance_usd: 10, active_reports_count: 1, active_reports_usd: 1 });
    assert.equal(b?.availableUsd, 9);
  });

  test("anything else is not a balance", () => {
    assert.equal(parseBalance({ error: "inactive service" }), null);
    assert.equal(parseBalance(null), null);
    assert.equal(parseBalance([]), null);
  });
});

describe("parsePurchasedReport", () => {
  test("the live answer for the free test VIN", () => {
    assert.deepEqual(
      parsePurchasedReport({
        html: `${CDN}/${FREE_TEST_VIN}-66484.html`,
        pdf: `${CDN}/${FREE_TEST_VIN}-776251.pdf`,
        id: 73684,
        balance_after: 37,
        balance_after_usd: 37,
        currency: "USD",
        is_verified_real: true,
      }),
      {
        externalId: 73684,
        htmlUrl: `${CDN}/${FREE_TEST_VIN}-66484.html`,
        pdfUrl: `${CDN}/${FREE_TEST_VIN}-776251.pdf`,
        verifiedReal: true,
        balanceAfterUsd: 37,
        balanceAfterReports: 37,
      },
    );
  });

  test("without pdf=1 there is no PDF", () => {
    const r = parsePurchasedReport({ html: `${CDN}/x.html`, id: 5, balance_after_usd: 14.25 });
    assert.equal(r?.pdfUrl, null);
    assert.equal(r?.verifiedReal, null);
    assert.equal(r?.balanceAfterUsd, 14.25);
  });

  test("no id or no html link is not a report", () => {
    assert.equal(parsePurchasedReport({ html: `${CDN}/x.html` }), null);
    assert.equal(parsePurchasedReport({ id: 5, html: "javascript:alert(1)" }), null);
    assert.equal(parsePurchasedReport({ id: 5 }), null);
  });
});

describe("classifyOrderResponse", () => {
  const ok = { html: `${CDN}/x.html`, pdf: `${CDN}/x.pdf`, id: 9, balance_after: 1, balance_after_usd: 1 };

  test("200 with a report", () => {
    assert.equal(classifyOrderResponse(200, ok).kind, "ok");
  });

  test("200 without a report, or a body that isn't JSON, is unknown — it may still have been paid", () => {
    assert.equal(classifyOrderResponse(200, { status: "queued" }).kind, "unknown");
    assert.equal(classifyOrderResponse(200, null).kind, "unknown");
  });

  test("the docs' refusals", () => {
    const reason = (status: number, body: unknown) => {
      const o = classifyOrderResponse(status, body);
      return o.kind === "refused" ? o.reason : o.kind;
    };
    assert.equal(reason(400, { error: "records not found for this vin number" }), "no_records");
    assert.equal(
      reason(400, { error: "length of vin number should be 17 characters", vin: "ABC", length: 3 }),
      "bad_vin",
    );
    assert.equal(
      reason(402, { error: "insufficient funds", message: "Your USD balance is insufficient", balance: 0 }),
      "insufficient_funds",
    );
    assert.equal(reason(403, { error: "inactive service" }), "inactive");
    assert.equal(reason(403, { message: "Unauthenticated." }), "unauthorized");
    assert.equal(reason(401, null), "unauthorized");
    assert.equal(
      reason(404, { error: "report was not found", note: "please check record", cached: true }),
      "not_found",
    );
    assert.equal(
      reason(409, { error: "generation already in progress", status: "conflict", retry_after: 180 }),
      "in_progress",
    );
    assert.equal(reason(429, null), "rate_limited");
  });

  test("server and gateway errors are unknown", () => {
    assert.equal(classifyOrderResponse(500, { message: "Server Error" }).kind, "unknown");
    assert.equal(classifyOrderResponse(502, null).kind, "unknown");
    assert.equal(classifyOrderResponse(504, null).kind, "unknown");
  });
});

describe("parseHistoryPage", () => {
  test("the live shape: items, page and total; unreadable items are left out", () => {
    const page = parseHistoryPage({
      data: [
        {
          id: 44091,
          type: "carfax",
          vin: "1hgcm82633a004352",
          path: { html: `${CDN}/1HGCM82633A004352-1.html`, pdf: `${CDN}/1HGCM82633A004352-2.pdf` },
          created_at: "2026-06-29T14:23:27.000000Z",
          is_verified_real: null,
        },
        { id: 44092, type: "vhr", vin: "1HGCM82633A004352", path: {}, created_at: "2026-06-30T10:00:00.000000Z" },
        { id: 44093, type: "carfax", vin: "TOO-SHORT", path: {}, created_at: "2026-06-30T10:00:00.000000Z" },
      ],
      links: { first: "x", last: "x", prev: null, next: null },
      meta: { current_page: 1, last_page: 5, per_page: 15, total: 68 },
    });
    assert.ok(page);
    assert.equal(page.lastPage, 5);
    assert.equal(page.total, 68);
    assert.equal(page.items.length, 1);
    assert.deepEqual(page.items[0], {
      externalId: 44091,
      provider: "carfax",
      vin: "1HGCM82633A004352",
      htmlUrl: `${CDN}/1HGCM82633A004352-1.html`,
      pdfUrl: `${CDN}/1HGCM82633A004352-2.pdf`,
      verifiedReal: null,
      createdAt: new Date("2026-06-29T14:23:27.000Z"),
    });
  });

  test("an error answer is not a page", () => {
    assert.equal(parseHistoryPage({ error: "inactive service" }), null);
  });
});

/** A history of `count` reports, 15 a page, oldest first (the live API's order), ids from 1000. */
function fakeHistory(count: number, { newestFirst = false } = {}) {
  const all: HistoryItem[] = Array.from({ length: count }, (_, i) => ({
    externalId: 1000 + i,
    provider: "carfax",
    vin: "1HGCM82633A004352",
    htmlUrl: null,
    pdfUrl: null,
    verifiedReal: null,
    createdAt: new Date(Date.UTC(2026, 6, 1) + i * 3_600_000),
  }));
  const ordered = newestFirst ? [...all].reverse() : all;
  const lastPage = Math.max(1, Math.ceil(count / 15));
  const reads: number[] = [];
  const fetchPage = async (page: number): Promise<HistoryPage> => {
    reads.push(page);
    return { items: ordered.slice((page - 1) * 15, page * 15), currentPage: page, lastPage, total: count };
  };
  return { all, fetchPage, reads };
}

const holding = (ids: Iterable<number>) => {
  const set = new Set(ids);
  return async (asked: number[]) => new Set(asked.filter((id) => set.has(id)));
};

describe("collectMissingHistory", () => {
  test("a first import reads every page and returns everything, oldest first", async () => {
    const h = fakeHistory(68);
    const r = await collectMissingHistory({ fetchPage: h.fetchPage, knownIds: holding([]) });
    assert.equal(r.items.length, 68);
    assert.deepEqual(
      r.items.map((i) => i.externalId),
      h.all.map((i) => i.externalId),
    );
    assert.deepEqual(h.reads, [1, 5, 4, 3, 2]);
    assert.equal(r.complete, true);
  });

  test("in step with the history it reads page 1 and the last page only", async () => {
    const h = fakeHistory(68);
    const r = await collectMissingHistory({
      fetchPage: h.fetchPage,
      knownIds: holding(h.all.map((i) => i.externalId)),
    });
    assert.equal(r.items.length, 0);
    assert.deepEqual(h.reads, [1, 5]);
  });

  test("one page reads once", async () => {
    const h = fakeHistory(9);
    const r = await collectMissingHistory({ fetchPage: h.fetchPage, knownIds: holding([1000, 1001]) });
    assert.equal(r.items.length, 7);
    assert.deepEqual(h.reads, [1]);
  });

  test("reports bought elsewhere since the last import are found on the newest pages", async () => {
    const h = fakeHistory(70);
    const known = h.all.slice(0, 58).map((i) => i.externalId);
    const r = await collectMissingHistory({ fetchPage: h.fetchPage, knownIds: holding(known) });
    assert.deepEqual(
      r.items.map((i) => i.externalId),
      h.all.slice(58).map((i) => i.externalId),
    );
    // Page 5 (ids 1060–1069) and page 4 (1045–1059) hold new ones; page 3 holds none, so the walk stops there.
    assert.deepEqual(h.reads, [1, 5, 4, 3]);
  });

  test("a report bought from the admin and one bought elsewhere at the same time are both found", async () => {
    const h = fakeHistory(69);
    const known = [...h.all.slice(0, 67).map((i) => i.externalId), 1068];
    const r = await collectMissingHistory({ fetchPage: h.fetchPage, knownIds: holding(known) });
    assert.deepEqual(
      r.items.map((i) => i.externalId),
      [1067],
    );
  });

  test("a history listed newest first is walked from page 1", async () => {
    const h = fakeHistory(40, { newestFirst: true });
    const known = h.all.slice(0, 35).map((i) => i.externalId);
    const r = await collectMissingHistory({ fetchPage: h.fetchPage, knownIds: holding(known) });
    assert.deepEqual(
      r.items.map((i) => i.externalId),
      h.all.slice(35).map((i) => i.externalId),
    );
    // Page 3 is read to learn the direction; page 2 to see it holds nothing new.
    assert.deepEqual(h.reads, [1, 3, 2]);
  });

  test("a walk stops at maxPages and says so", async () => {
    const h = fakeHistory(150);
    const r = await collectMissingHistory({ fetchPage: h.fetchPage, knownIds: holding([]), maxPages: 4 });
    assert.equal(r.complete, false);
    assert.deepEqual(h.reads, [1, 10, 9, 8]);
    // Pages 10, 9 and 8; page 1 was read only for the page count.
    assert.deepEqual(
      r.items.map((i) => i.externalId),
      h.all.slice(105).map((i) => i.externalId),
    );
  });
});

describe("reportMatchesClaim", () => {
  const claim = { vin: "1HGCM82633A004352", provider: "carfax", createdAt: new Date("2026-11-24T10:00:00Z") };
  const item = (iso: string, over: Partial<HistoryItem> = {}) => ({
    vin: "1HGCM82633A004352",
    provider: "carfax" as const,
    createdAt: new Date(iso),
    ...over,
  });

  test("the same VIN and provider, from 2 minutes before to 15 after", () => {
    assert.equal(reportMatchesClaim(item("2026-11-24T10:00:50Z"), claim), true);
    assert.equal(reportMatchesClaim(item("2026-11-24T09:58:30Z"), claim), true);
    assert.equal(reportMatchesClaim(item("2026-11-24T10:14:59Z"), claim), true);
  });

  test("anything else is another report", () => {
    assert.equal(reportMatchesClaim(item("2026-11-24T10:15:01Z"), claim), false);
    assert.equal(reportMatchesClaim(item("2026-11-24T09:57:00Z"), claim), false);
    assert.equal(reportMatchesClaim(item("2026-11-24T10:01:00Z", { provider: "autocheck" }), claim), false);
    assert.equal(reportMatchesClaim(item("2026-11-24T10:01:00Z", { vin: "1HGCM82633A004353" }), claim), false);
  });
});

test("normalizeVin trims and upper-cases a valid VIN, and refuses the rest", () => {
  assert.equal(normalizeVin(" 7farw2h56je022576 "), FREE_TEST_VIN);
  assert.equal(normalizeVin("7FARW2H56JE02257"), null);
  assert.equal(normalizeVin("7FARW2H56JE0225I6"), null);
  assert.equal(normalizeVin(42), null);
});

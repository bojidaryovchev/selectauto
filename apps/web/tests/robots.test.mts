/**
 * The robots.txt groups (src/lib/robots-rules.ts): search engines keep the whole site, the bulk AI crawlers keep
 * everything but the car pages, and the user-triggered AI fetchers keep everything.
 *
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

// Computed specifier: Node strips the types when it loads the file, and TypeScript doesn't ask for `.ts` imports.
const { robotsRules, AI_CRAWLERS, AI_USER_FETCHERS, AI_CRAWLER_DISALLOW, DISALLOW } = await import(
  new URL("../src/lib/robots-rules.ts", import.meta.url).href
);

type Group = { userAgent: string; allow: string; disallow: string[] };
const groups: Group[] = robotsRules();
const group = (ua: string) => groups.find((g) => g.userAgent === ua);

describe("robots groups", () => {
  test("search engines (*) keep the car pages and the catalog", () => {
    const all = group("*")!;
    assert.equal(all.allow, "/");
    assert.deepEqual(all.disallow, DISALLOW);
    for (const path of AI_CRAWLER_DISALLOW) assert.ok(!all.disallow.includes(path), path);
  });

  test("every bulk AI crawler keeps the site but not the car pages", () => {
    assert.ok(AI_CRAWLERS.length > 0);
    for (const ua of AI_CRAWLERS) {
      const g = group(ua)!;
      assert.equal(g.allow, "/", ua);
      for (const path of [...DISALLOW, "/avtomobil/", "/vsichki-avtomobili?"]) assert.ok(g.disallow.includes(path), `${ua} ${path}`);
    }
  });

  test("the user-triggered fetchers keep the car pages", () => {
    for (const ua of AI_USER_FETCHERS) assert.deepEqual(group(ua)!.disallow, DISALLOW, ua);
  });

  test("no user agent is listed twice, and Googlebot / Bingbot are never named", () => {
    const names = groups.map((g) => g.userAgent.toLowerCase());
    assert.equal(new Set(names).size, names.length);
    for (const engine of ["googlebot", "bingbot", "yandex", "applebot", "duckduckbot"]) assert.ok(!names.includes(engine), engine);
  });
});

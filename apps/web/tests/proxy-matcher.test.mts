/**
 * Which requests reach the proxy (src/proxy.ts `config.matcher`): every car page (the 410 check) and the back office
 * (the admin gate), and anything else only with an Auth.js session cookie. Anonymous traffic — ~99 % of it crawlers —
 * skips the proxy everywhere else, so it no longer pays a proxy invocation per request.
 *
 * The config is read from proxy.ts the way `next build` reads it (SWC parse + the same static-value extraction), so
 * this also fails if the matcher stops being a literal Next can analyse. Matching uses Next's own helper
 * (`unstable_doesMiddlewareMatch`, the same matcher compilation the build uses).
 *
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
// What a Next server loads first: puts Node's AsyncLocalStorage on globalThis, which the request helpers below expect.
require("next/dist/server/node-environment-baseline");
const { loadBindings } = require("next/dist/build/swc");
const { parseModule } = require("next/dist/build/analysis/parse-module");
const { extractExportedConstValue } = require("next/dist/build/analysis/extract-const-value");
const { unstable_doesMiddlewareMatch } = require("next/experimental/testing/server");

const proxyPath = fileURLToPath(new URL("../src/proxy.ts", import.meta.url));
await loadBindings();
const ast = await parseModule(proxyPath, readFileSync(proxyPath, "utf8"));
assert.ok(ast, "src/proxy.ts parses");
// Same unwrapping as the build (get-page-static-info.js): null = no `config`, `{ unsupported }` = not a literal.
const extracted = extractExportedConstValue(ast, "config");
assert.ok(extracted && !("unsupported" in extracted), "src/proxy.ts exports a `config` literal Next can read");
const config = extracted.value;
// Without a matcher the helper answers true for every URL, which would let the positive tests pass on nothing.
assert.ok(Array.isArray(config.matcher) && config.matcher.length > 0, "config.matcher is a non-empty array");

/** Auth.js's session cookie over HTTPS and plain HTTP, whole or as the first chunk of a split token. */
const SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "__Secure-authjs.session-token.0",
  "authjs.session-token",
  "authjs.session-token.0",
];

function reaches(path: string, cookies?: Record<string, string>): boolean {
  return unstable_doesMiddlewareMatch({ config, url: `https://selectauto.bg${path}`, cookies, nextConfig: {} });
}

describe("proxy matcher", () => {
  test("every car page reaches it, with or without a session (the 410 check)", () => {
    for (const path of ["/avtomobil/123", "/avtomobil/123/", "/avtomobil/123?_rsc=abc", "/avtomobil/123.rsc"]) {
      assert.equal(reaches(path), true, path);
    }
  });

  test("the back office reaches it, with or without a session (the admin gate)", () => {
    for (const path of ["/admin", "/admin/dogovori", "/admin/dogovori/5"]) {
      assert.equal(reaches(path), true, path);
    }
  });

  test("an anonymous request anywhere else skips it", () => {
    const paths = [
      "/",
      "/vsichki-avtomobili",
      "/vsichki-avtomobili?brand=1&model=2",
      "/avtomobili/marka/bmw",
      "/blog",
      "/sign-in",
      "/lyubimi",
      "/api/auth/session",
      "/api/inquiry",
      "/api/cron/deindex-sweep",
      "/robots.txt",
      "/sitemap.xml",
    ];
    for (const path of paths) assert.equal(reaches(path), false, path);
  });

  test("a session cookie, under any of its names, brings the pages and API routes back", () => {
    for (const name of SESSION_COOKIES) {
      for (const path of ["/", "/vsichki-avtomobili", "/lyubimi", "/sign-in", "/api/auth/session"]) {
        assert.equal(reaches(path, { [name]: "token" }), true, `${name} ${path}`);
      }
    }
  });

  test("static files and Next internals never reach it, even with a session", () => {
    const paths = ["/_next/static/chunks/main.js", "/_next/image?url=%2Flogo.png&w=256&q=75", "/logo.png", "/favicon.ico"];
    for (const name of SESSION_COOKIES) {
      for (const path of paths) assert.equal(reaches(path, { [name]: "token" }), false, `${name} ${path}`);
    }
  });

  test("other cookies, or an empty session cookie, don't count as a session", () => {
    assert.equal(reaches("/", { "authjs.csrf-token": "x", "__Secure-authjs.callback-url": "y" }), false);
    assert.equal(reaches("/", { "__Secure-authjs.session-token": "" }), false);
  });
});

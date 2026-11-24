/**
 * `leadSource` (src/lib/lead-source.ts): the ad source and campaign the admin's lead details show, read from the page
 * address stored with a lead.
 *
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

// Computed specifier: Node strips the types when it loads the file, and TypeScript doesn't ask for `.ts` imports.
const { leadSource } = await import(new URL("../src/lib/lead-source.ts", import.meta.url).href);

describe("leadSource", () => {
  test("UTM tags: the source with its medium, and the campaign", () => {
    assert.deepEqual(
      leadSource("https://www.selectauto.bg/zapitvane?utm_source=google&utm_medium=cpc&utm_campaign=korea&gclid=Cj0K"),
      { source: "google · cpc", campaign: "korea" },
    );
  });

  test("a source without a medium stands alone", () => {
    assert.deepEqual(leadSource("https://www.selectauto.bg/?utm_source=chatgpt.com"), { source: "chatgpt.com" });
  });

  test("Google Ads' click ids without UTM tags", () => {
    for (const id of ["gclid", "gbraid", "wbraid"]) {
      assert.deepEqual(leadSource(`https://www.selectauto.bg/zapitvane?${id}=abc123`), { source: "Google Ads" });
    }
  });

  test("Facebook's click id", () => {
    assert.deepEqual(leadSource("https://www.selectauto.bg/zapitvane?fbclid=IwAR0abc"), { source: "Facebook" });
  });

  test("a campaign without a source", () => {
    assert.deepEqual(leadSource("https://www.selectauto.bg/zapitvane?utm_campaign=spring"), { campaign: "spring" });
  });

  test("an address without tags, a blank tag, no address and a broken one give nothing", () => {
    assert.deepEqual(leadSource("https://www.selectauto.bg/avtomobil/123"), {});
    assert.deepEqual(leadSource("https://www.selectauto.bg/zapitvane?utm_source=%20&gclid="), {});
    assert.deepEqual(leadSource(null), {});
    assert.deepEqual(leadSource(""), {});
    assert.deepEqual(leadSource("not a url"), {});
  });

  test("encoded values are decoded", () => {
    assert.deepEqual(leadSource("https://www.selectauto.bg/zapitvane?utm_source=facebook&utm_campaign=%D0%BA%D0%BE%D1%80%D0%B5%D1%8F"), {
      source: "facebook",
      campaign: "корея",
    });
  });
});

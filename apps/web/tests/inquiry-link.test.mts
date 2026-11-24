/**
 * The inquiry links (src/lib/inquiry-link.ts): every „Запитване" leads to /zapitvane, and a car page's link carries its
 * car in the fragment, which the page reads back — keeping only well-formed values.
 *
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

// Computed specifier: Node strips the types when it loads the file, and TypeScript doesn't ask for `.ts` imports.
const { inquiryHref, prefillFromHash, INQUIRY_PATH } = await import(
  new URL("../src/lib/inquiry-link.ts", import.meta.url).href
);

const CAR = {
  brand: "Kia",
  model: "Morning",
  carLabel: "Kia Morning (2024)",
  lotNumber: "43215005",
  makeLogo: "/brand-logos/kia.svg",
  carPath: "/avtomobil/18026705",
};

describe("inquiryHref", () => {
  test("without a car: the page", () => {
    assert.equal(INQUIRY_PATH, "/zapitvane");
    assert.equal(inquiryHref(), "/zapitvane");
    assert.equal(inquiryHref({ brand: "Kia" }), "/zapitvane");
  });

  test("a car travels in the fragment and comes back whole", () => {
    const href = inquiryHref(CAR);
    assert.ok(href.startsWith("/zapitvane#"));
    assert.ok(!href.includes("?"), "never in the query");
    assert.deepEqual(prefillFromHash(href.slice(href.indexOf("#"))), CAR);
  });

  test("a vendor's logo address is left out, so the plate shows the make's letters", () => {
    const href = inquiryHref({ ...CAR, makeLogo: "https://cdn.example.com/kia.png" });
    assert.equal(prefillFromHash(href.split("#")[1]).makeLogo, null);
  });
});

describe("prefillFromHash", () => {
  test("nothing, or no make or model: no car", () => {
    assert.equal(prefillFromHash(""), undefined);
    assert.equal(prefillFromHash("#"), undefined);
    assert.equal(prefillFromHash("#make=Kia"), undefined);
    assert.equal(prefillFromHash("#zapitvane-quiz"), undefined);
  });

  test("malformed parts go missing; the rest stays", () => {
    const p = prefillFromHash(
      "#make=Kia&model=Morning&lot=43215005%3Cscript%3E&logo=https%3A%2F%2Fevil.example%2Fx.svg&from=%2F%2Fevil.example",
    );
    assert.deepEqual(p, {
      brand: "Kia",
      model: "Morning",
      carLabel: undefined,
      lotNumber: undefined,
      makeLogo: null,
      carPath: undefined,
    });
  });

  test("labels with control characters or too long are refused", () => {
    assert.equal(prefillFromHash(`#make=Kia&model=${encodeURIComponent("Morning\nX")}`), undefined);
    assert.equal(prefillFromHash(`#make=${"K".repeat(81)}&model=Morning`), undefined);
  });

  test("Cyrillic and spaces survive", () => {
    const p = prefillFromHash(inquiryHref({ brand: "Hyundai", model: "Grandeur", carLabel: "Hyundai Grandeur (2022) – газ" }).split("#")[1]);
    assert.equal(p.carLabel, "Hyundai Grandeur (2022) – газ");
  });
});

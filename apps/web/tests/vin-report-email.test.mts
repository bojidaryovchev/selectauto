/**
 * The report e-mail's subject, file name, default text and recipient check (`src/lib/vin-report-email.ts`).
 * Run with `pnpm --filter @selectauto/web test`.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type * as Email from "../src/lib/vin-report-email";

// See vin-report-parse.test.mts: Node needs the real file name, TypeScript takes the types from the import above.
const { defaultVinReportEmailBody, leadEmailAddress, vinReportEmailSubject, vinReportPdfFilename } = (await import(
  new URL("../src/lib/vin-report-email.ts", import.meta.url).href
)) as typeof Email;

const VIN = "1HGCM82633A004352";

describe("the report e-mail", () => {
  test("its subject names the provider and the VIN — it files the client's answer into the conversation", () => {
    assert.equal(vinReportEmailSubject("Carfax", VIN), `Отчет Carfax за VIN ${VIN} — SelectAuto`);
    assert.equal(vinReportEmailSubject("AutoCheck", VIN), `Отчет AutoCheck за VIN ${VIN} — SelectAuto`);
  });

  test("the PDF is named after the provider and the VIN", () => {
    assert.equal(vinReportPdfFilename("Carfax", VIN), `Carfax-${VIN}.pdf`);
  });

  test("the default text greets the client by name and names the car", () => {
    const body = defaultVinReportEmailBody({
      name: "  Иван Петров ",
      providerLabel: "Carfax",
      vin: VIN,
      vehicle: "HONDA ACCORD EX 2003",
      phone: "+359 898 980 011",
    });
    assert.equal(
      body,
      [
        "Здравейте, Иван Петров!",
        "",
        `Изпращаме Ви отчета Carfax за автомобила с VIN ${VIN} (HONDA ACCORD EX 2003). Отчетът е в прикачения PDF файл.`,
        "",
        "Ако имате въпроси по отчета или искате да обсъдим автомобила, отговорете на този имейл или се обадете на +359 898 980 011.",
        "",
        "Поздрави,",
        "Екипът на SelectAuto",
      ].join("\n"),
    );
  });

  test("without a name or a vehicle it still reads", () => {
    const body = defaultVinReportEmailBody({
      name: null,
      providerLabel: "AutoCheck",
      vin: VIN,
      vehicle: " ",
      phone: "X",
    });
    assert.ok(body.startsWith("Здравейте!\n"));
    assert.ok(body.includes(`отчета AutoCheck за автомобила с VIN ${VIN}. Отчетът`));
  });
});

// Addresses on example.com (reserved, RFC 2606): this repository is public.
describe("leadEmailAddress", () => {
  test("an address as the visitor typed it, trimmed and lower-cased", () => {
    assert.equal(leadEmailAddress("  Ivan.Petrov@Example.COM "), "ivan.petrov@example.com");
  });

  test("nothing that isn't one address", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "ivan",
      "ivan@example",
      "a@example.com, c@example.com",
      "Ivan <a@example.com>",
      "a b@example.com",
      "a@example.com;c@example.com",
    ]) {
      assert.equal(leadEmailAddress(bad), null, String(bad));
    }
  });
});

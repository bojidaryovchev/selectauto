import { Font, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ReactElement } from "react";
import type { ContractDocSnapshot } from "@/types/contract-snapshot.type";
import type { NoticeSnapshot } from "@/types/notice-snapshot.type";
import { DeliveryContractPdf } from "./delivery-contract-pdf";
import { DepositContractPdf } from "./deposit-contract-pdf";
import { MediationContractPdf } from "./mediation-contract-pdf";
import { PaymentNoticePdf } from "./payment-notice-pdf";

/**
 * Server-side PDF rendering (Node runtime — @react-pdf/renderer, no headless
 * browser). Fonts: PT Sans (OFL) — full Cyrillic, bundled under src/pdf/fonts
 * and force-included in the serverless trace via next.config
 * `outputFileTracingIncludes` (nothing imports the .ttf files directly).
 */

// Hyphenation OFF, registered at module load and BEFORE any font: the layout
// engine otherwise breaks Bulgarian words mid-line and prints a hyphen (it split
// "Лазо Войвода 19," into "19-" + ","), which reads as a typo on a legal document.
Font.registerHyphenationCallback((word) => [word]);

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  const fontsDir = path.join(process.cwd(), "src", "pdf", "fonts");
  Font.register({
    family: "PTSans",
    fonts: [
      { src: path.join(fontsDir, "PTSans-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(fontsDir, "PTSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  fontsRegistered = true;
}

/**
 * The company stamp + signature, scanned and keyed onto transparency. Read as a
 * BUFFER rather than passed as a path: react-pdf treats a bare string `src` as a
 * URL and tries to fetch it (a Windows path then fails outright). The file is
 * force-included in the serverless trace via next.config; if it's ever missing
 * the contract still renders, just without the stamp.
 */
let stampCache: { data: Buffer; format: "png" } | null | undefined;

function stampImage(): { data: Buffer; format: "png" } | undefined {
  if (stampCache === undefined) {
    const p = path.join(process.cwd(), "src", "pdf", "assets", "stamp.png");
    stampCache = existsSync(p) ? { data: readFileSync(p), format: "png" } : null;
  }
  return stampCache ?? undefined;
}

/** Renders a CONTRACT document (посредничество or доставка) from its snapshot. */
export async function renderContractPdf(snapshot: ContractDocSnapshot): Promise<Buffer> {
  registerFonts();
  const component =
    snapshot.kind === "deposit"
      ? DepositContractPdf
      : snapshot.kind === "delivery"
        ? DeliveryContractPdf
        : MediationContractPdf;
  return renderToBuffer(
    createElement(component, { snapshot, stampSrc: stampImage() }) as unknown as ReactElement<DocumentProps>,
  );
}

/** Renders a payment notice PDF from its frozen snapshot. */
export async function renderPaymentNoticePdf(snapshot: NoticeSnapshot): Promise<Buffer> {
  registerFonts();
  // renderToBuffer types its argument as the inner <Document>'s props; a
  // wrapper component that RENDERS a Document is fine at runtime — cast.
  return renderToBuffer(createElement(PaymentNoticePdf, { snapshot }) as unknown as ReactElement<DocumentProps>);
}

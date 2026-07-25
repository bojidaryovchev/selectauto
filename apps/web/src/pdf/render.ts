import { Font, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import path from "node:path";
import { createElement, type ReactElement } from "react";
import type { NoticeSnapshot } from "@/types/notice-snapshot.type";
import { PaymentNoticePdf } from "./payment-notice-pdf";

/**
 * Server-side PDF rendering (Node runtime — @react-pdf/renderer, no headless
 * browser). Fonts: PT Sans (OFL) — full Cyrillic, bundled under src/pdf/fonts
 * and force-included in the serverless trace via next.config
 * `outputFileTracingIncludes` (nothing imports the .ttf files directly).
 */

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
  // Word-level hyphenation off — Bulgarian legal text must not be split.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

/** Renders a payment notice PDF from its frozen snapshot. */
export async function renderPaymentNoticePdf(snapshot: NoticeSnapshot): Promise<Buffer> {
  registerFonts();
  // renderToBuffer types its argument as the inner <Document>'s props; a
  // wrapper component that RENDERS a Document is fine at runtime — cast.
  return renderToBuffer(createElement(PaymentNoticePdf, { snapshot }) as unknown as ReactElement<DocumentProps>);
}

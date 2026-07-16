import { browser } from "wxt/browser";

/**
 * Extension assets rendered into the auction page. Content-script assets resolve
 * relative to the TAB's origin unless converted with `browser.runtime.getURL`,
 * and must be declared in `web_accessible_resources` (see wxt.config.ts).
 */
export function logoUrl(): string {
  return browser.runtime.getURL("/logo.png");
}

/**
 * Register the Montserrat @font-face (the web app's font) at DOCUMENT level, once.
 * @font-face declared inside a shadow root is ignored by the browser, so the
 * face must live in the host document; the shadow-root panel then references the
 * family by name. Self-hosted woff2 (latin + cyrillic — the panel text is
 * Bulgarian) so it works regardless of the auction site's font-src CSP. The font
 * is served as a variable file, so one face per subset covers weights 400–700.
 */
let injected = false;
export function ensureFontsInjected(): void {
  if (injected) return;
  injected = true;

  const latin = browser.runtime.getURL("/fonts/montserrat-latin.woff2");
  const cyrillic = browser.runtime.getURL("/fonts/montserrat-cyrillic.woff2");

  const style = document.createElement("style");
  style.id = "sa-montserrat-face";
  style.textContent = `
@font-face{font-family:'SA Montserrat';font-style:normal;font-weight:400 700;font-display:swap;src:url("${latin}") format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'SA Montserrat';font-style:normal;font-weight:400 700;font-display:swap;src:url("${cyrillic}") format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116;}
`;
  (document.head ?? document.documentElement).appendChild(style);
}

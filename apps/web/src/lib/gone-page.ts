/**
 * The page a removed listing answers with: `proxy.ts` sends it with status 410 for a car archived long ago or
 * de-indexed (lib/sold-lot-gone.ts). Board `info-410`; parity check docs/design/parity/errors.md.
 *
 * It is a finished HTML document rather than a rendered route, because the proxy is the only place a real 410 can
 * come from (the car page streams a 200 shell), and Next documents two ways for a proxy to answer: a rewrite to a
 * route, or a response of its own. A rewrite with a status of its own isn't documented, and a 410 lost on the way
 * would be an SEO regression, so the proxy answers itself. A document costs no request or render and stays small for
 * the crawlers that make most of the car-page traffic.
 *
 * So it can't use the site's components, stylesheet or fonts (their file names are hashed per build): the look is the
 * kit's, written out here, under a top bar with the logo as app/global-error.tsx draws it, in the system's fonts. Keep
 * the colours and sizes in step with src/styles/tokens.css and kit.css, both themes: the visitor's saved light theme
 * applies here too (THEME_BOOTSTRAP), and the top bar stays night as the site's does. It names no car: a paid
 * delisting must not reveal the vehicle.
 */

import { THEME_BOOTSTRAP } from "@/lib/theme";

const SANS = `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const GUTTER = "clamp(16px, 4.5vw, 96px)";

// The icons' drawings, as in components/icons (Lucide at stroke 1.8, and the simplified flags).
const LUCIDE = `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
const ARROW_RIGHT = `<svg ${LUCIDE}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
const CALCULATOR = `<svg ${LUCIDE}><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>`;
const FLAG = `class="flag" viewBox="0 0 36 24" aria-hidden="true"`;
const FLAG_KR = `<svg ${FLAG}><rect width="36" height="24" rx="2" fill="#fff"/><g transform="translate(18 12)"><path d="M0-6a6 6 0 0 1 0 12z" fill="#cd2e3a"/><path d="M0 6a6 6 0 0 1 0-12z" fill="#0047a0"/><circle cx="0" cy="-3" r="3" fill="#cd2e3a"/><circle cx="0" cy="3" r="3" fill="#0047a0"/></g><g fill="#1f1f1f"><g transform="translate(7.2 5.6) rotate(33.7)"><rect x="-3.2" y="-2.4" width="6.4" height="1.1"/><rect x="-3.2" y="-0.55" width="6.4" height="1.1"/><rect x="-3.2" y="1.3" width="6.4" height="1.1"/></g><g transform="translate(28.8 18.4) rotate(33.7)"><rect x="-3.2" y="-2.4" width="2.7" height="1.1"/><rect x="0.5" y="-2.4" width="2.7" height="1.1"/><rect x="-3.2" y="-0.55" width="2.7" height="1.1"/><rect x="0.5" y="-0.55" width="2.7" height="1.1"/><rect x="-3.2" y="1.3" width="2.7" height="1.1"/><rect x="0.5" y="1.3" width="2.7" height="1.1"/></g><g transform="translate(28.8 5.6) rotate(-33.7)"><rect x="-3.2" y="-2.4" width="2.7" height="1.1"/><rect x="0.5" y="-2.4" width="2.7" height="1.1"/><rect x="-3.2" y="-0.55" width="6.4" height="1.1"/><rect x="-3.2" y="1.3" width="2.7" height="1.1"/><rect x="0.5" y="1.3" width="2.7" height="1.1"/></g><g transform="translate(7.2 18.4) rotate(-33.7)"><rect x="-3.2" y="-2.4" width="6.4" height="1.1"/><rect x="-3.2" y="-0.55" width="2.7" height="1.1"/><rect x="0.5" y="-0.55" width="2.7" height="1.1"/><rect x="-3.2" y="1.3" width="6.4" height="1.1"/></g></g></svg>`;
const US_STARS = [2.5, 5.5, 8.5, 11.5]
  .flatMap((y) => [2, 5, 8, 11, 13.5].map((x) => `<circle cx="${x}" cy="${y}" r="0.7"/>`))
  .join("");
const FLAG_US = `<svg ${FLAG}><rect width="36" height="24" fill="#b22234"/><g fill="#fff"><rect y="1.85" width="36" height="1.85"/><rect y="5.54" width="36" height="1.85"/><rect y="9.23" width="36" height="1.85"/><rect y="12.92" width="36" height="1.85"/><rect y="16.62" width="36" height="1.85"/><rect y="20.31" width="36" height="1.85"/></g><rect width="15" height="12.92" fill="#3c3b6e"/><g fill="#fff">${US_STARS}</g></svg>`;
const FLAG_CA = `<svg ${FLAG}><rect width="36" height="24" rx="2" fill="#fff"/><path d="M0 0h9v24H0zM27 0h9v24h-9z" fill="#d52b1e"/><path fill="#d52b1e" d="M18 5.2l.95 2.2c.16.36.45.32.74.16l1.15-.7-.55 2.85c-.12.6.2.6.4.36l1.5-1.7.4 1c.07.18.2.16.4.12l1.5-.32-.55 1.95c-.1.32-.13.45.1.62l.6.45-2.55 2.15c-.25.22-.18.3-.1.66l.2.86-2.4-.42c-.3-.05-.46.02-.47.27l.1 2.6h-.7l.1-2.6c0-.25-.16-.32-.46-.27l-2.4.42.2-.86c.08-.36.15-.44-.1-.66l-2.55-2.15.6-.45c.24-.17.2-.3.1-.62l-.55-1.95 1.5.32c.2.04.33.06.4-.12l.4-1 1.5 1.7c.2.24.52.24.4-.36l-.55-2.85 1.15.7c.3.16.58.2.74-.16z"/></svg>`;

// The logo's optimized variants for the 36 px bar, the ones the site's own top bar uses (components/common/logo.tsx).
const LOGO = (w: number) => `/_next/image?url=%2Flogo.png&amp;w=${w}&amp;q=75`;

const LEAD =
  "Автомобилът е продаден или обявата е премахната. Разгледайте наличните автомобили или започнете от някоя от основните страници.";

// The tokens the page uses, night and light (src/styles/tokens.css); the top bar is night in both.
const NIGHT = `--bg:#0c0d10;--s2:#1d2026;--s3:#262a31;--hair:rgba(255,255,255,.1);--field:#737a85;--tx:#f2f3f5;--tx2:#a9afb8;--or:#ff7a1a;--or-hi:#ff8e3c;--or-lo:#e8690f;--ortx:#ff9a52;--onfill:#0c0d10;--tint:#fff;color-scheme:dark`;
const LIGHT = `--bg:#f3f4f6;--s2:#ebedf0;--s3:#dfe2e7;--hair:rgba(12,13,16,.1);--field:#7b828d;--tx:#15171b;--tx2:#474d57;--or:#df5f07;--or-hi:#eb6a10;--or-lo:#d25804;--ortx:#a04400;--onfill:#0c0d10;--tint:#0c0d10;color-scheme:light`;

const CSS = `*,*::before,*::after{box-sizing:border-box}
:root,.bar{${NIGHT}}
:root[data-theme="light"]{${LIGHT}}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);font-family:${SANS};line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit}
:focus-visible{outline:2px solid var(--ortx);outline-offset:2px}
::selection{background:rgba(255,122,26,.35)}
.bar{flex:none;display:flex;align-items:center;height:56px;padding:0 ${GUTTER};background:var(--bg);border-bottom:1px solid var(--hair)}
.bar a{display:flex}
.bar img{display:block;height:36px;width:auto}
main{flex:1;width:min(100% - 2*${GUTTER},1920px);margin-inline:auto}
.gone{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:18px;min-height:520px;padding-block:clamp(64px,9vw,140px)}
.num{font:700 clamp(96px,14vw,220px)/.9 ${SANS};letter-spacing:-.04em;color:transparent;-webkit-text-stroke:2px var(--s3)}
h1{margin:0;font-size:clamp(30px,2.4vw + 12px,52px);line-height:1.08;font-weight:700;letter-spacing:-.02em;text-wrap:balance}
.lead{margin:0;max-width:62ch;font-size:clamp(17px,.35vw + 15px,20px);line-height:1.6;color:var(--tx2)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;max-width:100%;height:56px;margin-top:6px;padding:0 28px;background:var(--or);color:var(--onfill);font:800 16px/1 ${SANS};letter-spacing:.01em;white-space:nowrap;text-decoration:none;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
.btn:hover{background:var(--or-hi)}
.btn:active{background:var(--or-lo)}
.btn:focus-visible{outline:0;box-shadow:inset 0 0 0 2px var(--bg),inset 0 0 0 4px var(--tx)}
.btn svg{flex:none;width:20px;height:20px}
.links{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
.chip{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border:1px solid var(--field);border-radius:20px;font:700 14px/1 ${SANS};white-space:nowrap;text-decoration:none}
.chip:hover{background:var(--s2)}
.chip svg{flex:none;width:16px;height:16px}
.chip .flag{width:21px;height:14px;border-radius:2px;box-shadow:0 0 0 1px color-mix(in srgb,var(--tint) 12%,transparent)}
@media (max-width:639.98px){.btn{width:100%}.links .chip{flex:1 1 calc(50% - 10px);justify-content:center}}`;

export const GONE_PAGE_HTML = `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0c0d10">
<script>${THEME_BOOTSTRAP}</script>
<title>Обявата вече не е налична — SelectAuto</title>
<meta name="description" content="${LEAD}">
<link rel="icon" href="/favicon.ico" sizes="any">
<style>${CSS}</style>
</head>
<body>
<header class="bar"><a href="/"><img src="${LOGO(128)}" srcset="${LOGO(96)} 1x, ${LOGO(128)} 2x" alt="SelectAuto" width="59" height="36"></a></header>
<main>
<div class="gone">
<span class="num" aria-hidden="true">410</span>
<h1>Обявата вече не е налична</h1>
<p class="lead">${LEAD}</p>
<a class="btn" href="/vsichki-avtomobili">Вижте активни обяви${ARROW_RIGHT}</a>
<nav class="links" aria-label="Основни страници">
<a class="chip" href="/vnos-na-koli-ot-korea">${FLAG_KR}Внос от Корея</a>
<a class="chip" href="/vnos-na-koli-ot-sasht">${FLAG_US}Внос от САЩ</a>
<a class="chip" href="/vnos-na-koli-ot-kanada">${FLAG_CA}Внос от Канада</a>
<a class="chip" href="/kalkulator">${CALCULATOR}Калкулатор за внос</a>
<a class="chip" href="/kontakti">Контакти</a>
</nav>
</div>
</main>
</body>
</html>
`;

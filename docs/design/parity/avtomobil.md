# Car page · `/avtomobil/[id]`

- Boards: `cd-copart`, `cd-iaai`, `cd-buynow`, `cd-buynow-iaai`, `cd-canada`, `cd-korea`, `cd-korea-insp`,
  `cd-korea-full`, `cd-sold`, `cd-sold-noprice`, `cd-unsold`, `cd-sold-kr`, `cd-moto`, `cd-loading` (each d, t, p);
  flows `cd-f-gallery`, `cd-f-viewer`, `cd-f-media`, `cd-f-vin`, `cd-f-calc`, `cd-f-calc2`, `cd-f-carfax`,
  `cd-f-inquiry`, `cd-f-fav`, `cd-f-bar`, `cd-f-sticky`; fixed `cd-meta`, `cd-states`. The design run's notes:
  `D:/design/selectauto/notes/cd.md`.
- Code on main, read in full: `app/avtomobil/[id]/page.tsx`, `components/cars/car-detail/*` (16 files),
  `components/cars/{favorite-button,car-cards-carousel}.tsx`, `components/common/{expandable-section,copy-button,carousel-nav}.tsx`,
  `components/calculator/car-import-calculator.tsx`, `lib/car-detail-mapper.ts` (prices, media, flags, score).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, on live lots at 1440, 1920, 820 and 390:
  IAAI auction 154485275 (score, 360°, video, insurer logo, a 25 $ bid), IAAI 122905993 (unconfirmed odometer, score
  8), Copart auction 113034004 (no main price), Copart Buy Now 128827911, Canada 152896791, Encar 56270563 (insurance,
  options, history, seller note) and 66043 (inspection, theft), motorcycle 108934810, sold 150835313, sold without a
  price 151368267, archived Encar 150210054; the skeleton with JavaScript off. The October board lots have mostly sold,
  so the same variants were taken from today's listings (read-only SQL). Every request but GET was blocked;
  `/api/vin-check` was answered by a mock and never sent.

## What the code does today

Layout (page.tsx): breadcrumb; two columns from 1024 px (gallery + heading + specs + VIN check | status strip, price,
calculator, seller, location, contact — sticky); the Korean sections full width below; „Подобни автомобили".

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata: title with price and „внос от {държава}" for active cars; description; canonical; past cars noindex; OG image = first photo (page.tsx:52-106) | `cd-meta` | Formal address in the description's last sentence („Свържете се…", „…вижте активните обяви…"). Checked in the built HTML: title, description, `noindex, follow` on a sold car |
| 2 | JSON-LD: Vehicle/Product for indexable active cars; BreadcrumbList for all (page.tsx:158, 223-241) | — | Kept |
| 3 | Breadcrumb „Всички автомобили" / model hub (when it resolves) / title (page.tsx:247-261) | `nav.sa-crumbs` „Пътечка" | — The nav gets the kit's name „Пътечка" (decision 12, accessibility labels); the „/" separators are hidden from screen readers |
| 4 | Gallery: hover-zoom 2.4× on mouse, tap toggles zoom on touch (drag pans), arrows „Предишна снимка" / „Следваща снимка", counter „1 / 18", hints „Задръж за увеличение" / „Докосни за увеличение" by pointer type, thumbnails „Снимка N", eager first photo; no photo → „Снимка при поискване" (car-gallery.tsx) | the same in the kit, formal hints with a zoom icon, 92 px thumbnails (76 px on a phone), plus a full-screen viewer button „Отворете снимките на цял екран" (decision 22) | Owner decision 22: the viewer is built (keys, swipe, double-tap zoom, thumbnails from 640 px, focus back to the opener, the gallery follows the last photo). Its label and the phone tap were point 5, settled on 18.11.2026 as drawn (decision 34): a tap opens the viewer, where a double tap zooms and a drag pans; a mouse keeps the hover zoom and a click opens the viewer. The in-place tap zoom is gone: one tap can't do both. The hints keep today's choice by pointer type |
| 5 | 360° and engine video buttons open an in-page dialog with „Отвори в нов раздел" and ✕ „Затвори"; Esc closes (car-media-strip.tsx) | `cd-f-media` | Formal „Отворете в нов раздел", „Затворете". Checked: the dialog takes focus, Esc closes it, focus returns to its button |
| 6 | Identity: brand logo, source, „ПРОДАДЕН" or „BUY NOW", „Лот № …", h1 title (capitals via CSS), favourite (page.tsx:271-311) | plate, source, „ПРОДАДЕН" / „BUY NOW", „Лот №" + mono number, h1, heart | — The h1 keeps its CSS capitals (Latin titles, as the board does). A make that resolves always gets its plate (decision 8; two letters without a logo); none when the make doesn't resolve (design-run Q7, open; as on the card). The logo's alt stays „{марка} лого" |
| 7 | Highlight chips (Година, Пробег, Гориво, Състояние) (car-highlights.tsx) | `.sa-hl` | — |
| 8 | „Непотвърден километраж" and the usage flag as amber chips (page.tsx:315-330) | `cd-buynow-iaai`, `cd-korea` | — (warning tags with the triangle icon) |
| 9 | US tags (AUTOCHECK, CERT-D …) (car-tag-chips.tsx) | `.sa-utag` | — |
| 10 | IAAI score card: value / 50, band pill, meter, six-band legend „← тази оценка", footnote (car-iaa-score.tsx) | `cd-iaai` | Sentence case for the CSS capitals (decision 10). On a phone the longest band („Не подлежи на ремонт") wraps beside its marker, so the row gained a little padding and the marker stays whole |
| 11 | „Спецификации" sheet, copyable Лот № and VIN (car-spec-sheet.tsx) | `.sa-kv` + ids with „Копирайте Лот №" / „Копирайте VIN" | Formal address. Checked: the copy puts the number on the clipboard and shows „Копирано: …" |
| 12 | „История по VIN": „Провери историята" → POST /api/vin-check (writes the cache, paid API) → records or none, „Заяви пълен Carfax"; errors (car-vin-check.tsx) | `cd-f-vin`; formal; on Korean cars one more line: „За автомобили от Корея Carfax рядко има записи — вижте историята от Encar по-долу на страницата." | Formal address. Owner decision 15: the Korean line links to the first history section that renders (inspection, insurance or timeline) and shows only when one does — not on archived Encar lots. Checked with the POST mocked: „Проверявам…", records with „Заявете пълен Carfax", none, 429, offline |
| 13 | Status strip: countdown or status; past: „Статус" + result (page.tsx:360-369) | `.cd-status` | — (a past car's status carries the status dot, as on the card) |
| 14 | Price panel: primary price, „Текуща оферта · обновена …", other prices, „Средна продажна цена … продажби от архива" (car-price-panel.tsx) | `.cd-price` | — |
| 15 | „Калкулирай вноса" dialog seeded with the car; the current bid seeds the price (page.tsx:190-217, 376-387, components/calculator) | „Калкулирайте вноса до България" (tonal) · `cd-f-calc`, `cd-f-calc2` | Formal address. Owner decision 16: a current bid under 500 $ seeds as no bid (15 000 $); a Buy Now price always seeds. Checked: 25 $ and 300 $ bids open at 15 000, bids of 1000 $ and 2550 $ and a 6000 $ Buy Now seed as they are. The dialog's insides are the calculators step |
| 16 | Seller card with logo; location card or Google map (page.tsx:389-420, car-location-map.tsx) | `.cd-sl` + `.sa-map`: seller and location in one panel in the details column | As drawn; every field kept (the insurer logo on a light plate, its alt, the map's title „Локация — …", the place without coordinates). Since 18.11.2026 the map waits for „Заредете картата" with the contacts page's cookie notice (decision 33, C1): Google sets its cookies when the iframe loads, and it loaded on scroll |
| 17 | Contact panel: „Заинтересован от този автомобил?", phone, „Направете заявка" (inquiry prefilled with the car), „Заяви Carfax проверка" (US/CA only, prefilled and locked), „Viber група", „Цитирай лот №…" (car-contact-panel.tsx) | phone primary with its icon, „Направете заявка" secondary, „Заявете Carfax проверка" tonal with the shield, „Viber група"; „Заинтересовани ли сте…", „Свържете се…", „Цитирайте лот №…" | Owner decision 13 (the phone stays the main action); formal address. Checked: the inquiry opens pre-answered („Запитване за Subaru XV (2018) · Лот № …"), Carfax opens with VIN, make and model locked, Korean cars have no Carfax button |
| 18 | Past car: „Виж активни обяви" → the catalog filtered to the make and model (page.tsx:174-179, 422-429) | `cd-sold` | Formal „Вижте активни обяви", the orange primary as drawn (design-run Q10) |
| 19 | Korea: „Технически преглед", „История на щетите (застраховка)", „Фабрични пакети (N)", „История на автомобила (N)", „Описание от продавача" (expandable) | `cd-korea*`, beside the sticky buy box | As drawn. On a phone „Технически преглед", „Фабрични пакети" and „История на автомобила" fold behind their titles and counts (point 12, decided 18.11.2026 as drawn, decision 34; `fold-on-phone.tsx`); the text stays in the page, the VIN card's link to `#encar-history` unfolds its section, and from 640 px they are the panels they were. „История на щетите" stays open; the seller note stays collapsed, as today. Encar's `trunk_lead`, 21 frame parts, six mechanical checks and the leak, error and shortage values read in Bulgarian since 18.11.2026 (they showed in English, the problems with a green dot). Board fixed on 18.11.2026: the boards wrote the options groups „Екстериор/интериор" and „Комфорт/мултимедия"; the code writes „Екстериор/Интериор" and „Комфорт/Мултимедия" (lib/korea-labels.ts:26-28, not CSS capitals), so the local board sources were corrected (decision 10) |
| 20 | „Подобни автомобили" carousel, free mode, autoplay every 2 s, pause on hover only (related-cars.tsx) | a rail with a pause button „Спрете превъртането" | README rule for carousels: a pause button and a pause on focus (WCAG 2.2.2); added to `CarRail`, so the home rails get it too. Checked: the button toggles `aria-pressed` |
| 21 | Loading skeleton (page.tsx:486-543) | `cd-loading` | As drawn, per width (the details before the contact panel on a phone); still no IAA placeholder |
| 22 | Unknown or malformed id → not-found UI (HTTP 200, noindex) | the 404 board (another slice) | Fixed with the 404 step (see errors.md): HTTP 404, the page and noindex as before |
| 23 | — | phone action bar above the tabs: price or countdown, „Направете заявка" (secondary), the call as an orange icon button „Обадете се"; sold: „Продаден за" + „Вижте активни обяви", full width without a price · `cd-f-bar` | New on phones and tablets, as drawn: the same actions within reach. It hides while the contact panel (or a sold car's „Вижте активни обяви") is on screen and leaves the tab order then (README, bars); it follows the tabs to the screen's edge when they hide; the back-to-top button and the notifications move above it while it shows. With a day or more to the sale its countdown leaves out the seconds („5д 23ч 9м"): with them it spilled over its buttons at 390 px (check:layout, 18.11.2026) |
| 24 | Favourite: saved cars, signed out → `/sign-in?redirectTo=…` (favorite-button.tsx) | `cd-f-fav` | — (the car card's fixes apply here too). Checked: signed out it opens the sign-in with the way back |

## Layout as built (design-run notes §1)

Desktop: gallery left; on the right the identity (plate, source, mark, lot, h1, heart, chips, flags, tags) and a sticky
buy box (status, price, calculator, contact); the details (IAA score, specs, VIN check, seller + location in one panel,
the Korean sections) in the main column beside the sticky box; related cars full width. Tablet: one column, price and
contact side by side (a car without a price panel spreads the contact buttons in two columns). Phone: the gallery full
bleed, identity, status, price, calculator, the details, the contact panel, and the action bar. The reordering is CSS
only (`styles/car-page.css`, ported from the boards), so the reading order stays the desktop one. Strings: the design
run's audit (notes §2) lists every change; all are formal address or CSS capitals, plus the decimal comma in the
calculator (calculators step).

**18.11.2026, production review.** The gallery opens the viewer on a click or a tap, read from `click`: a tap that
only stops a flick-scroll gets no click, so it no longer opens the viewer by mistake. The focus comes back to
„Отворете снимките на цял екран" when it closes. In the viewer two fingers pinch between 1× and 4× (board `cd-f-viewer`
frame 5) and never change the photo; Tab stays inside it; its thumbnail row is centred only while it fits, so the
first thumbnails stay reachable when it overflows. With a mouse both thumbnail rows have main's thin scrollbar again.
A folded section also opens when the page loads at its anchor, and on a second press of the VIN card's link (no
`hashchange` then). The „Подобни автомобили" cards fill their slides: a card with short text or no photo came out
narrower.

**18.11.2026, the phone bar (row 23).** From 360 to 389 px, under the boards' 390, its price and countdown are a size
smaller: the countdown spilled over the buttons at 360 and 375 px („13д 23ч 59м", „23ч 59м 59с"). A status in place
of either (an active car with no price and no sale ahead, which the boards don't draw) is set like the page's status
strip, in the body face, and may take two lines: „Неизвестен" spilled from 360 to 414 px in the display face. Either
way the bar keeps its height, so the countdown that replaces the status after hydration doesn't move it. Below 360 px
the back-to-top button and the notifications sit above the two-row bar; they covered its top 14 px.

**18.11.2026, owner's report.** The selected thumbnail's orange ring was cut off at the top and bottom, and on the
first and last thumbnails at the sides: the strip scrolls, and a scroller clips what is drawn outside its items. The
strip has 4px of room now (padding, with an equal negative margin, so nothing moves), and a thumbnail half past the
strip's edge comes fully into view when it is clicked or reached by keyboard. Keyboard focus rings on the thumbnails
were cut the same way and are whole now too.

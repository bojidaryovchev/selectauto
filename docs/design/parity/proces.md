# Process · `/proces`

- Boards: `in-proces` (d, t, p: the scroll story as three scenes), `in-proces-flow` (phone flow: intro, steps 01–04,
  result), `in-proces-nogl` (d, t, p: without WebGL). The design run's notes: `D:/design/selectauto/notes/in.md` §1, §2,
  follow-up 1.
- Code on main, read in full: `app/proces/page.tsx`, `components/three/particle-process.tsx`,
  `components/process/process-steps.tsx`, `data/process.ts`, `app/layout.tsx` (Montserrat).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, at 1440 and 390 (SwiftShader): the dot
  title in Unbounded and the hint at the top; steps 01, 02 and 03 at 0, 30 and 40 % of the scroll, 05 with 100 % at
  70 %, the outro at 95 %; on a phone the dots under the top bar. With WebGL switched off (`--disable-webgl`) the static
  band showed at both widths, the written steps below it.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Metadata „Процес — от заявка до ключ \| SelectAuto", description, share card; BreadcrumbList JSON-LD (page.tsx:9-31) | `info-meta` | — |
| 2 | The 3D story: a 580vh section (500vh below 992 px) with a pinned canvas; scroll drives the intro dissolve, the car's formation, a hold and its dispersion; particle counts, camera and layout switch at 991 px; drawing pauses off screen and draws on demand without a GPU (particle-process.tsx) | the three scenes | Kept unchanged |
| 3 | Intro: the dot-matrix title „Пет стъпки. Един резултат." („Един" orange) drawn in Montserrat 900 on a canvas, a screen-reader H2 with the same words, the hint „Скролни надолу, за да започне процесът" (capitals through CSS) fading as you scroll (particle-process.tsx:390-472, 919-940) | the dot title, the hint as a pill with a chevron | The title is drawn in the kit's display face (Unbounded), shrunk to fit the narrower line; formal „Скролнете…"; sentence case |
| 4 | Stage: the watermark number, „Стъпка 0N / 05", the title, the text; the rail with five steps and numbers (desktop), five dots (below 992 px); „N% · от заявка до ключ" with a bar (capitals through CSS) (particle-process.tsx:942-1067) | the kit's type and colours: an outlined display numeral, an orange rule after the step number, the rail as a list with the current step marked | As drawn: the same pieces and states. The rail is an ordered list named „Стъпки" with `aria-current="step"`; sentence case |
| 5 | Outro: „Резултат", „Колата ви очаква.", „Не каталог. Не обещание…", „Започнете процеса →" → /kontakti, fading in as the car disperses (particle-process.tsx:1069-1091) | the eyebrow, the display title, the lead, the primary xl button with an arrow | The arrow glyph became an icon (decision 10) |
| 6 | When WebGL can't start, the renderer throws and the rest of the script stops: the section stays black with only the hint (REDESIGN.md, bugs) | `in-proces-nogl`: the title as text, the outro and a still of the formed car | Fixed: a failed renderer, a lost context or a failed geometry load shows the static band. The still is a frame of this scene |
| 7 | Written steps: „Процесът на внос", H1 „Пет стъпки, един резултат" (capitals through CSS), the lead, five steps from `PROCESS_STEPS` as H2s (process-steps.tsx) | `in-proces`: the heading block and five step cards | As drawn; sentence case |
| 8 | Montserrat loads on every page, only for the particle title (layout.tsx:37-45) | — | Removed with item 3 (README) |
| 9 | The page starts under the fixed header, the intro one screen tall | — | Kept |

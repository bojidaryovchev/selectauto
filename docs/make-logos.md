# Make logos

Every car make's logo on the site is a file in `apps/web/public/brand-logos`, listed by make id in
`apps/web/src/data/make-logos.ts`. This page says where each file comes from. Checked and built on 18 November 2026.

## Why the site has its own files

The logos used to come from AuctionsAPI's links in `manufacturers.image_url`. On 18 November 2026, of the 195 makes
with listings (active or sold), 111 had a link that loaded, 74 had a link that answered 404, and 10 had none:

- **All of AuctionsAPI's „brand-fill-20260918-…" images are gone** (57 links), and so are its 17 uploads with
  random names.
- **49 makes had no `manufacturers` row at all.** They are motorcycle makes (Harley-Davidson, Kawasaki, Yamaha,
  Polaris, Can-Am, Ducati, …; 10,170 active listings). The reference sync read only `/manufacturers/cars`; AuctionsAPI
  lists them under `/manufacturers/motorcycles` and `/manufacturers/all`. Without a row their listings had no make
  name in the filter, no hub and no plate. Since 19 November the sync reads `/manufacturers/all`; 47 of these makes
  have their logo in the set, and Baodiao and Zhilong have none anywhere (below).
- **Some links that load show the wrong logo:** Isuzu's is not Isuzu's, AM General's is American Motors'. Others are
  light grey on the plate (Mazda, Lexus, Infiniti, Jaguar) or outdated (Kia, Nissan, Volkswagen, Renault, Buick).
- **36 makes hold another brand's listings.** AuctionsAPI matches a listing's make by name, so „Saleen" holds Forest
  River Salem campers, „Lancia" Lance campers, „Monte Carlo" Monaco motorhomes, „TANK" Tank scooters (about 600
  listings in all, most of them sold). Each of these makes shows its own logo, like every make that has one (the
  owner's rule, 18.11.2026): the plate names the make the listing is filed under, and that filing is a data error of
  its own, which a logo neither causes nor fixes.

The rule since 18 November 2026: **every make shows its logo, unless no logo of it exists anywhere.**

## How each file was made

Each logo is the make's own mark, from the first of these that has a proper one: AuctionsAPI's image when it is right,
the brand's own website (the logo in its page header, or its press or download page), an archived copy of the brand's
site or of its brochures in the Wayback Machine for a defunct make, the brand's importer or owner group, Wikimedia
Commons, and only then a logo collection (seeklogo, carlogos, 1000logos). Then every file went through
`apps/web/scripts/make-logo.mjs` (Chrome, through Playwright):

- **SVGs are cleaned:** no scripts, event handlers, `foreignObject` or links to other sites.
- **White-only artwork is painted in the plate's ink** (`#15171b`), because the plate is light. Brand sites often
  serve their header logo in white for a dark header; a black logo on a light ground is the same mark.
- **Every file is trimmed to what it draws,** so all logos fill the plate alike; a logo taller than wide gets side
  margins up to a square (the plate's grid grows with a tall image).
- **A raster stays at most 256 px** on its long side (the largest plate is 88 px, 206 px at 3× density), as PNG or
  WebP, whichever is smaller. Many of AuctionsAPI's „SVGs" are a PNG inside an SVG; those are saved as rasters.

## How to add or change a logo

1. Take the make's mark in the order above (an SVG when there is one). Check it is that make and not another company
   of the same name: several logo collections file other businesses under „Nash", „Morris" or „Jensen".
2. From `apps/web`: `node scripts/make-logo.mjs <file> <slug>`, with `--recolor` for a white-only mark,
   `--black-matte --recolor` for white art on a black box, and `--crop first` or `--crop last` to keep one group of a
   lockup (an emblem beside a wordmark). It writes `public/brand-logos/<slug>.svg`, `.png` or `.webp`.
3. Look at it on the plate (`#eef0f2`) at 24, 40 and 88 px.
4. Add `id: "<file>"` to `MAKE_LOGOS` in `apps/web/src/data/make-logos.ts` (the id is `manufacturers.external_id`), take
   the make out of `MAKES_WITHOUT_LOGO` if it is there, and add its row below.
5. `pnpm --filter @selectauto/web test`: `tests/make-logos.test.mts` checks that every file is listed and inert, at most
   256 px and 40 KB, and not taller than wide.

A make AuctionsAPI adds later needs nothing: it shows AuctionsAPI's link until it gets a file, and its two letters if
that link fails.

## Not shown with a logo

Three makes show two letters, because no logo of theirs exists anywhere it was searched for (`MAKES_WITHOUT_LOGO` says
where): Carbodies, the old London taxi maker, and the Chinese scooter makers Baodiao and Zhilong.

Wikimedia limits a client without contact details in its User-Agent to 10 requests a minute (on 18 November it
answered 429 for the rest of the day), so a script that downloads from Commons names a contact. With one, on
19 November, Nash, Merkur and Autobianchi got their Commons files. The 8 makes still from a logo collection have no
proper mark on Commons: for Morris, Jensen, Austin-Healey, Cord and Excalibur it has only photos of badges (Excalibur's
is a hubcap), for Willys photos and the marks of its Willys-Knight and Overland lines, for Pierce-Arrow a small scan of
the 1906 wordmark, and for Hercules only other companies of that name.

Listings without a make show no plate at all, as before. On 18 November 42,987 of the 1,076,932 active listings had no
`manufacturer_id`: AuctionsAPI leaves it empty mostly for trucks, motorhomes, trailers and buses (titles starting with
Ford, Porter, Freightliner, Chevrolet, Ram, Forest River, Keystone, Bongo, GMC, Peterbilt, Kenworth…). Taking the make
from the title instead was decided against (REDESIGN.md point 13, decision 34): Encar titles often leave the make out.

## Sources

The marks belong to their owners; the site shows each one only to name the make of a car.

| Make | Id | File | Source | Where | Changes |
|---|---|---|---|---|---|
| Toyota | 140 | `toyota.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/toyota.svg | - |
| Ford | 48 | `ford.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/ford.svg | - |
| Chevrolet | 26 | `chevrolet.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/chevrolet.svg | - |
| Hyundai | 58 | `hyundai.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/hyundai.svg | - |
| Honda | 56 | `honda.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/honda.svg | - |
| Kia | 70 | `kia.svg` | the brand's own website | https://www.kia.com/us/en | recolored 3 paints |
| Nissan | 99 | `nissan.webp` | the site's earlier file | apps/web/public/brand-logos/nissan.png (the site's own file) | - |
| Jeep | 68 | `jeep.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/jeep.svg | - |
| BMW | 16 | `bmw.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/bmw.svg | - |
| Mercedes-Benz | 88 | `mercedes-benz.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/mercedes.svg | - |
| Dodge | 41 | `dodge.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/dodge.svg | - |
| Subaru | 132 | `subaru.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/subaru.svg | - |
| GMC | 52 | `gmc.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/gmc.svg | - |
| Volkswagen | 147 | `volkswagen.webp` | the site's earlier file | apps/web/public/brand-logos/volkswagen.png (the site's own file) | - |
| Mazda | 85 | `mazda.webp` | the site's earlier file | apps/web/public/brand-logos/mazda.png (the site's own file) | - |
| Lexus | 76 | `lexus.svg` | the brand's own website | https://www.lexus.com/content/dam/lexus/content-fragments/navigation/global-nav-v2/assets/lexus-logo.svg | - |
| Audi | 9 | `audi.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/audi.svg | - |
| RAM | 275 | `ram.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/ram.svg | - |
| Tesla | 187 | `tesla.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/tesla.svg | - |
| Chrysler | 27 | `chrysler.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/chrysler.svg | - |
| Buick | 19 | `buick.webp` | the brand's own website | https://www.buick.com/content/dam/buick/na/us/en/site-resources/favicon.svg | raster inside the SVG: saved as PNG |
| Genesis | 232 | `genesis.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/genesis.svg | - |
| Acura | 2 | `acura.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/acura.svg | - |
| Cadillac | 21 | `cadillac.svg` | Wikimedia Commons (Public domain) | https://commons.wikimedia.org/wiki/File:Cadillac_Logo_2021.svg | - |
| Infiniti | 60 | `infiniti.webp` | the brand's own website | https://www.infinitiusa.com/content/dam/Infiniti/US/navigation/v2/infiniti-logo.png | kept the first of 9 runs |
| Mitsubishi | 95 | `mitsubishi.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/mitsubishi.svg | - |
| Volvo | 148 | `volvo.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/volvo.svg | - |
| SsangYong | 131 | `ssangyong.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/SsangYong.svg | raster inside the SVG: saved as PNG |
| Lincoln | 77 | `lincoln.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/lincoln.svg | - |
| Land Rover | 74 | `land-rover.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/land-rover.svg | - |
| Renault Samsung | 123 | `renault-samsung.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/renault-samsung-motors.svg | raster inside the SVG: saved as PNG |
| Porsche | 110 | `porsche.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/porche.svg | - |
| MINI | 94 | `mini.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/mini.svg | - |
| Harley-Davidson | 500007 | `harley-davidson.svg` | the brand's own website | https://www.harley-davidson.com/ctfasset/5vy1mse9fkav/78rzR89t28gPHAepqNx7kS/19da21b034998035d965b9fbf3009739/shield-ico (from https://www.harley-davidson.com/us/en/index.html) | - |
| Kawasaki | 500076 | `kawasaki.svg` | the brand's own website | https://www.kawasaki.com/en-us/ | - |
| Scion | 125 | `scion.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Scion.svg | raster inside the SVG: saved as PNG |
| Pontiac | 109 | `pontiac.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Pontiac.svg | raster inside the SVG: saved as PNG |
| Jaguar | 67 | `jaguar.svg` | the brand's own website | https://www.jaguar.com/ | - |
| Yamaha | 500135 | `yamaha.webp` | the brand's own website | https://global.yamaha-motor.com/shared/img/rwd_identity.png | - |
| Mercury | 89 | `mercury.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Mercury.svg | raster inside the SVG: saved as PNG |
| Suzuki | 133 | `suzuki.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/suzuki.svg | - |
| Saturn | 124 | `saturn.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Saturn.svg | raster inside the SVG: saved as PNG |
| Fiat | 47 | `fiat.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/fiat.svg | - |
| Polaris | 500108 | `polaris.svg` | the brand's own website | https://cdn1.polaris.com/globalassets/crp/2024/nav-bar-logos/nav-bar-logo-polaris.svg?v=c0e00521 (from https://www.polaris.com/en-us/) | recolored 10 paints |
| Maserati | 83 | `maserati.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/maserati.svg | - |
| International | 262 | `international.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/international-trucks.svg | raster inside the SVG: saved as PNG |
| Alfa Romeo | 3 | `alfa-romeo.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/alfa-romeo.svg | - |
| Can-Am | 500033 | `can-am.svg` | the brand's own website | https://can-am.brp.com/off-road/us/en/ | - |
| Isuzu | 64 | `isuzu.webp` | the brand's own website | https://www.isuzu.co.jp/world/app-files/img/cmn_logo01.png | - |
| Hummer | 57 | `hummer.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Hummer.svg | raster inside the SVG: saved as PNG |
| Tata Daewoo | 500002 | `tata-daewoo.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Tata.svg | raster inside the SVG: saved as PNG |
| Polestar | 279 | `polestar.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Polestar.svg | raster inside the SVG: saved as PNG |
| Peugeot | 107 | `peugeot.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/peugeot.svg | - |
| Bentley | 13 | `bentley.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/bentley.svg | - |
| Oldsmobile | 101 | `oldsmobile.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Oldsmobile.svg | raster inside the SVG: saved as PNG |
| Ferrari | 46 | `ferrari.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/ferrari.svg | - |
| Ducati | 500049 | `ducati.webp` | the brand's own website | https://assets.prd.site.awsducati.com/dist/0.39.5/assets/img/ducati_id.png (from https://www.ducati.com/ww/en/home) | - |
| Smart | 128 | `smart.svg` | the brand's own website | https://global.smart.com/images/logo.svg (from https://www.smart.com/gb/en/) | - |
| Lamborghini | 72 | `lamborghini.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/lamborghini.svg | - |
| Saab | 121 | `saab.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Saab.svg | raster inside the SVG: saved as PNG |
| IC | 500000 | `ic.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/IC-Bus.svg | raster inside the SVG: saved as PNG |
| Rivian | 500001 | `rivian.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Rivian.svg | raster inside the SVG: saved as PNG |
| Triumph | 142 | `triumph.svg` | the brand's own website | https://www.triumphmotorcycles.co.uk/media-library/misc/misc-images/logo.svg?la=en-GB&hash=19A1C4BBCA4A93E6202DB71659F1C | recolored 9 paints |
| Rolls-Royce | 118 | `rolls-royce.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/rolls-royce.svg | - |
| KTM | 162 | `ktm.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/KTM.svg | raster inside the SVG: saved as PNG |
| BYD | 20 | `byd.svg` | Wikimedia Commons (Public domain) | https://commons.wikimedia.org/wiki/File:BYD_Auto_2022_logo.svg | - |
| Lucid | 245 | `lucid.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Lucid.svg | raster inside the SVG: saved as PNG |
| CFMoto | 500038 | `cfmoto.webp` | the brand's own website | https://www.cfmoto.com/content/dam/cfmoto/page-assets/home/cfmoto-logo-white.png | recolored 1936 px |
| Victory | 500127 | `victory.webp` | the brand's website, archived | https://web.archive.org/web/20170223165702id_/http://www.victorymotorcycles.media/wp-content/themes/victory-theme/images/victory-logo.png?1427369873 (from https://web.archive.org/web/20170114010950/http://www.victorymotorcycles.media/) | from Victory's archived press site |
| Aprilia | 500014 | `aprilia.webp` | the brand's own website | https://wlassets.aprilia.com/wlassets/aprilia/master/logo/ApriliaWhite/original/ApriliaWhite.png?1749045994690 (from https://www.aprilia.com/) | recolored 11264 px |
| Vespa | 500126 | `vespa.webp` | the brand's own website | https://wlassets.vespa.com/wlassets/vespa/master/logo/Logo-Vespa-80-328x78/original/header-loog-vespa-80-328x78-03.png?1 (from https://www.vespa.com/) | kept the last of 4 runs |
| Plymouth | 108 | `plymouth.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Plymouth.svg | raster inside the SVG: saved as PNG |
| Aston Martin | 8 | `aston-martin.svg` | the brand's own website | https://www.astonmartin.com/en | recolored 5 paints |
| Citroen | 28 | `citroen.svg` | Wikimedia Commons (Public domain) | https://commons.wikimedia.org/wiki/File:Citroen_2022.svg | - |
| McLaren | 86 | `mclaren.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/mc-laren.png | - |
| Scania | 500004 | `scania.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Scania.svg | raster inside the SVG: saved as PNG |
| Fisker | 196 | `fisker.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Fisker.svg | raster inside the SVG: saved as PNG |
| Geo | 51 | `geo.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Geo.svg | raster inside the SVG: saved as PNG |
| Daewoo | 33 | `daewoo.png` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/daewoo.png | - |
| Husqvarna | 500067 | `husqvarna.webp` | the brand's own website | https://www.husqvarna-motorcycles.com/content/dam/websites/husqvarna-motorcycles-com/language-masters/en/logo/Husqvarna_ | - |
| Piaggio | 165 | `piaggio.webp` | the brand's own website | https://wlassets.piaggio.com/wlassets/piaggio/master/logo/Piaggio/original/Piaggio.png?1592234529208 (from https://www.piaggio.com/) | - |
| Arctic Cat | 500016 | `arctic-cat.svg` | the brand's own website | https://www.arcticcat.com/hubfs/raw_assets/public/Arctic%20Cat%20Experience/images/brand/arctic-cat-horz-logo-white.svg | recolored 8 paints |
| Lotus | 78 | `lotus.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Lotus.svg | raster inside the SVG: saved as PNG |
| Puma | 114 | `puma.webp` | the brand's own website | https://pumaautomoveis.com.br/wp-content/uploads/2019/06/logo_puma_topo_03.png | the Puma badge only: the wordmark beside it is white |
| Datsun | 37 | `datsun.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Datsun.svg | raster inside the SVG: saved as PNG |
| MG | 91 | `mg.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/MG.svg | raster inside the SVG: saved as PNG |
| Saleen | 122 | `saleen.svg` | the brand's website, archived | https://web.archive.org/web/20261010092635id_/https://saleen.com/logos/saleen-horizontal-black.svg (from https://www.saleen.com/) | the emblem from the brand's horizontal lockup (archived copy) |
| Moto Guzzi | 500095 | `moto-guzzi.webp` | the brand's own website | https://wlassets.motoguzzi.com/wlassets/moto-guzzi/master/logo/MotoGuzziWhite/original/MotoGuzziWhite.png?1594714765564 (from https://www.motoguzzi.com/) | recolored 8705 px |
| Aro | 6 | `aro.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/ARO.svg | raster inside the SVG: saved as a raster |
| Lancia | 73 | `lancia.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Lancia.svg | raster inside the SVG: saved as a raster |
| Daihatsu | 35 | `daihatsu.png` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/daihatsu.png | - |
| Genuine Scooters | 500602 | `genuine-scooters.svg` | the brand's own website | https://www.genuinescooters.com/ | - |
| Indian | 500069 | `indian.svg` | the brand's own website | https://cdn1.polaris.com/globalassets/indian/2024/navigator/nav-bar-logo-indian-motorcycles.svg?v=c42b4742 (from https://www.indianmotorcycle.com/) | recolored 11 paints |
| Geely | 50 | `geely.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Geely.svg | raster inside the SVG: saved as PNG |
| Royal Enfield | 500110 | `royal-enfield.webp` | the brand's own website | https://www.royalenfield.com/content/dam/RE-Platform-Revamp/re-revamp-commons/logo.webp | - |
| DongFeng | 169 | `dongfeng.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Dongfeng.svg | cropped to the red emblem |
| SYM | 500119 | `sym.webp` | the brand's own website | https://www.sym-global.com/storage/system/logo/logo.svg | raster inside the SVG: saved as PNG |
| Eagle | 44 | `eagle.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Eagle.svg | raster inside the SVG: saved as a raster |
| Ineos | 500153 | `ineos.webp` | the brand's own website | https://ineosautomotive.stylelabs.cloud/api/public/content/f396b4855b4c4fceb955417840db0047?v=662496c8 (from https://ineosgrenadier.com/) | - |
| Workhorse | 500330 | `workhorse.webp` | the brand's own website | https://workhorse.com/wp-content/smush-webp/2026/07/cropped-android-chrome-512x512-1-300x300.png.webp | - |
| Venturi | 146 | `venturi.webp` | the brand's own website | https://www.venturi.com/wp-content/uploads/2020/03/Logo-VA.png (from https://www.venturi.com/en/) | - |
| AMC | 227 | `amc.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/american-motors.svg | raster inside the SVG: saved as PNG |
| Jeis Mobility | 500406 | `jeis-mobility.webp` | the brand's website, archived | https://web.archive.org/web/20250712015813id_/http://jeismobility.com/images/logo_on.png (from https://web.archive.org/web/20260807120259/http://jeismobility.com/) | archived copy |
| Kymco | 500077 | `kymco.webp` | the brand's own website | https://kymcousa.com/wp-content/uploads/2025/12/KYMCO_PNG-1024x177.png (from https://www.kymcousa.com/) | - |
| Jiajue | 500593 | `jiajue.webp` | the brand's own website | https://www.jiajue.com/wp-content/themes/jiajuemotuoche/images/logo.png | the emblem only: the wordmark is white |
| Buell | 500031 | `buell.webp` | the brand's own website | https://buellmotorcycle.com/ | - |
| Premier | 111 | `premier.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Premier.svg | raster inside the SVG: saved as a raster |
| Studebaker | 252 | `studebaker.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Studebaker.svg | raster inside the SVG: saved as PNG |
| TVR | 143 | `tvr.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/TVR.svg | raster inside the SVG: saved as a raster |
| Nash | 247 | `nash.svg` | Wikimedia Commons (Public domain) | https://commons.wikimedia.org/wiki/File:Nash_Motor_Company_logo_(text).svg | the red 1950s script |
| Maybach | 84 | `maybach.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Maybach.svg | raster inside the SVG: saved as PNG |
| Big Dog | 500023 | `big-dog.webp` | the brand's website, archived | https://web.archive.org/web/20070303211114id_/http://www.bigdogmotorcycles.com:80/logo_whitebg.gif (from https://web.archive.org/web/20070307173412/http://www.bigdogmotorcycles.com/) | - |
| Monte Carlo | 500288 | `monte-carlo.webp` | the brand's own website | https://www.mca.mc/wp-content/uploads/2021/06/MCA-logo-metal-753x1024.png (from https://mca.mc/) | Monte Carlo Automobile |
| Mahindra | 80 | `mahindra.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Mahindra.svg | raster inside the SVG: saved as PNG |
| VinFast | 500838 | `vinfast.webp` | the brand's own website | https://vinfastauto.eu/themes/custom/vinfast_v2/images/logo.webp (from https://vinfastauto.com/) | - |
| Benelli | 500019 | `benelli.webp` | the brand's own website | https://www.benelli.com/brand/horizontal-logo-white.svg | recolored 1 paints; rasterized (79 KB as SVG) |
| Bajaj | 240 | `bajaj.svg` | the brand's own website | https://bau-p-001.sitecorecontenthub.cloud/api/public/content/d7fea34821da4ee49ad2TopNavBlue (from https://www.bajajauto.com/) | the tagline removed |
| DR Automobiles | 500196 | `dr-automobiles.svg` | the brand's own website | https://drautomobiles.com/wp-content/uploads/2023/09/DR_LogoP.svg | - |
| Packard | 222 | `packard.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Packard.svg | raster inside the SVG: saved as PNG |
| IVECO | 65 | `iveco.svg` | the brand's own website | https://www.iveco.com/global/-/media/IVECOdotcom/Content/logo/iveco_logo_black.svg?iar=0&rev=e7f684dae84146e6aee8730faae | - |
| BAIC | 12 | `baic.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/BAIC.svg | raster inside the SVG: saved as PNG |
| AM General | 195 | `am-general.webp` | the brand's own website | https://www.amgeneral.com/wp-content/uploads/2023/06/AMG-logo.png | - |
| Forest River | 500758 | `forest-river.webp` | the brand's own website | https://forestriverinc.com/images/logo-reversed@2x.png | recolored 11201 px |
| Ural | 500121 | `ural.webp` | the brand's own website | https://images.squarespace-cdn.com/content/v1/58c1ef5abf629ab8bade3657/5b8f1620-ca92-4734-ac16-fb3f1a8c91b7/ural-logo-white.png?format=1500w (from https://www.imz-ural.com/) | recolored 28300 px |
| Hyosung | 500068 | `hyosung.webp` | the brand's distributor | https://hyosung.com.es/wp-content/uploads/2021/03/logo-hyosung.png | the motorcycles' mark, from the importer |
| Austin | 10 | `austin.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Austin.svg | raster inside the SVG: saved as PNG |
| SSC North America | 500325 | `ssc-north-america.svg` | the brand's own website | https://cdn.prod.website-files.com/60887e44c1270d12ce61020b/6089a85faa23b90bf13ba003_SSC%20NA%20(Minimal%201%20Inverse%20Mono).svg (from https://sscnorthamerica.com/) | the shield from the header lockup; white, painted in the plate's ink |
| Beta | 500020 | `beta.webp` | the brand's own website | https://www.betamotor.com/wp-content/uploads/2025/10/betamoto-logo-dark.png | - |
| Renault | 117 | `renault.svg` | the brand's own website | https://www.renault.co.uk/ | recolored 1 paints |
| Hudson | 229 | `hudson.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Hudson.svg | raster inside the SVG: saved as a raster |
| VPG | 500282 | `vpg.svg` | the brand's website, archived | https://web.archive.org/web/20130312085154id_/http://www.vpgautos.com/Files/VPG-personal.pdf (from https://web.archive.org/web/20121219000751/http://www.vpgautos.com/) | from VPG's own 2013 brochure; painted in the plate's ink |
| Wolf | 500759 | `wolf.webp` | the brand's own website | https://wolfbrandscooters.com/wp-content/uploads/2022/09/wolf-brand-scooters-logo.png | white art on a black box: black removed, art painted in the plate's ink |
| TANK | 500148 | `tank.svg` | the brand's own website | https://www.gwm-global.com/dist/images/home-page/tanktank.svg | white logo, painted in the plate's ink |
| Rainbow | 500233 | `rainbow.webp` | the brand's own website | https://rainbowtrailers.ca/wp-content/uploads/2024/06/logo-rainbow-trailers.png | Rainbow Trailers Inc. (Manitoba), the trailers this make holds |
| Merkur | 500287 | `merkur.webp` | Wikimedia Commons (Public domain) | https://commons.wikimedia.org/wiki/File:Merkur_ford_brand_logo.png | - |
| Lifan | 170 | `lifan.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Lifan.svg | raster inside the SVG: saved as PNG |
| Energica | 500052 | `energica.webp` | the brand's website, archived | https://web.archive.org/web/20260927205011id_/https://energicamotor.com/images/Logo/energica-logo@2x.png (from https://web.archive.org/web/20261024050723/https://energicamotor.com/) | - |
| Carver | 500035 | `carver.webp` | the brand's website, archived | https://web.archive.org/web/20071026193520id_/http://www.carver-worldwide.com/UplFiles/Carver%20one%20-%20price%20list%20apr%2007.pdf (from https://web.archive.org/web/20071228033739/http://www.carver-worldwide.com/Home/Index.asp?nc=1) | from the Carver One price list (archived) |
| Mitsuoka | 96 | `mitsuoka.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Mitsuoka.svg | raster inside the SVG: saved as PNG |
| Morgan | 97 | `morgan.svg` | the brand's own website | https://morgan-motor.com/wp-content/uploads/Group-2.svg (from https://www.morgan-motor.com/) | the site's white header logo, painted in the plate's ink |
| Big Bear Choppers | 500022 | `big-bear-choppers.webp` | the brand's website, archived | https://web.archive.org/web/20130117185700id_/http://bigbearchoppers.com/images/company_logo.png (from https://web.archive.org/web/20140210130623/http://www.bigbearchoppers.com/company.html) | - |
| ADLY | 500841 | `adly.webp` | the brand's own website | http://www.hercheemoto.com.tw/site/themes/default/en/images/logo.png | - |
| SEAT | 126 | `seat.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/seat.svg | - |
| DeSoto | 221 | `desoto.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Desoto.svg | raster inside the SVG: saved as PNG |
| Alpine | 5 | `alpine.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Alpine.svg | raster inside the SVG: saved as a raster |
| Willys | 220 | `willys.webp` | a logo collection | https://www.carlogos.org/car-logos/willys-overland-logo-1948.png (from https://www.carlogos.org/car-brands/willys-overland-logo.html) | the Willys-Overland W/O emblem |
| DeLorean | 38 | `delorean.webp` | the brand's own website | https://delorean.com/wp-content/uploads/2022/03/DMC-CLASSIC-LOGO-WHITE@2x.png | the white header logo, painted in the plate's ink |
| Super Soco | 500117 | `super-soco.svg` | the brand's distributor | https://web.archive.org/web/20221221162937id_/https://supersoco.co.uk/wp-content/uploads/2020/12/ss_logo.svg (from https://web.archive.org/web/20221231112721/https://supersoco.co.uk/) | white logo, painted in the plate's ink |
| Highland | 500063 | `highland.webp` | the brand's website, archived | https://web.archive.org/web/20051124010604id_/http://www.highland.se:80/images/wallpapers/logo.jpg (from https://web.archive.org/web/20060105061135/http://www.highland.se:80/) | from the brand's logo wallpaper (archived) |
| Bugatti | 18 | `bugatti.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/bugatti.svg | - |
| Opel | 102 | `opel.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/opel.svg | - |
| Rover | 120 | `rover.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Rover.svg | raster inside the SVG: saved as PNG |
| VAZ (Lada) | 154 | `vaz-lada.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Lada.svg | raster inside the SVG: saved as PNG |
| GasGas | 500055 | `gasgas.webp` | the brand's own website | https://www.gasgas.com/etc.clientlibs/ktm-common/clientlibs/gas/resources/gasgas-logo-nav.png | recolored 770639 px |
| Janus | 500071 | `janus.webp` | the brand's own website | https://b2563410.assetcdn.net/2.0/2563410/wp-content/uploads/2023/01/medallion-new.png?lossy=1&strip=0&webp=1 (from https://www.janusmotorcycles.com/) | - |
| Ryvid | 500111 | `ryvid.svg` | the brand's own website | https://ryvid.com/cdn/shop/files/Ryvid_logo-black.svg?v=1713643775&width=128 | - |
| Great Wall | 53 | `great-wall.webp` | the brand's own website | https://www.gwm-global.com/dist/images/home-page/cc_logo-20250120.png | GWM, the brand's current mark |
| Morris | 98 | `morris.webp` | a logo collection | https://images.seeklogo.com/logo-png/20/1/morris-logo-png_seeklogo-200003.png (from https://seeklogo.com/vector-logo/200003/morris) | white background removed |
| Jensen | 69 | `jensen.webp` | a logo collection | https://images.seeklogo.com/logo-png/45/1/jensen-motors-logo-png_seeklogo-451734.png (from https://seeklogo.com/vector-logo/451734/jensen-motors) | white background removed |
| Austin-Healey | 255 | `austin-healey.webp` | a logo collection | https://images.seeklogo.com/logo-png/17/1/austin-healey-logo-png_seeklogo-176512.png (from https://seeklogo.com/vector-logo/176512/austin-healey) | white background removed |
| ZIL | 157 | `zil.svg` | the brand's own website | https://static.tildacdn.com/tild3638-6432-4139-b337-313431653237/image_45340156_Trace.svg (from https://www.amo-zil.ru/) | - |
| Linhai | 500082 | `linhai.webp` | the brand's own website | https://cdnus.globalso.com/atv-linhai/e7e1f7051.png (from http://www.atv-linhai.com/) | - |
| Jonway | 500240 | `jonway.webp` | the brand's own website | https://www.jonway.com/images/logo.png | - |
| Cirelli | 500156 | `cirelli.webp` | the brand's own website | https://cirellimotorcompany.com/favicon.ico | the site's CMC shield |
| JAC | 66 | `jac.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/jac-motors.svg | raster inside the SVG: saved as PNG |
| DS | 213 | `ds.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/DS.svg | raster inside the SVG: saved as PNG |
| Rambler | 253 | `rambler.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Rambler.svg | raster inside the SVG: saved as PNG |
| BSA | 500030 | `bsa.webp` | the brand's own website | https://www.bsacompany.co.uk/wp-content/uploads/2021/10/bsa-red.png | - |
| TGB | 500120 | `tgb.svg` | the brand's own website | https://www.tgb.com.tw/images/logo.svg | - |
| AC | 1 | `ac.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/ac.svg | - |
| Ariel | 191 | `ariel.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Ariel.svg | raster inside the SVG: saved as a raster |
| Proton | 112 | `proton.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Proton.svg | raster inside the SVG: saved as a raster |
| Cord | 261 | `cord.webp` | a logo collection | https://www.supercars.net/blog/wp-content/uploads/2019/12/WILLIMENT-47.png (from https://www.supercars.net/blog/cord-logo/) | a printed copy of the 810/812 crest; white background removed |
| Excalibur | 231 | `excalibur.webp` | a logo collection | https://images.seeklogo.com/logo-png/34/1/excalibur-logo-png_seeklogo-341089.png (from https://seeklogo.com/vector-logo/341089/excalibur) | white background removed |
| Talaria | 500596 | `talaria.webp` | the brand's own website | https://www.talaria.cn/i/logo.png | - |
| QJMOTOR | 500600 | `qjmotor.webp` | the brand's own website | https://global.qjmotor.com/img/logo.png | - |
| Autobianchi | 11 | `autobianchi.svg` | Wikimedia Commons (Public domain) | https://commons.wikimedia.org/wiki/File:Autobianchi_company_logo.svg | the 1985 mark |
| ZX | 175 | `zx.webp` | the brand's website, archived | https://web.archive.org/web/20240116170942id_/https://en.zxauto.com.cn/img/clogo.png (from https://web.archive.org/web/20240116170940/https://en.zxauto.com.cn/) | the emblem only (ZX Auto) |
| Li Xiang | 500140 | `li-xiang.svg` | the brand's own website | https://p.ampmake.com/fed/tmp/egg-multipart-tmp/fed-server-api/2025/07/10/09/92d2ec5c-dbab-4ebc-9229-a3ca185cc967.svg (from https://www.liauto.com/) | Li Auto |
| M-Hero | 500247 | `m-hero.webp` | the brand's own website | https://www.dongfeng-global.com/images/home/tab3.png | the M emblem only; white, painted in the plate's ink |
| Maxus | 500472 | `maxus.svg` | the brand's own website | https://bluesky.sirv.com/Websites/Maxus/images/maxus-logo-black.svg (from https://www.saicmaxus.co.uk/) | the emblem from the lockup |
| Mega | 87 | `mega.webp` | the brand's website, archived | https://web.archive.org/web/20151224231622id_/http://www.mega-vehicles.com/images/logo.png?v=1.1 (from https://web.archive.org/web/20151226194638/http://www.mega-vehicles.com/) | archived copy |
| Cannondale | 500034 | `cannondale.svg` | the brand's own website | https://www.cannondale.com/Areas/Cannondale/Assets/css/img/logo/cannondale-logo-black.svg (from https://www.cannondale.com/en-us) | - |
| ATK | 500017 | `atk.webp` | the brand's website, archived | https://web.archive.org/web/20030920161723id_/http://www.atkusa.com:80/presskit/images/ATK%20Logo%20Large.JPG (from https://web.archive.org/web/20031013025642/http://www.atkusa.com:80/presskit/Logos.asp) | from ATK's 2003 press kit (archived) |
| Moto Morini | 500096 | `moto-morini.webp` | the brand's own website | https://motomorini.eu/wp-content/uploads/2024/04/01.-AQUILA_VETTORIALE_COLORI.png (from https://motomorini.eu/press-logo/) | from the brand's press logos |
| Hercules | 500061 | `hercules.webp` | a logo collection | http://www.mofa-museum.de/assets/images/Hercules_Logo_1966.jpg | the 1966 moped and motorcycle mark, a museum's scan of a period print; white background removed |
| Chery | 25 | `chery.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Chery.svg | raster inside the SVG: saved as PNG |
| Dacia | 31 | `dacia.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/dacia.svg | - |
| Holden | 55 | `holden.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Holden.svg | raster inside the SVG: saved as PNG |
| Skoda | 127 | `skoda.svg` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/skoda.svg | - |
| Vauxhall | 144 | `vauxhall.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Vauxhall.svg | raster inside the SVG: saved as PNG |
| Wanderer | 233 | `wanderer.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Wanderer.svg | raster inside the SVG: saved as PNG |
| Abarth | 254 | `abarth.webp` | AuctionsAPI's own image | https://auctionsapi.com/images/brands/Abarth.svg | raster inside the SVG: saved as PNG |
| Cupra | 283 | `cupra.svg` | the brand's own website | https://www.cupra.com/etc.clientlibs/cupra-website/components/clientlibs/resources/cupra-diagonal/icons/logo-cupra.svg (from https://www.cupraofficial.com/) | recolored 6 paints |
| Jaecoo | 500474 | `jaecoo.svg` | the brand's own website | https://jaecoo.co.uk/ | recolored 14 paints |
| Pierce-Arrow | 500485 | `pierce-arrow.webp` | a logo collection | https://images.seeklogo.com/logo-png/37/1/pierce-arrow-logo-png_seeklogo-372247.png (from https://seeklogo.com/vector-logo/372247/pierce-arrow) | white background removed |
| Leapmotor | 500146 | `leapmotor.svg` | the brand's own website | https://www.leapmotor.net/images/default-source/b10/logo-white.svg?sfvrsn=c8a44e07_39 | the emblem from the lockup, in black as on the brand's light pages |
| Omoda | 500475 | `omoda.svg` | the brand's own website | https://www.omoda.co.za/_next/static/immutable/media/omoda-logo.1ttq8b9-fq7g4.svg | - |
| Derbi | 500047 | `derbi.svg` | the brand's own website | https://www.piaggiogroup.com/sites/default/files/brand_logo/Derbi.svg (from https://piaggiogroup.com/en/business) | from the Piaggio Group's brands page |
| Husaberg | 500066 | `husaberg.svg` | the brand's website, archived | https://web.archive.org/web/20120917095946id_/http://www.husaberg.com/fileadmin/user_upload/HUformularEN-a1.pdf (from https://web.archive.org/web/20130118225107/http://www.husaberg.com/husaberg/dealership-opportunities.html) | the last mark, from the brand's 2012 dealer form (archived) |
| MZ | 500103 | `mz.webp` | the brand's website, archived | https://web.archive.org/web/20070810112437/http://www.mz1000s.de:80/cgi-bin/click.system?navid=15&sid=98433119 | the 1999-2013 shield from MZ's own logo download (archived, 210x282); white background removed |

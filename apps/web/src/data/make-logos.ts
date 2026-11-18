/**
 * Every car make's logo, by `manufacturers.external_id` (the `manufacturer_id` on a listing), as a file in
 * `public/brand-logos` (decision 8: makes always show their logo). Where each file comes from is in
 * `docs/make-logos.md`.
 *
 * The site serves its own files because AuctionsAPI's links (`manufacturers.image_url`) can't be relied on: on
 * 18.11.2026, 74 of the 185 links of makes with listings answered 404 (all of AuctionsAPI's „brand-fill“ images among
 * them), a few showed the wrong logo (Isuzu, AM General), and every plate loaded its logo from the vendor's server.
 * An id in neither map (a make added since) falls back to AuctionsAPI's link, and the plate falls back to the make's
 * two letters when that link fails.
 *
 * Ids from 500000 up that aren't in `manufacturers` yet are motorcycle makes: the reference sync reads only
 * AuctionsAPI's car makes (`/manufacturers/cars`), so their listings have no make row, no name and no plate until it
 * reads `/manufacturers/all`. Their logos are here for when it does.
 */
export const MAKE_LOGOS: Readonly<Record<number, string>> = {
  254: "abarth.webp", // Abarth
  1: "ac.svg", // AC
  2: "acura.svg", // Acura
  500841: "adly.webp", // ADLY (motorcycle make, not synced yet)
  3: "alfa-romeo.svg", // Alfa Romeo
  5: "alpine.webp", // Alpine
  195: "am-general.webp", // AM General
  227: "amc.webp", // AMC
  500014: "aprilia.webp", // Aprilia (motorcycle make, not synced yet)
  500016: "arctic-cat.svg", // Arctic Cat (motorcycle make, not synced yet)
  191: "ariel.webp", // Ariel
  6: "aro.webp", // Aro
  8: "aston-martin.svg", // Aston Martin
  500017: "atk.webp", // ATK (motorcycle make, not synced yet)
  9: "audi.svg", // Audi
  10: "austin.webp", // Austin
  255: "austin-healey.webp", // Austin-Healey
  11: "autobianchi.svg", // Autobianchi
  12: "baic.webp", // BAIC
  240: "bajaj.svg", // Bajaj
  500019: "benelli.webp", // Benelli (motorcycle make, not synced yet)
  13: "bentley.svg", // Bentley
  500020: "beta.webp", // Beta (motorcycle make, not synced yet)
  500022: "big-bear-choppers.webp", // Big Bear Choppers (motorcycle make, not synced yet)
  500023: "big-dog.webp", // Big Dog (motorcycle make, not synced yet)
  16: "bmw.svg", // BMW
  500030: "bsa.webp", // BSA (motorcycle make, not synced yet)
  500031: "buell.webp", // Buell (motorcycle make, not synced yet)
  18: "bugatti.svg", // Bugatti
  19: "buick.webp", // Buick
  20: "byd.svg", // BYD
  21: "cadillac.svg", // Cadillac
  500033: "can-am.svg", // Can-Am (motorcycle make, not synced yet)
  500034: "cannondale.svg", // Cannondale (motorcycle make, not synced yet)
  500035: "carver.webp", // Carver (motorcycle make, not synced yet)
  500038: "cfmoto.webp", // CFMoto (motorcycle make, not synced yet)
  25: "chery.webp", // Chery
  26: "chevrolet.svg", // Chevrolet
  27: "chrysler.svg", // Chrysler
  500156: "cirelli.webp", // Cirelli
  28: "citroen.svg", // Citroen
  261: "cord.webp", // Cord
  283: "cupra.svg", // Cupra
  31: "dacia.svg", // Dacia
  33: "daewoo.png", // Daewoo
  35: "daihatsu.png", // Daihatsu
  37: "datsun.webp", // Datsun
  38: "delorean.webp", // DeLorean
  500047: "derbi.svg", // Derbi (motorcycle make, not synced yet)
  221: "desoto.webp", // DeSoto
  41: "dodge.svg", // Dodge
  169: "dongfeng.webp", // DongFeng
  500196: "dr-automobiles.svg", // DR Automobiles
  213: "ds.webp", // DS
  500049: "ducati.webp", // Ducati (motorcycle make, not synced yet)
  44: "eagle.webp", // Eagle
  500052: "energica.webp", // Energica (motorcycle make, not synced yet)
  231: "excalibur.webp", // Excalibur
  46: "ferrari.svg", // Ferrari
  47: "fiat.svg", // Fiat
  196: "fisker.webp", // Fisker
  48: "ford.svg", // Ford
  500758: "forest-river.webp", // Forest River
  500055: "gasgas.webp", // GasGas (motorcycle make, not synced yet)
  50: "geely.webp", // Geely
  232: "genesis.svg", // Genesis
  500602: "genuine-scooters.svg", // Genuine Scooters (motorcycle make, not synced yet)
  51: "geo.webp", // Geo
  52: "gmc.svg", // GMC
  53: "great-wall.webp", // Great Wall
  500007: "harley-davidson.svg", // Harley-Davidson (motorcycle make, not synced yet)
  500061: "hercules.webp", // Hercules (motorcycle make, not synced yet)
  500063: "highland.webp", // Highland (motorcycle make, not synced yet)
  55: "holden.webp", // Holden
  56: "honda.svg", // Honda
  229: "hudson.webp", // Hudson
  57: "hummer.webp", // Hummer
  500066: "husaberg.svg", // Husaberg (motorcycle make, not synced yet)
  500067: "husqvarna.webp", // Husqvarna (motorcycle make, not synced yet)
  500068: "hyosung.webp", // Hyosung (motorcycle make, not synced yet)
  58: "hyundai.svg", // Hyundai
  500000: "ic.webp", // IC
  500069: "indian.svg", // Indian (motorcycle make, not synced yet)
  500153: "ineos.webp", // Ineos
  60: "infiniti.webp", // Infiniti
  262: "international.webp", // International
  64: "isuzu.webp", // Isuzu
  65: "iveco.svg", // IVECO
  66: "jac.webp", // JAC
  500474: "jaecoo.svg", // Jaecoo
  67: "jaguar.svg", // Jaguar
  500071: "janus.webp", // Janus (motorcycle make, not synced yet)
  68: "jeep.svg", // Jeep
  500406: "jeis-mobility.webp", // Jeis Mobility
  69: "jensen.webp", // Jensen
  500593: "jiajue.webp", // Jiajue (motorcycle make, not synced yet)
  500240: "jonway.webp", // Jonway
  500076: "kawasaki.svg", // Kawasaki (motorcycle make, not synced yet)
  70: "kia.svg", // Kia
  162: "ktm.webp", // KTM
  500077: "kymco.webp", // Kymco (motorcycle make, not synced yet)
  72: "lamborghini.svg", // Lamborghini
  73: "lancia.webp", // Lancia
  74: "land-rover.svg", // Land Rover
  500146: "leapmotor.svg", // Leapmotor
  76: "lexus.svg", // Lexus
  500140: "li-xiang.svg", // Li Xiang
  170: "lifan.webp", // Lifan
  77: "lincoln.svg", // Lincoln
  500082: "linhai.webp", // Linhai (motorcycle make, not synced yet)
  78: "lotus.webp", // Lotus
  245: "lucid.webp", // Lucid
  500247: "m-hero.webp", // M-Hero
  80: "mahindra.webp", // Mahindra
  83: "maserati.svg", // Maserati
  500472: "maxus.svg", // Maxus
  84: "maybach.webp", // Maybach
  85: "mazda.webp", // Mazda
  86: "mclaren.webp", // McLaren
  87: "mega.webp", // Mega
  88: "mercedes-benz.svg", // Mercedes-Benz
  89: "mercury.webp", // Mercury
  500287: "merkur.webp", // Merkur
  91: "mg.webp", // MG
  94: "mini.svg", // MINI
  95: "mitsubishi.svg", // Mitsubishi
  96: "mitsuoka.webp", // Mitsuoka
  500288: "monte-carlo.webp", // Monte Carlo
  97: "morgan.svg", // Morgan
  98: "morris.webp", // Morris
  500095: "moto-guzzi.webp", // Moto Guzzi (motorcycle make, not synced yet)
  500096: "moto-morini.webp", // Moto Morini (motorcycle make, not synced yet)
  500103: "mz.webp", // MZ (motorcycle make, not synced yet)
  247: "nash.svg", // Nash
  99: "nissan.webp", // Nissan
  101: "oldsmobile.webp", // Oldsmobile
  500475: "omoda.svg", // Omoda
  102: "opel.svg", // Opel
  222: "packard.webp", // Packard
  107: "peugeot.svg", // Peugeot
  165: "piaggio.webp", // Piaggio
  500485: "pierce-arrow.webp", // Pierce-Arrow
  108: "plymouth.webp", // Plymouth
  500108: "polaris.svg", // Polaris (motorcycle make, not synced yet)
  279: "polestar.webp", // Polestar
  109: "pontiac.webp", // Pontiac
  110: "porsche.svg", // Porsche
  111: "premier.webp", // Premier
  112: "proton.webp", // Proton
  114: "puma.webp", // Puma
  500600: "qjmotor.webp", // QJMOTOR (motorcycle make, not synced yet)
  500233: "rainbow.webp", // Rainbow
  275: "ram.svg", // RAM
  253: "rambler.webp", // Rambler
  117: "renault.svg", // Renault
  123: "renault-samsung.webp", // Renault Samsung
  500001: "rivian.webp", // Rivian
  118: "rolls-royce.svg", // Rolls-Royce
  120: "rover.webp", // Rover
  500110: "royal-enfield.webp", // Royal Enfield (motorcycle make, not synced yet)
  500111: "ryvid.svg", // Ryvid (motorcycle make, not synced yet)
  121: "saab.webp", // Saab
  122: "saleen.svg", // Saleen
  124: "saturn.webp", // Saturn
  500004: "scania.webp", // Scania
  125: "scion.webp", // Scion
  126: "seat.svg", // SEAT
  127: "skoda.svg", // Skoda
  128: "smart.svg", // Smart
  131: "ssangyong.webp", // SsangYong
  500325: "ssc-north-america.svg", // SSC North America
  252: "studebaker.webp", // Studebaker
  132: "subaru.svg", // Subaru
  500117: "super-soco.svg", // Super Soco (motorcycle make, not synced yet)
  133: "suzuki.svg", // Suzuki
  500119: "sym.webp", // SYM (motorcycle make, not synced yet)
  500596: "talaria.webp", // Talaria (motorcycle make, not synced yet)
  500148: "tank.svg", // TANK
  500002: "tata-daewoo.webp", // Tata Daewoo
  187: "tesla.svg", // Tesla
  500120: "tgb.svg", // TGB (motorcycle make, not synced yet)
  140: "toyota.svg", // Toyota
  142: "triumph.svg", // Triumph
  143: "tvr.webp", // TVR
  500121: "ural.webp", // Ural (motorcycle make, not synced yet)
  144: "vauxhall.webp", // Vauxhall
  154: "vaz-lada.webp", // VAZ (Lada)
  146: "venturi.webp", // Venturi
  500126: "vespa.webp", // Vespa (motorcycle make, not synced yet)
  500127: "victory.webp", // Victory (motorcycle make, not synced yet)
  500838: "vinfast.webp", // VinFast
  147: "volkswagen.webp", // Volkswagen
  148: "volvo.svg", // Volvo
  500282: "vpg.svg", // VPG
  233: "wanderer.webp", // Wanderer
  220: "willys.webp", // Willys
  500759: "wolf.webp", // Wolf (motorcycle make, not synced yet)
  500330: "workhorse.webp", // Workhorse
  500135: "yamaha.webp", // Yamaha (motorcycle make, not synced yet)
  157: "zil.svg", // ZIL
  175: "zx.webp", // ZX
};

/**
 * Makes that show their two letters because no logo of theirs could be found anywhere (searched on 18.11.2026;
 * each reason says where). Every other make has a file in MAKE_LOGOS.
 */
export const MAKES_WITHOUT_LOGO: Readonly<Record<number, string>> = {
  500605: "no logo found anywhere: every Baodiao domain is parked or for sale, and no directory shows a mark", // Baodiao
  23: "no logo found anywhere: Wikipedia, Commons, logo collections, LEVC's history page and the archived Carbodies and LTI sites have none", // Carbodies
  500797: "no logo found anywhere: the maker (Taizhou Zhilong Technology) has no website on record", // Zhilong
};

/**
 * Quiz data for the inquiry quiz (/zapitvane), copied verbatim from the original
 * theme.js (`brands`) plus the budget/time/finance option lists. Kept as data
 * (not inside the component) so the quiz stays presentational.
 */

/** Per-brand model lists. */
export const INQUIRY_BRANDS: Record<string, string[]> = {
  BMW: ["114", "116", "118", "120", "125", "128", "130", "135", "218", "220", "225", "230", "320", "325", "330", "335", "340", "420", "430", "520", "530", "540", "730", "740", "750", "i3", "i4", "i5", "i7", "i8", "iX", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4"],
  Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "TT", "R8"],
  Mercedes: ["A-Class", "B-Class", "C-Class", "CLA", "CLS", "E-Class", "S-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "V-Class"],
  Toyota: ["Yaris", "Corolla", "Camry", "C-HR", "RAV4", "Highlander", "Land Cruiser", "Hilux", "Prius"],
  Honda: ["Jazz", "Civic", "Accord", "CR-V", "HR-V", "Pilot"],
  Ford: ["Fiesta", "Focus", "Mondeo", "Kuga", "Edge", "Explorer", "Mustang", "Ranger"],
  Volkswagen: ["Polo", "Golf", "Passat", "Arteon", "Tiguan", "Touareg", "T-Roc", "Touran"],
  Nissan: ["Micra", "Note", "Juke", "Qashqai", "X-Trail", "Pathfinder", "Navara"],
  Mazda: ["2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60", "MX-5"],
  Hyundai: ["i10", "i20", "i30", "Kona", "Tucson", "Santa Fe", "Ioniq"],
  KIA: ["Picanto", "Rio", "Ceed", "Stonic", "Sportage", "Sorento", "EV6"],
  Lexus: ["CT", "IS", "ES", "GS", "NX", "RX", "UX", "LX"],
  Subaru: ["Impreza", "Legacy", "Forester", "Outback", "XV", "BRZ"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y"],
  Porsche: ["Cayenne", "Macan", "Panamera", "911", "Taycan"],
  Jeep: ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler"],
};

/** Each make's logo for its plate on the make step (boards `ac-inq-desk`, `ac-inq-quiz`): the site's own files in
 *  `public/brand-logos`, the same every plate shows. Written out rather than read from `data/make-logos.ts`, which
 *  would bring every make's entry into the dialog's client bundle; `tests/make-logos.test.mts` keeps the two equal. */
export const INQUIRY_BRAND_LOGOS: Record<string, string> = {
  BMW: "/brand-logos/bmw.svg",
  Audi: "/brand-logos/audi.svg",
  Mercedes: "/brand-logos/mercedes-benz.svg",
  Toyota: "/brand-logos/toyota.svg",
  Honda: "/brand-logos/honda.svg",
  Ford: "/brand-logos/ford.svg",
  Volkswagen: "/brand-logos/volkswagen.webp",
  Nissan: "/brand-logos/nissan.webp",
  Mazda: "/brand-logos/mazda.webp",
  Hyundai: "/brand-logos/hyundai.svg",
  KIA: "/brand-logos/kia.svg",
  Lexus: "/brand-logos/lexus.svg",
  Subaru: "/brand-logos/subaru.svg",
  Tesla: "/brand-logos/tesla.svg",
  Porsche: "/brand-logos/porsche.svg",
  Jeep: "/brand-logos/jeep.svg",
};

export const INQUIRY_BUDGETS = ["15-25 хил. $.", "25-35 хил. $.", "35-50 хил. $.", "Над 50 хил. $."];
export const INQUIRY_TIMES = ["Възможно най-скоро", "До месец", "След няколко месеца"];
export const INQUIRY_FINANCE = ["Собствени средства", "Лизинг / Кредит", "Не съм сигурен"];

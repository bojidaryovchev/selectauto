import { ScaleIcon, ShieldIcon, TargetIcon } from "@/components/icons";
import type { CarView } from "@/types/car.type";
import type { ComponentType } from "react";

/**
 * Static homepage content captured from the live site. The car arrays are a
 * point-in-time snapshot used as a **fallback**: `@/queries/cars` returns live
 * listings from the database and falls back to these when the DB is empty or
 * unreachable, so the homepage always renders. The `PILLARS`/`HERO_MODELS`
 * content below is purely static copy.
 */

export const FALLBACK_BUY_NOW_CARS: CarView[] = [
  {
    title: "2022 Hyundai Palisade",
    href: "/vsichki-avtomobili",
    price: "16 743 $",
    mileage: "97 626 км",
    source: "ENCAR",
    image: "/cars/sale-884816-af9b69d93d5149.webp",
    badge: { kind: "buy" },
  },
  {
    title: "2021 Hyundai Palisade",
    href: "/vsichki-avtomobili",
    price: "14 863 $",
    mileage: "61 912 км",
    source: "ENCAR",
    image: "/cars/sale-884815-31f159aedad8f0.webp",
    badge: { kind: "buy" },
  },
  {
    title: "2022 Kia Sorento",
    href: "/vsichki-avtomobili",
    price: "12 924 $",
    mileage: "87 765 км",
    source: "ENCAR",
    image: "/cars/sale-884814-5a43164909931e.webp",
    badge: { kind: "buy" },
  },
  {
    title: "2019 BMW 5 Series",
    href: "/vsichki-avtomobili",
    price: "17 031 $",
    mileage: "74 565 км",
    source: "ENCAR",
    image: "/cars/sale-884813-54e988b3fdc9b0.webp",
    badge: { kind: "buy" },
  },
  {
    title: "2021 Hyundai",
    href: "/vsichki-avtomobili",
    price: "9 928 $",
    mileage: "80 044 км",
    source: "ENCAR",
    image: "/cars/sale-884812-d7aae1495ad77e.webp",
    badge: { kind: "buy" },
  },
  {
    title: "2020 Hyundai",
    href: "/vsichki-avtomobili",
    price: "9 928 $",
    mileage: "152 427 км",
    source: "ENCAR",
    image: "/cars/sale-884811-4a28b5ba3b5133.webp",
    badge: { kind: "buy" },
  },
];

export const FALLBACK_AUCTION_CARS: CarView[] = [
  {
    title: "2026 BMW X6 M Competition",
    href: "/vsichki-avtomobili",
    mileage: "5 322 км",
    source: "IAAI",
    image: "/cars/car-884817-074947fd19251b.jpg",
    badge: { kind: "time", label: "30.06.2026 · 11:30" },
  },
  {
    title: "2022 Hyundai Tucson",
    href: "/vsichki-avtomobili",
    price: "15 000 $",
    mileage: "63 998 км",
    source: "IAAI",
    image: "/cars/car-884807-50aa6ef2c40253.jpg",
    badge: { kind: "time", label: "25.06.2026 · 20:00" },
  },
  {
    title: "2019 Lamborghini Urus",
    href: "/vsichki-avtomobili",
    price: "104 000 $",
    mileage: "33 302 км",
    source: "IAAI",
    image: "/cars/car-884806-0beb5ea4467d78.jpg",
    badge: { kind: "time", label: "23.06.2026 · 17:00" },
  },
  {
    title: "2016 Chevrolet Corvette",
    href: "/vsichki-avtomobili",
    price: "25 000 $",
    mileage: "37 022 км",
    source: "IAAI",
    image: "/cars/car-884804-e1f28dd9ec9258.jpg",
    badge: { kind: "time", label: "24.06.2026 · 04:00" },
  },
  {
    title: "2020 Hyundai Elantra SE",
    href: "/vsichki-avtomobili",
    mileage: "135 265 км",
    source: "IAAI",
    image: null,
    badge: { kind: "time", label: "22.06.2026 · 14:30" },
  },
  {
    title: "2013 Ram 1500 Laramie Longhorn",
    href: "/vsichki-avtomobili",
    mileage: "343 936 км",
    source: "IAAI",
    image: null,
    badge: { kind: "time", label: "Предстои" },
  },
];

/** 18 popular brands, by their `manufacturers.external_id`; each one's logo is in `data/make-logos.ts`. */
export const BRANDS: { name: string; id: number }[] = [
  { name: "Mercedes-Benz", id: 88 },
  { name: "BMW", id: 16 },
  { name: "Audi", id: 9 },
  { name: "Toyota", id: 140 },
  { name: "Honda", id: 56 },
  { name: "Volkswagen", id: 147 },
  { name: "Jeep", id: 68 },
  { name: "Ford", id: 48 },
  { name: "Tesla", id: 187 },
  { name: "Porsche", id: 110 },
  { name: "Mazda", id: 85 },
  { name: "Volvo", id: 148 },
  { name: "Hyundai", id: 58 },
  { name: "Kia", id: 70 },
  { name: "Lexus", id: 76 },
  { name: "Subaru", id: 132 },
  { name: "Nissan", id: 99 },
  { name: "Maserati", id: 83 },
];

/** Three pillars in the "Why SelectAuto" section. Text verbatim from the site. */
export const PILLARS: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}[] = [
  {
    icon: TargetIcon,
    title: "Подбор с мисъл",
    text: "Всяка добра покупка започва с добра селекция. Ние търсим правилните предложения, а не просто много предложения.",
  },
  {
    icon: ScaleIcon,
    title: "Стратегия и преценка",
    text: "При аукционите, цените и наличностите няма място за хаос. Нужна е ясна логика, опит и правилен тайминг.",
  },
  {
    icon: ShieldIcon,
    title: "Контрол над процеса",
    text: "От заявката до ключа, процесът е структуриран така, че клиентът да има спокойствие и яснота на всяка стъпка.",
  },
];

/** Hero 3D models, mirroring the CARS array in the particle-hero plugin. */
export const HERO_MODELS: { name: string; meta: string; src: string }[] = [
  { name: "COUPE", meta: "Спортно купе с дълга база", src: "/models/coupe.glb" },
  { name: "SEDAN", meta: "Компактен и елегантен", src: "/models/sedan.glb" },
  { name: "SUV", meta: "SUV с мощно присъствие", src: "/models/suv.glb" },
];

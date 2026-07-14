/**
 * The 5-step import process, as plain data. Mirrors the `STEPS` array inside the
 * WebGL `particle-process.tsx` (kept as a separate copy on purpose: that file is
 * a large client component and we don't want the server `/proces` content to
 * depend on importing a `"use client"` module). If you edit the wording in one
 * place, update the other. The server-rendered `<ProcessSteps>` block uses this
 * so the process content is crawlable (the canvas version is animated/JS-gated).
 */
export type ProcessStep = { num: string; title: string; desc: string };

export const PROCESS_STEPS: ProcessStep[] = [
  {
    num: "01",
    title: "Подбор",
    desc: "Слушаме нуждите. Анализираме бюджета и целта. Предлагаме точните възможности.",
  },
  {
    num: "02",
    title: "Търг",
    desc: "Участваме директно — на корейски, японски и германски аукциони. Стратегия, не късмет.",
  },
  {
    num: "03",
    title: "Оформяне",
    desc: "Прозрачно плащане през регулирани канали. Изрядна документация без скрити такси.",
  },
  {
    num: "04",
    title: "Логистика",
    desc: "Транспорт, митница, регистрация — поемаме всичко. Колата ви пътува, вие следите.",
  },
  {
    num: "05",
    title: "Ключът",
    desc: "Колата ви очаква. Подготвена, прегледана, изрядна. Готова за път от деня на предаването.",
  },
];

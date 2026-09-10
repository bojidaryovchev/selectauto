/**
 * Admin display title for a car whose upstream title may ALREADY start with its
 * year. AuctionsAPI titles usually do ("2019 Honda Fit Lx"), so prefixing the
 * year blindly printed "2019 2019 Honda Fit Lx". The catalog card solves the same
 * thing in lib/car-mapper.ts (`listingTitle`); this is its admin twin, kept free
 * of server-only imports so the client components can use it.
 */
export function carTitle(year: number | null, title: string | null, carId: number): string {
  const t = title?.trim() ?? "";
  if (t && year && !/^\d{4}\b/.test(t)) return `${year} ${t}`;
  return t || `Кола ${carId}`;
}

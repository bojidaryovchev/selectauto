import { CatalogSkeleton } from "@/components/cars/all-cars";
import { SiteFooter, SiteHeader } from "@/components/layout";

/** Streamed loading shell for /vsichki-avtomobili while the first page renders (board `ct-loading`). */
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-(--header-h)">
        <CatalogSkeleton />
      </main>
      <SiteFooter />
    </>
  );
}

import { Container } from "@/components/common";
import { CarGridSkeleton } from "@/components/cars/all-cars";
import { SiteFooter, SiteHeader } from "@/components/layout";

/** Streamed loading shell for /vsichki-avtomobili while the first page renders. */
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-[#fafafa] text-ink">
        <Container>
          <div className="py-10 max-md:py-7">
            <div className="mb-6 h-10 w-72 animate-pulse rounded bg-[#e9e9ea]" />
            <div className="h-[260px] animate-pulse rounded-2xl border border-[#e8e8e8] bg-white" />
            <div className="mb-4 mt-6 h-4 w-44 animate-pulse rounded bg-[#e9e9ea]" />
            <CarGridSkeleton count={12} />
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

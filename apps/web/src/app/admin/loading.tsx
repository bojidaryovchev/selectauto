import { AdminPageSkeleton } from "@/components/admin/shell";

/**
 * Shown the moment a link to another admin page is tapped. Without it the
 * navigation waits for the next page's server render (its queries) with the old
 * page still on screen — 0.2–0.8 s with no sign the tap registered. The fallback
 * is prefetched with the link, so it appears at once.
 */
export default function AdminLoading() {
  return <AdminPageSkeleton />;
}

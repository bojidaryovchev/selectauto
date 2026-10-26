import { auth } from "@/auth";
import { APP_ROLE_META, APP_ROLES } from "@/constants/admin";
import { adminHomeHref, adminNavGroups } from "@/constants/admin-nav";
import { can, isAdmin } from "@/lib/admin";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopBar } from "./admin-top-bar";

/**
 * The role-dependent half of the shell. Reads the session — request-time data,
 * so the layout renders this inside a <Suspense> with AdminShellSkeleton as the
 * fallback — picks the sections this user may see, and renders the desktop
 * sidebar and the phone/tablet top bar from the same list.
 */
export async function AdminChrome() {
  const session = await auth();
  // No back-office access: the layout's AdminGate is redirecting this request.
  if (!can(session, "backoffice.enter")) return null;

  const admin = isAdmin(session);
  const groups = adminNavGroups({ isAdmin: admin, canPublishMobilebg: can(session, "mobilebg.publish") });
  const homeHref = adminHomeHref(admin);
  const user = session?.user;
  const roles = user?.roles ?? [];
  const account = {
    name: user?.name?.trim() || user?.email || "",
    role: APP_ROLES.filter((role) => roles.includes(role))
      .map((role) => APP_ROLE_META[role].label)
      .join(", "),
  };

  return (
    <>
      <AdminSidebar groups={groups} homeHref={homeHref} account={account} />
      <AdminTopBar groups={groups} homeHref={homeHref} account={account} />
    </>
  );
}

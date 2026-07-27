import { asc } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  roles: string[];
  emailVerified: Date | null;
  createdAt: Date;
};

/**
 * All accounts for /admin/potrebiteli, oldest first — the screen where an admin
 * grants the „Наблюдаващ" role (owner spec: any number of such profiles). Small
 * table, admin-only, not cached. Admin-gated defensively.
 */
export async function listUsers(): Promise<UserRow[]> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const u = schema.users;
  return getDb()
    .select({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    })
    .from(u)
    .orderBy(asc(u.createdAt));
}

import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { MAIL_PAGE_SIZE, isMailThreadStatus } from "@/constants/mail";

/**
 * Inbox list: one page of threads, newest activity first.
 *
 * Not `"use cache"` — like the other admin reads, this is a per-admin view of
 * mutable state where a stale page is actively harmful (a thread that looks
 * unanswered but isn't, or vice versa).
 */

export type MailThreadRow = {
  id: number;
  subject: string | null;
  participantEmail: string;
  participantName: string | null;
  status: string;
  unread: boolean;
  lastDirection: string;
  lastMessageAt: Date;
  messageCount: number;
};

export type ListThreadsResult = {
  threads: MailThreadRow[];
  total: number;
  page: number;
  pageCount: number;
};

export async function listMailThreads(options: {
  page?: number;
  status?: string;
  q?: string;
  unreadOnly?: boolean;
}): Promise<ListThreadsResult> {
  if (!(await getAdminSession())) throw new Error("FORBIDDEN");

  const db = getDb();
  const page = Math.max(1, options.page ?? 1);

  const conds: SQL[] = [];
  if (options.status && isMailThreadStatus(options.status)) {
    conds.push(eq(schema.emailThreads.status, options.status));
  }
  if (options.unreadOnly) {
    conds.push(eq(schema.emailThreads.unread, true));
  }
  if (options.q?.trim()) {
    const needle = `%${options.q.trim()}%`;
    const search = or(
      ilike(schema.emailThreads.participantEmail, needle),
      ilike(schema.emailThreads.subject, needle),
      ilike(schema.emailThreads.participantName, needle),
    );
    if (search) conds.push(search);
  }
  const where = conds.length ? and(...conds) : undefined;

  const [totalRow] = await db.select({ n: count() }).from(schema.emailThreads).where(where);
  const total = totalRow?.n ?? 0;

  const rows = await db
    .select({
      id: schema.emailThreads.id,
      subject: schema.emailThreads.subject,
      participantEmail: schema.emailThreads.participantEmail,
      participantName: schema.emailThreads.participantName,
      status: schema.emailThreads.status,
      unread: schema.emailThreads.unread,
      lastDirection: schema.emailThreads.lastDirection,
      lastMessageAt: schema.emailThreads.lastMessageAt,
      messageCount: db.$count(
        schema.emailMessages,
        eq(schema.emailMessages.threadId, schema.emailThreads.id),
      ),
    })
    .from(schema.emailThreads)
    .where(where)
    .orderBy(desc(schema.emailThreads.lastMessageAt))
    .limit(MAIL_PAGE_SIZE)
    .offset((page - 1) * MAIL_PAGE_SIZE);

  return {
    threads: rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / MAIL_PAGE_SIZE)),
  };
}

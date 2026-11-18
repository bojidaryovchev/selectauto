/**
 * The privacy policy's retention promise (§5, owner decision 33): „Запитванията, заявките за Carfax, офертите от
 * калкулатора и кореспонденцията по тях пазим до 12 месеца след последния контакт, ако не сключим договор."
 * The monthly cron (`/api/cron/purge-old-leads`) runs this SQL; the test runs the very same text.
 *
 * Who is due, per lead row:
 * - Last contact is the PERSON's, not the row's: the newest of their leads in any of the three tables (matched by
 *   phone, the last nine digits, and by e-mail) and of their e-mail threads, each by its newest activity
 *   (`updated_at` moves when the admin works the lead; a thread by its last message).
 * - Older than the retention period, and the person never signed: no client with a contract or a deposit contract
 *   has their phone or e-mail (today's client row or any contract's frozen snapshot). A lead marked „won" is kept.
 * E-mail threads go with them: a thread is deleted only when its participant is such a person and it has been quiet
 * for the period too. Other mail (partners, carriers, the accountant) is not this promise and stays. Deleting a
 * thread removes its messages and attachment records (ON DELETE CASCADE); attachments live at Resend, not in S3.
 *
 * One statement: the deletes are data-modifying CTEs, so they apply together or not at all.
 */

/** The policy's period. */
export const RETENTION_MONTHS = 12;

/** The CTEs that select what is due. `months` is inlined, so it must be a plain positive integer. */
function dueCtes(months: number): string {
  if (!Number.isInteger(months) || months <= 0) throw new Error(`retention months must be a positive integer: ${months}`);
  const cutoff = `now() - make_interval(months => ${months})`;
  const phone9 = (col: string) => `right(regexp_replace(coalesce(${col}, ''), '\\D', '', 'g'), 9)`;
  const email = (col: string) => `nullif(lower(btrim(${col})), '')`;
  return `
WITH signed AS (
  SELECT ${phone9("c.phone")} AS phone9, ${email("c.email")} AS email
    FROM clients c
   WHERE EXISTS (SELECT 1 FROM contracts k WHERE k.client_id = c.id)
      OR EXISTS (SELECT 1 FROM deposit_contracts d WHERE d.client_id = c.id)
  UNION
  SELECT ${phone9("k.client_snapshot->>'phone'")}, ${email("k.client_snapshot->>'email'")} FROM contracts k
  UNION
  SELECT ${phone9("d.client_snapshot->>'phone'")}, ${email("d.client_snapshot->>'email'")} FROM deposit_contracts d
),
leads AS (
  SELECT 'inquiry'::text AS kind, id, ${phone9("phone")} AS phone9, NULL::text AS email, status,
         greatest(created_at, updated_at) AS touched FROM inquiries
  UNION ALL
  SELECT 'carfax', id, ${phone9("phone")}, ${email("email")}, status, greatest(created_at, updated_at) FROM carfax_requests
  UNION ALL
  SELECT 'offer', id, ${phone9("phone")}, ${email("email")}, status, greatest(created_at, updated_at) FROM calculator_offers
),
person AS (
  SELECT l.kind, l.id, l.phone9, l.email, l.status,
         greatest(
           l.touched,
           (SELECT max(o.touched) FROM leads o WHERE length(l.phone9) = 9 AND o.phone9 = l.phone9),
           (SELECT max(o.touched) FROM leads o WHERE l.email IS NOT NULL AND o.email = l.email),
           (SELECT max(t.last_message_at) FROM email_threads t WHERE l.email IS NOT NULL AND lower(t.participant_email) = l.email)
         ) AS last_contact
    FROM leads l
),
due AS (
  SELECT p.* FROM person p
   WHERE p.last_contact < ${cutoff}
     AND p.status IS DISTINCT FROM 'won'
     AND NOT EXISTS (
       SELECT 1 FROM signed s
        WHERE (length(p.phone9) = 9 AND s.phone9 = p.phone9) OR (p.email IS NOT NULL AND s.email = p.email)
     )
),
due_threads AS (
  SELECT t.id FROM email_threads t
   WHERE t.last_message_at < ${cutoff}
     AND lower(t.participant_email) IN (SELECT email FROM due WHERE email IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM signed s WHERE s.email = lower(t.participant_email))
)`;
}

/** Counts what is due, writing nothing (the cron's `?dryRun=1`). */
export function retentionCountSql(months: number = RETENTION_MONTHS): string {
  return `${dueCtes(months)}
SELECT (SELECT count(*) FROM due WHERE kind = 'inquiry')::int AS inquiries,
       (SELECT count(*) FROM due WHERE kind = 'carfax')::int AS carfax_requests,
       (SELECT count(*) FROM due WHERE kind = 'offer')::int AS calculator_offers,
       (SELECT count(*) FROM due_threads)::int AS email_threads`;
}

/** Deletes what is due and returns the counts deleted. */
export function retentionDeleteSql(months: number = RETENTION_MONTHS): string {
  return `${dueCtes(months)},
d_inquiries AS (DELETE FROM inquiries WHERE id IN (SELECT id FROM due WHERE kind = 'inquiry') RETURNING 1),
d_carfax AS (DELETE FROM carfax_requests WHERE id IN (SELECT id FROM due WHERE kind = 'carfax') RETURNING 1),
d_offers AS (DELETE FROM calculator_offers WHERE id IN (SELECT id FROM due WHERE kind = 'offer') RETURNING 1),
d_threads AS (DELETE FROM email_threads WHERE id IN (SELECT id FROM due_threads) RETURNING 1)
SELECT (SELECT count(*) FROM d_inquiries)::int AS inquiries,
       (SELECT count(*) FROM d_carfax)::int AS carfax_requests,
       (SELECT count(*) FROM d_offers)::int AS calculator_offers,
       (SELECT count(*) FROM d_threads)::int AS email_threads`;
}

export type RetentionCounts = {
  inquiries: number;
  carfax_requests: number;
  calculator_offers: number;
  email_threads: number;
};

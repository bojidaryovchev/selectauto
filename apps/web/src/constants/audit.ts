/**
 * Labels for the `contract_events` audit trail.
 *
 * Extracted from `admin/dogovori/[id]/page.tsx`, which had them inline. That
 * table is written by contracts, deposits, role changes AND (since the paid
 * de-listing shipped) by actions that have nothing to do with contracts — but
 * it was only ever RENDERED on one contract's page, so most rows were written
 * where nobody could read them. Role-change events are the clearest case: they
 * are stored with `entity_id = 0`, which no contract page will ever display.
 *
 * For a service the business CHARGES for, "we keep a full audit trail" is a claim
 * the UI has to support, so these labels now feed a global log at
 * `/admin/dnevnik` as well as the per-contract panel.
 */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  created: "Създаване",
  updated: "Редакция",
  status_changed: "Промяна на статус",
  document_generated: "Генериран документ",
  marked_paid: "Отбелязано плащане",
  payment_reverted: "Върнат статус на плащане",
  attachment_added: "Прикачен документ",
  roles_changed: "Промяна на роли",
  deindexed: "Скрита обява",
  deindex_revoked: "Възстановена обява",
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  contract: "Договор",
  payment: "Плащане",
  deposit: "Депозит",
  recipient: "Получател",
  client: "Клиент",
  user: "Потребител",
  car_deindex: "Скриване на обява",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity;
}

/** How many audit rows one page of the global log shows. */
export const AUDIT_PAGE_SIZE = 100;

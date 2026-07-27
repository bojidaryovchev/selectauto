"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CONTRACT_MARKET_META, type ContractAmountKey } from "@/constants/contracts";
import { getBackOfficeSession } from "@/lib/admin";
import { getDb, schema } from "@/lib/db";
import { centsToDb, dbToCents, parseAmountToCents } from "@/lib/money";
import { createContractSchema } from "@/schemas/contract.schema";
import type { ActionResult } from "@/types/action-result.type";

/** Today as YYYY-MM-DD in Europe/Sofia (the server runs UTC; dates are business-local). */
function todaySofia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

/** "" or a valid amount string → integer cents (validated by the schema already). */
function cents(value: string | undefined): number {
  if (!value || !value.trim()) return 0;
  return parseAmountToCents(value) ?? 0;
}

/**
 * Admin-only: create a mediation contract (spec §3/§11.1-2). One transaction:
 *
 *  1. Resolve the client — an existing row, or insert the new one (audited).
 *  2. When a deposit is applied (§14): re-validate it is 'paid', belongs to
 *     this client and is unused, then mark it 'used'. The deduction is clamped
 *     to point 1 and the partial UNIQUE index on contracts.deposit_contract_id
 *     makes reuse impossible even under a race.
 *  3. Mint the visible number from contract_counters (atomic upsert-increment;
 *     series 'contract', year of the contract date) → "2026-088".
 *  4. Insert the contract with a frozen client snapshot; total = т.1+…+т.5.
 *  5. Insert the FOUR payment stages (§4): vehicle = т.1 − депозит, transport,
 *     customs_vat, final = т.4 + т.5; all 'not_requested'.
 *  6. Append audit events (§9).
 *
 * Returns the new contract id for the redirect to /admin/dogovori/[id].
 */
export async function createContract(input: unknown): Promise<ActionResult<{ id: number; number: string }>> {
  // Creating is allowed for „Наблюдаващ" too (owner spec 07.2026); EDITING the
  // contract afterwards stays admin-only — see update-contract.mutation.ts.
  const session = await getBackOfficeSession();
  if (!session) return { success: false, error: "Нямате достъп до тази операция." };

  const parsed = createContractSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Невалидни данни във формата." };
  }
  const values = parsed.data;
  const actorId = session.user?.id ?? null;

  const market = CONTRACT_MARKET_META[values.market];
  const currency = market.currency;

  // Канада: перо 1 is entered in CAD + rate; its EUR value (the contract's
  // leading amount) is DERIVED and rounded to the whole euro, like the notices.
  const foreignRate = values.foreignRate?.trim() ? Number(values.foreignRate.replace(",", ".")) : null;
  const carForeignCents = values.amountCarForeign?.trim() ? cents(values.amountCarForeign) : null;
  const derivedCarCents =
    foreignRate !== null && carForeignCents !== null ? Math.round((carForeignCents * foreignRate) / 100) * 100 : null;

  // Only the пера this market actually has are stored; the rest stay zero.
  const marketPointKeys = new Set<ContractAmountKey>(market.points.map((p) => p.key));
  const raw: Record<ContractAmountKey, number> = {
    amountCar: derivedCarCents ?? cents(values.amountCar),
    amountTransport: cents(values.amountTransport),
    amountCustomsVat: cents(values.amountCustomsVat),
    amountTransportEuBg: cents(values.amountTransportEuBg),
    amountCommission: cents(values.amountCommission),
  };
  const amountByKey = Object.fromEntries(
    (Object.keys(raw) as ContractAmountKey[]).map((k) => [k, marketPointKeys.has(k) ? raw[k] : 0]),
  ) as Record<ContractAmountKey, number>;

  const totalCents = market.points.reduce((sum, p) => sum + amountByKey[p.key], 0);
  const contractDate = values.contractDate || todaySofia();
  const year = Number(contractDate.slice(0, 4));

  const db = getDb();

  try {
    const created = await db.transaction(async (tx) => {
      // 1. Client: existing or new (with an audit event).
      let clientRow: typeof schema.clients.$inferSelect;
      if (values.clientId) {
        const [existing] = await tx.select().from(schema.clients).where(eq(schema.clients.id, values.clientId));
        if (!existing) throw new Error("BG:Избраният клиент не е намерен.");
        clientRow = existing;
      } else {
        const nc = values.newClient!;
        const [inserted] = await tx
          .insert(schema.clients)
          .values({
            kind: nc.kind,
            name: nc.name,
            egn: nc.egn || null,
            eik: nc.eik || null,
            vatNumber: nc.vatNumber || null,
            address: nc.address || null,
            representative: nc.representative || null,
            phone: nc.phone || null,
            email: nc.email || null,
          })
          .returning();
        clientRow = inserted!;
        await tx.insert(schema.contractEvents).values({
          entity: "client",
          entityId: clientRow.id,
          action: "created",
          actorId,
          data: { name: clientRow.name, kind: clientRow.kind },
        });
      }

      // 2. Deposit deduction (§14) — re-validate against the DB, then mark used.
      let depositDeductionCents = 0;
      let depositNumber: string | null = null;
      if (values.depositContractId) {
        const [deposit] = await tx
          .select()
          .from(schema.depositContracts)
          .where(eq(schema.depositContracts.id, values.depositContractId));
        if (!deposit) throw new Error("BG:Избраният депозит не е намерен.");
        if (deposit.clientId !== clientRow.id) throw new Error("BG:Депозитът е на друг клиент.");
        if (deposit.status !== "paid") throw new Error("BG:Депозитът не е със статус „Депозит платен“.");
        const [usedBy] = await tx
          .select({ id: schema.contracts.id })
          .from(schema.contracts)
          .where(eq(schema.contracts.depositContractId, deposit.id));
        if (usedBy) throw new Error("BG:Депозитът вече е използван по друг договор.");

        depositDeductionCents = Math.min(dbToCents(deposit.depositAmount), amountByKey.amountCar);
        depositNumber = deposit.number;
        await tx
          .update(schema.depositContracts)
          .set({ status: "used", updatedBy: actorId, updatedAt: new Date() })
          .where(eq(schema.depositContracts.id, deposit.id));
        await tx.insert(schema.contractEvents).values({
          entity: "deposit",
          entityId: deposit.id,
          action: "status_changed",
          actorId,
          data: { old: "paid", new: "used" },
        });
      }

      // 3. Mint the visible number (atomic increment per series/year).
      const minted = await tx.execute(
        sql`INSERT INTO contract_counters (series, year, last_no) VALUES ('contract', ${year}, 1)
            ON CONFLICT (series, year) DO UPDATE SET last_no = contract_counters.last_no + 1
            RETURNING last_no`,
      );
      const lastNo = Number((minted.rows[0] as { last_no: number | string }).last_no);
      const number = `${year}-${String(lastNo).padStart(3, "0")}`;
      const paymentBasis = values.paymentBasis?.trim() || `Договор № ${number}`;

      // 4. The contract row, with the client snapshot frozen at creation (§2).
      const [contract] = await tx
        .insert(schema.contracts)
        .values({
          number,
          contractDate,
          market: values.market,
          currency,
          clientId: clientRow.id,
          clientSnapshot: {
            kind: clientRow.kind,
            name: clientRow.name,
            egn: clientRow.egn,
            eik: clientRow.eik,
            vatNumber: clientRow.vatNumber,
            address: clientRow.address,
            representative: clientRow.representative,
            phone: clientRow.phone,
            email: clientRow.email,
          },
          carYear: values.carYear,
          carMake: values.carMake,
          carModel: values.carModel,
          vin: values.vin || null,
          purchaseMarket: values.purchaseMarket || null,
          auctionPlatform: values.auctionPlatform || null,
          amountCar: centsToDb(amountByKey.amountCar),
          amountTransport: centsToDb(amountByKey.amountTransport),
          amountCustomsVat: centsToDb(amountByKey.amountCustomsVat),
          amountTransportEuBg: centsToDb(amountByKey.amountTransportEuBg),
          amountCommission: centsToDb(amountByKey.amountCommission),
          totalAmount: centsToDb(totalCents),
          ...(carForeignCents !== null && foreignRate !== null
            ? {
                amountCarForeign: centsToDb(carForeignCents),
                foreignCurrency: market.points.find((p) => p.foreignCurrency)?.foreignCurrency ?? null,
                foreignRate: String(foreignRate),
              }
            : {}),
          paymentBasis,
          depositContractId: values.depositContractId ?? null,
          depositDeduction: centsToDb(depositDeductionCents),
          status: "active",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ id: schema.contracts.id, number: schema.contracts.number });

      // 5. The payment stages THIS market has (4 for САЩ/Корея, 3 for Канада,
      //    2 for Европа — §4). The vehicle stage carries the deposit deduction.
      await tx.insert(schema.contractPayments).values(
        market.stages.map((def) => {
          const sum = def.points.reduce((s, key) => s + amountByKey[key], 0);
          const due = def.stage === "vehicle" ? Math.max(0, sum - depositDeductionCents) : sum;
          return {
            contractId: contract!.id,
            stage: def.stage,
            dueAmount: centsToDb(due),
            currency,
            basis: paymentBasis,
            status: "not_requested",
          };
        }),
      );

      // 6. Audit.
      await tx.insert(schema.contractEvents).values({
        entity: "contract",
        entityId: contract!.id,
        action: "created",
        actorId,
        data: {
          number,
          market: values.market,
          total: centsToDb(totalCents),
          currency,
          ...(depositNumber ? { deposit: depositNumber, depositDeduction: centsToDb(depositDeductionCents) } : {}),
        },
      });

      return contract!;
    });

    revalidatePath("/admin", "layout");
    return { success: true, data: { id: created.id, number: created.number } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BG:")) {
      return { success: false, error: error.message.slice(3) };
    }
    console.error("[create-contract] persist failed", error);
    return { success: false, error: "Възникна грешка при създаването на договора. Моля опитайте отново." };
  }
}

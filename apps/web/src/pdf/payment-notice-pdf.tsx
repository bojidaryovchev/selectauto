import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCentsDoc } from "@/lib/money";
import type { NoticeSnapshot } from "@/types/notice-snapshot.type";

/**
 * The payment-notice PDF (известие за плащане), rendered EXCLUSIVELY from a
 * frozen NoticeSnapshot (§2/§6). One template covers all three layouts from the
 * live samples — adding a new international partner needs zero template work
 * (§8), only recipient data:
 *
 *   selectauto_usd — line table Стойност/USD · Курс · Стойност/Евро (§16.1),
 *                    SelectAuto BGN/BLINK bank block, total in EUR.
 *   selectauto_eur — line table Цена/Евро · Количество · Обща сума/Евро,
 *                    total in EUR + лв. equivalent.
 *   external       — same EUR/USD table, full recipient bank block
 *                    (Auto America / Lean Customs / partners) + разноски row.
 *
 * Fonts are registered in render.ts (PT Sans — full Cyrillic, OFL).
 */

const s = StyleSheet.create({
  page: { fontFamily: "PTSans", fontSize: 10, paddingHorizontal: 48, paddingVertical: 40, color: "#111" },
  original: { textAlign: "center", marginBottom: 10, fontSize: 11 },
  box: { borderWidth: 1, borderColor: "#bbb", marginBottom: 10 },
  headRow: { flexDirection: "row", justifyContent: "space-between", padding: 8 },
  headTitle: { fontWeight: "bold", fontSize: 12 },
  parties: { flexDirection: "row" },
  party: { flex: 1, padding: 8 },
  partyDivider: { borderLeftWidth: 1, borderLeftColor: "#bbb" },
  bold: { fontWeight: "bold" },
  line: { marginBottom: 2 },
  table: { borderWidth: 1, borderColor: "#bbb", marginBottom: 10 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#bbb" },
  trLast: { flexDirection: "row" },
  th: { fontWeight: "bold", padding: 6 },
  td: { padding: 6 },
  cNo: { width: "8%" },
  cDesc: { width: "44%" },
  cA: { width: "16%", textAlign: "right" },
  cB: { width: "16%", textAlign: "right" },
  cC: { width: "16%", textAlign: "right" },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#bbb" },
  infoRowLast: { flexDirection: "row" },
  infoKey: { width: "38%", padding: 6 },
  infoVal: { width: "62%", padding: 6 },
  fullRow: { padding: 6, borderBottomWidth: 1, borderBottomColor: "#bbb" },
  footer: { marginTop: 14, fontSize: 7.5, color: "#444", lineHeight: 1.4 },
});

/** ISO YYYY-MM-DD → DD.MM.YYYY (the notices' date format). */
function bgDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Курс display: trim trailing zeros but keep at least 2 decimals ("0.86"). */
function rateLabel(rate: number): string {
  return rate.toFixed(6).replace(/0+$/, "").replace(/\.$/, ".00").padEnd(4, "0");
}

export function PaymentNoticePdf({ snapshot }: { snapshot: NoticeSnapshot }) {
  // The rate table and the bank block are independent: Канада prints the three
  // columns while addressing an EXTERNAL recipient (ALCO IMPEX).
  const isUsd = snapshot.showRateColumns ?? snapshot.variant === "selectauto_usd";
  const isSelectAuto = snapshot.variant !== "external";
  const r = snapshot.recipient;

  const totalLabel = `${formatCentsDoc(snapshot.totalCents)} ${snapshot.totalCurrencyLabel}`;

  // The recipient/bank block rows, per variant (order matches the samples).
  // Rows with no value are dropped — an international partner may have no VAT
  // number, and an empty labelled row looks like missing data on a legal document.
  const bankRowsRaw: [string, string][] = isSelectAuto
    ? [
        ["Банка", r.bankName],
        ["SWIFT/BIC", r.swiftBic],
        ["Сметка IBAN", r.iban],
        ...(r.paymentMethod ? ([["Вид плащане", r.paymentMethod]] as [string, string][]) : []),
        ["Основание", snapshot.basis],
      ]
    : [
        ["Име на получателя", r.name],
        ["ДДС НОМЕР", r.vatNumber],
        ["Адрес на получателя", r.address],
        ["Банка на получателя", r.bankName],
        ["Адрес на банката", r.bankAddress],
        [`Сметка IBAN ${snapshot.currency === "EUR" ? "EURO" : snapshot.currency}`, r.iban],
        ["SWIFT/BIC", r.swiftBic],
        // Non-SEPA wires (e.g. Canada) quote a clearing code as well as SWIFT.
        ...(r.routingCode ? ([["Routing code", r.routingCode]] as [string, string][]) : []),
        ["Основание", snapshot.basis],
        ["Разноски на превода", r.chargesInstruction || "За сметка на изпращача"],
      ];

  const bankRows = bankRowsRaw.filter(([, value]) => value.trim() !== "");

  return (
    <Document title={`Известие за плащане — Договор № ${snapshot.contractNumber}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.original}>ОРИГИНАЛ</Text>

        {/* Header: title + date */}
        <View style={s.box}>
          <View style={s.headRow}>
            <Text style={s.headTitle}>ИЗВЕСТИЕ ЗА ПЛАЩАНЕ</Text>
            <Text style={s.bold}>{bgDate(snapshot.noticeDate)}</Text>
          </View>
        </View>

        {/* Издал / Получил */}
        <View style={[s.box, s.parties]}>
          <View style={s.party}>
            <Text style={[s.bold, s.line]}>Издал:</Text>
            <Text style={s.line}>Име: {snapshot.issuer.name}</Text>
            <Text style={s.line}>ДДС №: {snapshot.issuer.vatNumber}</Text>
            <Text style={s.line}>ИН: {snapshot.issuer.companyId}</Text>
            <Text style={s.line}>Адрес: {snapshot.issuer.address}</Text>
          </View>
          <View style={[s.party, s.partyDivider]}>
            <Text style={[s.bold, s.line]}>Получил:</Text>
            <Text style={s.line}>Име: {snapshot.client.name}</Text>
            <Text style={s.line}>
              {snapshot.client.isCompany ? "ЕИК" : "ЕГН"}: {snapshot.client.egnOrEik}
            </Text>
            <Text style={s.line}>Адрес: {snapshot.client.address}</Text>
          </View>
        </View>

        {/* Договор / Автомобил */}
        <View style={s.box}>
          <View style={{ padding: 8 }}>
            <Text style={[s.bold, s.line]}>Договор № {snapshot.contractNumber}</Text>
            <Text style={s.bold}>
              Автомобил: {snapshot.carTitle}
              {"    "}VIN: {snapshot.vin}
            </Text>
          </View>
        </View>

        {/* Line-item table */}
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, s.cNo]}>No.</Text>
            <Text style={[s.th, s.cDesc]}>Наименование на услугите</Text>
            {isUsd ? (
              <>
                <Text style={[s.th, s.cA]}>Стойност / {snapshot.currency}</Text>
                <Text style={[s.th, s.cB]}>Курс</Text>
                <Text style={[s.th, s.cC]}>Стойност / Евро</Text>
              </>
            ) : (
              <>
                <Text style={[s.th, s.cA]}>Цена{snapshot.currency === "EUR" ? " (Евро)" : ` (${snapshot.currency})`}</Text>
                <Text style={[s.th, s.cB]}>Количество</Text>
                <Text style={[s.th, s.cC]}>Обща сума{snapshot.currency === "EUR" ? " (Евро)" : ` (${snapshot.currency})`}</Text>
              </>
            )}
          </View>
          {snapshot.lines.map((line, i) => (
            <View key={i} style={i === snapshot.lines.length - 1 ? s.trLast : s.tr}>
              <Text style={[s.td, s.cNo]}>{i + 1}</Text>
              <Text style={[s.td, s.cDesc]}>{line.description}</Text>
              {isUsd ? (
                <>
                  <Text style={[s.td, s.cA]}>{formatCentsDoc(line.amountCents)}</Text>
                  <Text style={[s.td, s.cB]}>{snapshot.usdEurRate ? rateLabel(snapshot.usdEurRate) : ""}</Text>
                  <Text style={[s.td, s.cC]}>{formatCentsDoc(line.amountEurCents ?? 0)}</Text>
                </>
              ) : (
                <>
                  <Text style={[s.td, s.cA]}>{formatCentsDoc(line.amountCents)}</Text>
                  <Text style={[s.td, s.cB]}>{line.quantity}</Text>
                  <Text style={[s.td, s.cC]}>{formatCentsDoc(line.amountCents * line.quantity)}</Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Payment + bank block */}
        <View style={s.box}>
          <Text style={s.fullRow}>Плащане: по банков път</Text>
          <Text style={[s.fullRow, s.bold]}>Обща сума за плащане: {totalLabel}</Text>
          {bankRows.map(([key, value], i) => (
            <View key={key} style={i === bankRows.length - 1 ? s.infoRowLast : s.infoRow}>
              <Text style={s.infoKey}>{key}</Text>
              <Text style={s.infoVal}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>
          Съгласно чл.7 ал.1 и чл.8 от Закона за счетоводството и Писмо на МФ ГДД 91-00-46 от 25.03.2002 г., печатът
          не е задължителен реквизит на първичните счетоводни документи, а подписът може да се замени с
          идентификационни шифри.
        </Text>
      </Page>
    </Document>
  );
}

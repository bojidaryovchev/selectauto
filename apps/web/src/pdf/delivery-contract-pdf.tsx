import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContractDocSnapshot } from "@/types/contract-snapshot.type";

/**
 * ДОГОВОР ЗА ДОСТАВКА — Европа. A different document from the mediation
 * contract: the parties are КУПУВАЧ/ДОСТАВЧИК (not възложител/изпълнител),
 * ownership transfers, delivery is 30 working days to ул. „Ушица Север" № 64А,
 * and the total is quoted „с ДДС". Wording follows the client's signed original
 * (№ 2025-025), with СЕЛЕКТАУТО ИМПОРТ's data replacing the old КВ АУТО ГРУП
 * entity and the форсмажор clause added (owner, 07.2026).
 */

const s = StyleSheet.create({
  page: { fontFamily: "PTSans", fontSize: 10, paddingHorizontal: 56, paddingVertical: 48, color: "#111", lineHeight: 1.5 },
  title: { textAlign: "center", fontSize: 13, fontWeight: "bold", marginBottom: 16 },
  heading: { fontWeight: "bold", marginTop: 10, marginBottom: 4 },
  p: { marginBottom: 8, textAlign: "left" },
  item: { marginBottom: 6, textAlign: "left" },
  bold: { fontWeight: "bold" },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 36 },
  signCol: { width: "45%" },
  stamp: { width: 190, marginTop: 4 },
  total: { marginTop: 28, fontWeight: "bold", textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 56, right: 56, textAlign: "center", fontSize: 8, color: "#666" },
});

function bgDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function DeliveryContractPdf({ snapshot: d, stampSrc }: { snapshot: ContractDocSnapshot; stampSrc?: { data: Buffer; format: "png" } }) {
  const c = d.company;
  const cl = d.client;

  return (
    <Document title={`Договор за доставка № ${d.number}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>ДОГОВОР ЗА ДОСТАВКА №{d.number}</Text>

        <Text style={s.p}>Днес {bgDate(d.date)} г. между:</Text>

        <Text style={s.p}>
          <Text style={s.bold}>{cl.name}</Text>
          {cl.isCompany ? `, с ЕИК: ${cl.idNumber}` : `, с ЕГН: ${cl.idNumber}`}
          {cl.address ? `, адрес: ${cl.address}` : ""}, наричан „КУПУВАЧ“ и <Text style={s.bold}>{c.name}</Text> с ЕИК{" "}
          {c.eik}, с адрес на управление: {c.address}, с управител {c.manager} с ЕГН {c.managerEgn} и адрес{" "}
          {c.managerAddress}, наричано „ДОСТАВЧИК“, наричани заедно по-долу „СТРАНИТЕ“ СЕ СКЛЮЧИ ДОГОВОР:
        </Text>

        <Text style={s.heading}>ПРЕДМЕТ НА ДОГОВОРА</Text>
        <Text style={s.item}>
          1. ДОСТАВЧИКЪТ се задължава да достави, а КУПУВАЧЪТ да приеме и заплати следните стоки: автомобил:{" "}
          <Text style={s.bold}>
            {d.car.title}; VIN: {d.car.vin}
          </Text>
        </Text>

        <Text style={s.heading}>ЦЕНИ И ПЛАЩАНЕ</Text>
        {d.lines.map((line, i) => (
          <Text key={line.number} style={s.item}>
            {line.number}{" "}
            {i === 0 ? "Цената на стоките, предмет на настоящия договор е както следва: " : `${line.text} - `}
            <Text style={s.bold}>{line.amountInWords}</Text>
          </Text>
        ))}

        <Text style={s.p}>
          Описаните по-горе суми се превеждат поетапно от възложителя по сметка на изпълнителя, взимайки предвид курс
          „купува“ безкасово на обслужващата изпълнителя банка към датата на превода след представено известие за
          дължима сума.
        </Text>

        <Text style={s.p}>
          Основанието за постъпването на преводите в банковата сметка на изпълнителя - <Text style={s.bold}>{c.iban}</Text>,
          открита в Банка {c.bankName}, е: <Text style={s.bold}>{d.basis}</Text> и следва да бъде посочено в платежното
          нареждане.
        </Text>

        <Text style={s.heading}>УСЛОВИЯ И СРОКОВЕ НА ДОСТАВКА</Text>
        <Text style={s.item}>
          3. Стоките ще се доставят в рамките на 30 (тридесет работни дни) дни, който срок започва да тече от момента на
          постъпване на сумата по т. 2 по банковата сметка на ДОСТАВЧИКА. Срокът е ориентировъчен и зависи от
          натовареността на съответните транспортни коридори и гранични служби.
        </Text>
        <Text style={s.item}>
          Срокът спира да тече при възникване на обстоятелства, забавящи доставката, които не зависят от волята на
          ДОСТАВЧИКА. Този срок може да бъде удължаван по взаимно съгласие на двете страни.
        </Text>
        <Text style={s.item}>
          4. Стоките ще се доставят на адрес: <Text style={s.bold}>{d.deliveryAddress}</Text>.
        </Text>

        <Text style={s.heading}>ПРАВА И ЗАДЪЛЖЕНИЯ НА ДОСТАВЧИКА</Text>
        <Text style={s.item}>
          5. ДОСТАВЧИКЪТ има право да получи цена в размера, по начина и в срока, уговорени в настоящия договор.
        </Text>
        <Text style={s.item}>6. ДОСТАВЧИКЪТ се задължава:</Text>
        <Text style={s.item}>
          а) да прехвърли на КУПУВАЧА собствеността на стоките, предмет на настоящия договор, като прехвърлителната
          сделка се урежда съгласно законодателството на Р. България.
        </Text>
        <Text style={s.item}>б) да предаде стоките в състояние, в което те са се намирали по време на продажбата.</Text>
        <Text style={s.item}>
          7. ДОСТАВЧИКЪТ не отговаря за недостатъци, които са били известни на КУПУВАЧА при сключването на договора.
        </Text>

        <Text style={s.heading}>ПРАВА И ЗАДЪЛЖЕНИЯ НА КУПУВАЧА</Text>
        <Text style={s.item}>8. КУПУВАЧЪТ има право:</Text>
        <Text style={s.item}>а) да получи стоките, предмет на настоящия договор.</Text>

        <Text style={s.heading}>ДРУГИ</Text>
        <Text style={s.item}>
          9. Всички допълнителни разходи, които възникват по изпълнението на договора и не са по вина на изпълнителя, са
          за сметка на възложителя.
        </Text>
        <Text style={s.item}>
          10. Предаването на автомобила ще се извърши след пълното му заплащане по настоящия договор.
        </Text>
        <Text style={s.item}>
          Страните се съгласяват, че договорената цена може да бъде актуализирана при настъпване на форсмажорни
          обстоятелства или значителни промени в разходите по доставката, възникнали след сключването на договора и извън
          контрола на доставчика. За форсмажорни обстоятелства се считат, но не само: природни бедствия, войни,
          международни санкции, промени в законодателството или митническите режими, значителни колебания на валутния
          курс, рязко увеличени транспортни, логистични или застрахователни разходи, както и други непреодолими
          обстоятелства извън контрола на доставчика.
        </Text>

        <Text style={s.p}>
          Страните по настоящия договор следва да отправят всички съобщения и уведомления помежду си само в писмена форма
          на адресите на страните за отправяне на уведомления, връчвания и съобщения, както следва:
        </Text>
        <Text style={s.item}>
          За Възложителя:{"\n"}email: {cl.email || "..............................."}
          {"\n"}телефон: {cl.phone || "..............................."}
        </Text>
        <Text style={s.item}>
          За изпълнителя:{"\n"}email: {c.email}
          {"\n"}телефон: {c.phone}
        </Text>

        <Text style={s.heading}>СПОРОВЕ</Text>
        <Text style={s.item}>
          11. Всички спорове, породени от този Договор или отнасящи се до него, включително споровете, породени или
          отнасящи се до неговото тълкуване, недействителност, изпълнение, неизпълнение, прекратяване, както и споровете
          за попълване на празноти в този договор, ще бъдат разглеждани като първа инстанция от Пловдивски районен съд
          (респ. Пловдивски окръжен съд), като настоящата клауза се счита за уредена договорна подсъдност по смисъла на
          чл. 117 ГПК.
        </Text>
        <Text style={s.item}>
          12. За неуредени от настоящия договор въпроси ще се прилагат съответните разпоредби, предвидени от Закона.
        </Text>

        <Text style={s.p}>Настоящият договор се състави в два еднообразни екземпляра, по един за всяка от страните.</Text>

        <View style={s.signRow}>
          <View style={s.signCol}>
            <Text style={s.bold}>ДОСТАВЧИК:</Text>
            <Text style={s.bold}>{c.manager.toUpperCase()}</Text>
            <Text>УПРАВИТЕЛ</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image> draws into a PDF, it has no alt attribute */}
            {stampSrc ? <Image src={stampSrc} style={s.stamp} /> : null}
          </View>
          <View style={s.signCol}>
            <Text style={s.bold}>ЗА КУПУВАЧ:</Text>
          </View>
        </View>

        <Text style={s.total}>
          Обща сума: {d.totalInWords}
          {d.vatIncluded ? " с ДДС" : ""}.
        </Text>

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}

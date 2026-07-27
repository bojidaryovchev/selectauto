import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContractDocSnapshot } from "@/types/contract-snapshot.type";

/**
 * ДОГОВОР ЗА ПОСРЕДНИЧЕСТВО — САЩ, Канада и Корея. The wording follows the
 * client's signed originals (2026-058, 2026-086, 2026-090) verbatim; only the
 * пера, the currency, the auction platforms and the Canadian dual-currency line
 * vary by market. The форсмажор clause is included in ALL contracts (owner,
 * 07.2026 — it appeared only in 2026-086 before).
 */

const s = StyleSheet.create({
  page: { fontFamily: "PTSans", fontSize: 10, paddingHorizontal: 56, paddingVertical: 48, color: "#111", lineHeight: 1.5 },
  title: { textAlign: "center", fontSize: 13, fontWeight: "bold", marginBottom: 16 },
  p: { marginBottom: 8, textAlign: "left" },
  bold: { fontWeight: "bold" },
  item: { marginBottom: 6, textAlign: "left" },
  note: { marginBottom: 8, textAlign: "left" },
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

export function MediationContractPdf({ snapshot: d, stampSrc }: { snapshot: ContractDocSnapshot; stampSrc?: { data: Buffer; format: "png" } }) {
  const c = d.company;
  const cl = d.client;

  return (
    <Document title={`Договор за посредничество № ${d.number}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>ДОГОВОР ЗА ПОСРЕДНИЧЕСТВО № {d.number}</Text>

        <Text style={s.p}>Днес {bgDate(d.date)} г. между:</Text>

        <Text style={s.p}>
          <Text style={s.bold}>{cl.name}</Text>
          {cl.isCompany ? `, с ЕИК ${cl.idNumber}` : `, с ЕГН ${cl.idNumber}`}
          {cl.address ? `, адрес: ${cl.address}` : ""}
          {cl.isCompany && cl.representative ? `, представлявано от ${cl.representative}` : ""}, наричан „ВЪЗЛОЖИТЕЛ“
        </Text>

        <Text style={s.p}>и</Text>

        <Text style={s.p}>
          <Text style={s.bold}>”{c.name.replace(" ЕООД", "”")} ЕООД</Text>, ЕИК {c.eik}, с адрес на управление: {c.address}, с
          управител {c.manager} с ЕГН {c.managerEgn} и адрес {c.managerAddress}, наричано „ИЗПЪЛНИТЕЛ“, наричани заедно
          по-долу „СТРАНИТЕ“ СЕ СКЛЮЧИ НАСТОЯЩИЯТ ДОГОВОР ЗА СЛЕДНОТО:
        </Text>

        <Text style={s.p}>
          Между страните е постигнато съгласие, изпълнителят да посредничи при покупка и доставката на автомобил:{" "}
          <Text style={s.bold}>
            {d.car.title} VIN:{d.car.vin}
          </Text>
        </Text>

        <Text style={s.p}>
          Посредническата услуга се състои в съгласие от страна на възложителя за участие на търг{d.auctionCountry}.
        </Text>

        <Text style={s.p}>
          Плащанията по настоящия договор ще се извършат от възложителя по сметка на изпълнителя по предоставени
          известия за дължими суми за извършени услуги.
        </Text>

        <Text style={s.p}>
          Автомобилът е огледан и избран от възложителя и ще се достави от изпълнителя в състоянието, показано и описано
          в сайта на съответната тръжна площадка – {d.auctionPlatforms}
        </Text>

        <Text style={s.p}>
          Страните се съгласяват, че плащанията по настоящия договор ще бъдат извършени по следния начин:
        </Text>

        {d.lines.map((line) => (
          <View key={line.number}>
            <Text style={s.item}>
              <Text style={s.bold}>{line.number} </Text>
              {line.text} –{" "}
              {line.foreign ? (
                <>
                  <Text style={s.bold}>{line.foreign.amountInWords}</Text>, равностойни на{" "}
                  <Text style={s.bold}>{line.amountInWords}</Text> (курс {line.foreign.rate})
                </>
              ) : (
                <Text style={s.bold}>{line.amountInWords}</Text>
              )}
              .
            </Text>
            {line.note ? <Text style={s.note}>{line.note}</Text> : null}
          </View>
        ))}

        <Text style={s.p}>
          Описаните по-горе суми се превеждат поетапно от възложителя по сметка на изпълнителя, взимайки предвид курс
          “продава” безкасово на обслужващата изпълнителя банка към датата на превода след представено известие за
          дължима сума.
        </Text>

        <Text style={s.p}>
          Основанието за постъпването на преводите в банковата сметка на изпълнителя – <Text style={s.bold}>{c.iban}</Text>,
          открита в Банка {c.bankName}, е: <Text style={s.bold}>{d.basis}</Text> и следва да бъде посочено в платежното
          нареждане.
        </Text>

        <Text style={s.p}>
          Ако Възложителя не заплати в срок от седем дни някоя от гореописаните суми, той дължи на изпълнителя неустойка
          в размер на <Text style={s.bold}>0,4%</Text> (нула цяло и четири процента) от размера на задължението за всеки
          ден просрочие, но не повече от <Text style={s.bold}>20%</Text> (двадесет процента). При не плащане на пълния
          размер на тези задължения повече от 60 дни, възложителят дължи на изпълнителя неустойка/обезщетение в двойния
          размер на неплатеното задължение.
        </Text>

        <Text style={s.p}>
          В случаите по горния текст, страните се съгласяват изпълнителят да задържи автомобила и да не го предава на
          възложителя до пълното изплащане на неустойката.
        </Text>

        <Text style={s.p}>
          Всички допълнителни разходи, които възникват по изпълнението на договора и не са по вина на изпълнителя, са за
          сметка на възложителя.
        </Text>

        <Text style={s.p}>
          Страните се съгласяват, че договорената цена за автомобила може да бъде актуализирана при настъпване на
          форсмажорни обстоятелства или значителни промени в разходите по вноса, възникнали след сключването на договора
          и извън контрола на вносителя.
        </Text>

        <Text style={s.p}>
          За форсмажорни обстоятелства се считат, но не само: природни бедствия, войни, международни санкции, промени в
          законодателството или митническите режими, значителни колебания на валутния курс, рязко увеличени транспортни,
          логистични или застрахователни разходи, както и други непреодолими обстоятелства извън контрола на вносителя.
        </Text>

        <Text style={s.p}>
          Изпълнителят се задължава да достави автомобила в България, на адрес: {d.deliveryAddress} в срок от три месеца,
          считано от извършване на всички плащания, описани по-горе. Срокът е ориентировъчен и зависи от натовареността
          на съответните пристанища, презокеански транспортни коридори и митнически агенции, участващи в процеса по
          доставка. Срокът спира да тече при възникване на обстоятелства, забавящи доставката, които не зависят от волята
          на изпълнителя. Този срок може да бъде удължаван по взаимно съгласие на двете страни.
        </Text>

        <Text style={s.p}>Предаването на автомобила ще се извърши след пълното му заплащане по настоящия договор.</Text>

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

        <Text style={s.p}>
          Страните се съгласяват, че горепосочените адреси могат да служат и за адреси за съдебни съобщения и
          призовавания.
        </Text>

        <Text style={s.p}>
          Писмената форма се смята за спазена и когато те са отправени по имейл, вайбър, есемес или друго техническо
          средство, което изключва възможността за неточно възпроизвеждане на изявлението.
        </Text>

        <Text style={s.p}>
          За неуредените с този договор въпроси се прилагат разпоредбите на гражданското и търговското законодателство на
          Република България.
        </Text>

        <Text style={s.p}>
          Всички спорове, породени от този Договор или отнасящи се до него, включително споровете, породени или отнасящи
          се до неговото тълкуване, недействителност, изпълнение, неизпълнение, прекратяване, както и споровете за
          попълване на празноти в този договор, ще бъдат разглеждани като първа инстанция от Пловдивски районен съд
          (респ. Пловдивски окръжен съд), като настоящата клауза се счита за уредена договорна подсъдност по смисъла на
          чл. 117 ГПК.
        </Text>

        <Text style={s.p}>
          В случай на разминаване между състоянието на гореописания автомобил при подбора му на тръжната площадка и
          състоянието му при доставка на базата на Изпълнителя, ”{c.name}” не носи каквато и да е отговорност, било тя
          материална или финансова.
        </Text>

        <Text style={s.p}>
          Изпълнителят поема ангажимент да съдейства на Възложителя при уточняване на това, къде би могла да е нанесена
          съответната щета, изразяващо се в осъществяване на контакт с всички страни, участващи по доставката на
          автомобила, а именно: дружеството, което съхранява автомобила на тръжната площадка до момента спечелване на
          търга, дружеството, отговарящо за логистиката на закупения автомобил по суша и море до Европа, съответната
          митническа агенция на територията на Европа и дружеството, отговарящо за логистиката на закупения автомобил от
          съответната митническа агенция на територията на Европа до базата на Изпълнителя в гр. Пловдив, Р България.
        </Text>

        <Text style={s.p}>Настоящият договор се състави в два еднообразни екземпляра, по един за всяка от страните.</Text>

        <View style={s.signRow}>
          <View style={s.signCol}>
            <Text style={s.bold}>ЗА ИЗПЪЛНИТЕЛЯ:</Text>
            <Text style={s.bold}>{d.company.manager.toUpperCase()}</Text>
            <Text>УПРАВИТЕЛ</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image> draws into a PDF, it has no alt attribute */}
            {stampSrc ? <Image src={stampSrc} style={s.stamp} /> : null}
          </View>
          <View style={s.signCol}>
            <Text style={s.bold}>ЗА ВЪЗЛОЖИТЕЛЯ:</Text>
          </View>
        </View>

        {/* „Обща сума: 20 150 (двадесет хиляди сто и петдесет) евро." */}
        <Text style={s.total}>Обща сума: {d.totalInWords}.</Text>

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}

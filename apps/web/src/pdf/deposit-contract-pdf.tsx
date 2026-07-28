import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContractDocSnapshot } from "@/types/contract-snapshot.type";

/**
 * ДОГОВОР ЗА ДЕПОЗИТ ЗА ПРИДОБИВАНЕ НА МОТОРНО ПРЕВОЗНО СРЕДСТВО (spec §14).
 * Wording follows the client's signed original № 2026-047 verbatim — the
 * preliminary contract signed before the mediation contract, with its own
 * number series. Ends with the same payment table the original carries.
 */

const s = StyleSheet.create({
  page: {
    fontFamily: "PTSans",
    fontSize: 10,
    paddingHorizontal: 56,
    paddingVertical: 48,
    color: "#111",
    lineHeight: 1.5,
  },
  title: { textAlign: "center", fontSize: 12, fontWeight: "bold", marginBottom: 16 },
  p: { marginBottom: 8, textAlign: "left" },
  bold: { fontWeight: "bold" },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 32 },
  signCol: { width: "45%" },
  stamp: { width: 190, marginTop: 4 },
  table: { borderWidth: 1, borderColor: "#bbb", marginTop: 24, width: "70%", alignSelf: "center" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#bbb" },
  trLast: { flexDirection: "row" },
  tKey: { width: "42%", padding: 6 },
  tVal: { width: "58%", padding: 6 },
  full: { padding: 6, borderBottomWidth: 1, borderBottomColor: "#bbb" },
  footer: { position: "absolute", bottom: 24, left: 56, right: 56, textAlign: "center", fontSize: 8, color: "#666" },
});

function bgDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function DepositContractPdf({
  snapshot: d,
  stampSrc,
}: {
  snapshot: ContractDocSnapshot;
  stampSrc?: { data: Buffer; format: "png" };
}) {
  const c = d.company;
  const cl = d.client;
  const deposit = d.lines[0];

  return (
    <Document title={`Договор за депозит № ${d.number}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>
          ДОГОВОР ЗА ДЕПОЗИТ ЗА ПРИДОБИВАНЕ НА МОТОРНО ПРЕВОЗНО СРЕДСТВО № {d.number}
        </Text>

        <Text style={s.p}>
          Днес, {bgDate(d.date)} г. в град {d.city} се сключи настоящият договор между:
        </Text>

        <Text style={s.p}>
          <Text style={s.bold}>”{c.name.replace(" ЕООД", "”")} ЕООД</Text>, ЕИК {c.eik}, със седалище и адрес на
          управление: {c.address}, представлявано от {c.manager} - управител, от една страна, като и наричан в
          настоящия договор ТЪРГОВЕЦ
        </Text>

        <Text style={s.p}>и</Text>

        <Text style={s.p}>
          <Text style={s.bold}>{cl.name}</Text>
          {cl.isCompany ? `, ЕИК ${cl.idNumber}` : `, ЕГН ${cl.idNumber}`}, от друга страна като и наричан КЛИЕНТ.
        </Text>

        <Text style={[s.p, s.bold]}>Страните постигнаха съгласие за следното:</Text>

        <Text style={s.p}>
          <Text style={s.bold}>Чл. 1</Text> С настоящия договор КЛИЕНТЪТ възлага на ТЪРГОВЕЦА извършването на следната
          услуга, която ще е предмет на последващ договор: да проучи и да информира за пазара на автомобили в САЩ /
          ЕВРОПА / КОРЕЯ с оглед придобиване от страна на клиента на МПС със следните основни характеристики, общо
          определени: <Text style={s.bold}>{d.vehicleDescription || "ЛЕК АВТОМОБИЛ"}</Text>
          {d.budgetInWords ? (
            <>
              {" "}
              с бюджет, определен от клиента: <Text style={s.bold}>{d.budgetInWords}</Text>
            </>
          ) : null}
          .
        </Text>

        <Text style={s.p}>
          <Text style={s.bold}>Чл. 2.</Text> КЛИЕНТЪТ изрично заявява, че желае да придобие съгласно последващ договор,
          МПС, описано в чл. 1, като заплати всички суми, свързани с придобиването, в това число неизчерпателно
          изброени: депозит за участие в търг, цена, разноски по транспорт до България, застраховка, мита и данъци,
          комисионна, хигиенизиране и други в рамките на така определения бюджет.
        </Text>

        <Text style={s.p}>
          <Text style={s.bold}>Чл. 3</Text> За предоставяне на услугата по чл. 1 КЛИЕНТЪТ заплаща на ТЪРГОВЕЦА сумата,
          представляваща не по-малко от <Text style={s.bold}>{deposit?.amountInWords}</Text>.
        </Text>

        <Text style={s.p}>
          Сумата се изплаща по банков път по следната банкова сметка: <Text style={s.bold}>{c.iban}</Text>, открити на
          името на търговеца в Банка {c.bankName} с основание <Text style={s.bold}>&quot;Депозит {d.number}&quot;</Text>
        </Text>

        <Text style={s.p}>
          В случай, че бюджетът е определен за САЩ, съответно в щатски долари, курсът за внасяне на сумата се определя
          от курс „купува“ безкасово на обслужващата търговеца банка.
        </Text>

        <Text style={s.p}>Плащането на сумата е условие за изпълнение на насрещните задължения на търговеца.</Text>

        <Text style={s.p}>
          <Text style={s.bold}>Чл. 4</Text> Основни клаузи на окончателния договор:
        </Text>
        <Text style={s.p}>
          автомобилът, предмет на настоящия договор се придобива в състоянието, в което е доставено на клиента. При
          евентуални различия с одобреното от клиента по предоставената от търговеца информация, клиентът запазва
          правото си да предявява претенции спрямо първоизточника, превозвача, съответно застраховател. Търговецът не
          носи отговорност за различия извън предоставената от него информация;
        </Text>
        <Text style={s.p}>
          окончателният договор, който се сключва на база проучването на пазара и информирането на клиента е по избор
          на търговеца: комисионен или за покупко-продажба;
        </Text>
        <Text style={s.p}>
          клиентът запазва правото си да посочи трето лице за сключване на окончателен договор, при условие, че в
          платежното за депозита изрично е посочен номер на настоящия договор с оглед преобразуване на депозита в аванс;
        </Text>
        <Text style={s.p}>
          в окончателния договор се уговаря дали депозитът се връща или може да послужи като аванс съгласно изискванията
          на търговеца.
        </Text>

        <Text style={s.p}>
          <Text style={s.bold}>Чл. 5</Text> Търговецът по силата на настоящия договор носи отговорност за проучване и
          информиране на клиента, но не и за вземане на решение за конкретно придобиване, което следва да е предмет на
          последващ договор между страните.
        </Text>

        <Text style={s.p}>
          <Text style={s.bold}>Чл. 6</Text> Настоящият договор се сключва за срок от тридесет календарни дни, в който
          търговецът проучва пазара и предоставя на клиента информация за автомобили с характеристиките по чл. 1,
          съответно в този срок клиентът следва да посочи кой от автомобилите ще е предмет на окончателния договор.
        </Text>

        <Text style={s.p}>
          <Text style={s.bold}>Чл. 7</Text> В случай, че в срока по настоящия предварителен договор окончателен не бъде
          подписан поради причини, които не се дължат на виновното поведение на никоя от страните, ТЪРГОВЕЦЪТ се
          задължава да върне на КЛИЕНТА сумата, предадена като гаранция, в седемдневен срок от развалянето на договора
          без каквито и да е санкции. При подписване на окончателен договор, параметрите на настоящия се считат за
          постигнати, а задълженията на търговеца по настоящото за изпълнени.
        </Text>

        <Text style={s.p}>
          <Text style={s.bold}>Чл. 8</Text> Всяка кореспонденция между страните ще се счита за валидна, ако е изпратена
          на посочените по–горе електронни адреси. При тяхната промяна, страната, за която това се отнася е длъжна да
          уведоми другата страна в срок от три дни от настъпването й. При неизпълнение на това задължение всяка
          кореспонденция или съобщение между страните ще се счита за валидно връчена и извършена на посочените по–горе
          адреси и средства за комуникация.
        </Text>

        <Text style={s.p}>Настоящият договор се подписа в два еднообразни екземпляра, по един за всяка от страните.</Text>

        <View style={s.signRow}>
          <View style={s.signCol}>
            <Text style={s.bold}>ЗА ТЪРГОВЕЦА:</Text>
            <Text style={s.bold}>{c.manager.toUpperCase()}</Text>
            <Text>УПРАВИТЕЛ</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's <Image> draws into a PDF, it has no alt attribute */}
            {stampSrc ? <Image src={stampSrc} style={s.stamp} /> : null}
          </View>
          <View style={s.signCol}>
            <Text style={s.bold}>ЗА КЛИЕНТА:</Text>
          </View>
        </View>

        {/* The payment box the signed original carries at the foot. */}
        <View style={s.table}>
          <Text style={s.full}>Плащане: по банков път</Text>
          <Text style={[s.full, s.bold]}>Сума: {deposit?.amountInWords}</Text>
          <View style={s.tr}>
            <Text style={s.tKey}>Банка</Text>
            <Text style={s.tVal}>{c.bankName}</Text>
          </View>
          {d.bank?.swift ? (
            <View style={s.tr}>
              <Text style={s.tKey}>SWIFT/BIC</Text>
              <Text style={s.tVal}>{d.bank.swift}</Text>
            </View>
          ) : null}
          <View style={s.tr}>
            <Text style={s.tKey}>Сметка IBAN EURO</Text>
            <Text style={s.tVal}>{c.iban}</Text>
          </View>
          {d.bank?.paymentMethod ? (
            <View style={s.tr}>
              <Text style={s.tKey}>Вид плащане</Text>
              <Text style={s.tVal}>{d.bank.paymentMethod}</Text>
            </View>
          ) : null}
          <View style={s.trLast}>
            <Text style={s.tKey}>Основание</Text>
            <Text style={s.tVal}>Депозит № {d.number}</Text>
          </View>
        </View>

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}

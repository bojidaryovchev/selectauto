/**
 * ENCAR (Korea) factory-option dictionary — baked from AuctionsAPI `GET /api/korea-options`
 * (62 rows). Maps the numeric option codes stored in an ENCAR lot's
 * `raw_json.details.options.standard[]` to a human-readable name + section group.
 *
 * This is a near-static catalog (ENCAR's master factory-option list), so it is
 * baked into the repo rather than synced — no ingestion/infra change needed. The
 * per-car option CODES already arrive in `raw_json` via the normal /api/cars sync;
 * only this code→name lookup is new. Regenerate with
 * `scratchpad/gen-korea-options.mjs` if the upstream catalog ever changes.
 *
 * NOTE: only `options.standard[]` uses this 3-digit code space (≈91% decode). The
 * `options.choice[]` array uses a DIFFERENT 4–5-digit code space that this dictionary
 * does NOT cover — the named/priced extras there come through `options_extra[]` instead.
 */

export type KoreaOption = {
  /** 3-digit ENCAR option code (e.g. "001"). */
  code: string;
  /** English label ("Anti-lock brakes (ABS)"). */
  name: string;
  /** Original Korean label. */
  nameKo: string;
  /** Section code ("01".."04"). */
  section: string;
  /** Section label ("Safety" / "Exterior/Interior" / "Convenience/Multimedia" / "Seats"). */
  sectionName: string;
};

/** Section code → English section label. */
export const KOREA_OPTION_SECTIONS: Record<string, string> = {
  "01": "Exterior/Interior",
  "02": "Safety",
  "03": "Convenience/Multimedia",
  "04": "Seats",
};

/** The full option catalog, ordered by section then upstream sort. */
export const KOREA_OPTIONS: KoreaOption[] = [
  { code: "010", name: "sunroof", nameKo: "선루프", section: "01", sectionName: "Exterior/Interior" },
  { code: "029", name: "Headlamp (HID)", nameKo: "헤드램프(HID)", section: "01", sectionName: "Exterior/Interior" },
  { code: "075", name: "Headlamp (LED)", nameKo: "헤드램프(LED)", section: "01", sectionName: "Exterior/Interior" },
  { code: "059", name: "power electric trunk", nameKo: "파워 전동 트렁크", section: "01", sectionName: "Exterior/Interior" },
  { code: "080", name: "Ghost door closing", nameKo: "고스트 도어 클로징", section: "01", sectionName: "Exterior/Interior" },
  { code: "024", name: "Electric folding side mirror", nameKo: "전동접이 사이드 미러", section: "01", sectionName: "Exterior/Interior" },
  { code: "017", name: "aluminum wheel", nameKo: "알루미늄 휠", section: "01", sectionName: "Exterior/Interior" },
  { code: "062", name: "roof rack", nameKo: "루프랙", section: "01", sectionName: "Exterior/Interior" },
  { code: "082", name: "heated steering wheel", nameKo: "열선 스티어링 휠", section: "01", sectionName: "Exterior/Interior" },
  { code: "083", name: "power adjustable steering wheel", nameKo: "전동 조절 스티어링 휠", section: "01", sectionName: "Exterior/Interior" },
  { code: "084", name: "paddle shift", nameKo: "패들 시프트", section: "01", sectionName: "Exterior/Interior" },
  { code: "031", name: "steering wheel remote control", nameKo: "스티어링 휠 리모컨", section: "01", sectionName: "Exterior/Interior" },
  { code: "030", name: "ECM room mirror", nameKo: "ECM 룸미러", section: "01", sectionName: "Exterior/Interior" },
  { code: "074", name: "Hi pass", nameKo: "하이패스", section: "01", sectionName: "Exterior/Interior" },
  { code: "006", name: "power door lock", nameKo: "파워 도어록", section: "01", sectionName: "Exterior/Interior" },
  { code: "008", name: "power steering wheel", nameKo: "파워 스티어링 휠", section: "01", sectionName: "Exterior/Interior" },
  { code: "007", name: "power windows", nameKo: "파워 윈도우", section: "01", sectionName: "Exterior/Interior" },
  { code: "026", name: "Airbag (driver's seat)", nameKo: "에어백(운전석)", section: "02", sectionName: "Safety" },
  { code: "027", name: "Airbag (passenger seat)", nameKo: "에어백(동승석)", section: "02", sectionName: "Safety" },
  { code: "020", name: "Airbag (side)", nameKo: "에어백(사이드)", section: "02", sectionName: "Safety" },
  { code: "056", name: "Airbag (curtain)", nameKo: "에어백(커튼)", section: "02", sectionName: "Safety" },
  { code: "001", name: "Anti-lock brakes (ABS)", nameKo: "브레이크 잠김 방지(ABS)", section: "02", sectionName: "Safety" },
  { code: "019", name: "Non-slip (TCS)", nameKo: "미끄럼 방지(TCS)", section: "02", sectionName: "Safety" },
  { code: "055", name: "Stability control system (ESC)", nameKo: "차체자세 제어장치(ESC)", section: "02", sectionName: "Safety" },
  { code: "033", name: "Tire pressure sensor (TPMS)", nameKo: "타이어 공기압센서(TPMS)", section: "02", sectionName: "Safety" },
  { code: "088", name: "Lane Departure Warning System (LDWS)", nameKo: "차선이탈 경보 시스템(LDWS)", section: "02", sectionName: "Safety" },
  { code: "002", name: "Electronically controlled suspension (ECS)", nameKo: "전자제어 서스펜션(ECS)", section: "02", sectionName: "Safety" },
  { code: "085", name: "Parking sensor (front)", nameKo: "주차감지센서(전방)", section: "02", sectionName: "Safety" },
  { code: "032", name: "Parking sensor (rear)", nameKo: "주차감지센서(후방)", section: "02", sectionName: "Safety" },
  { code: "086", name: "Rear traffic warning system", nameKo: "후측방 경보 시스템", section: "02", sectionName: "Safety" },
  { code: "058", name: "rear camera", nameKo: "후방 카메라", section: "02", sectionName: "Safety" },
  { code: "087", name: "360 degree around view", nameKo: "360도 어라운드 뷰", section: "02", sectionName: "Safety" },
  { code: "068", name: "Cruise control (normal)", nameKo: "크루즈 컨트롤(일반)", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "079", name: "Cruise control (adaptive)", nameKo: "크루즈 컨트롤(어댑티브)", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "095", name: "Head-up display (HUD)", nameKo: "헤드업 디스플레이(HUD)", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "094", name: "Electronic parking brake (EPB)", nameKo: "전자식 주차브레이크(EPB)", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "023", name: "automatic air conditioner", nameKo: "자동 에어컨", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "057", name: "smart key", nameKo: "스마트키", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "015", name: "wireless door lock", nameKo: "무선도어 잠금장치", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "081", name: "Rain sensor", nameKo: "레인센서", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "097", name: "auto light", nameKo: "오토 라이트", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "092", name: "Curtain/Blind (rear seat)", nameKo: "커튼/블라인드(뒷좌석)", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "093", name: "Curtains/Blinds (rear)", nameKo: "커튼/블라인드(후방)", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "005", name: "navigation", nameKo: "내비게이션", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "004", name: "Front seat AV monitor", nameKo: "앞좌석 AV 모니터", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "054", name: "Rear seat AV monitor", nameKo: "뒷좌석 AV 모니터", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "096", name: "bluetooth", nameKo: "블루투스", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "003", name: "CD player", nameKo: "CD 플레이어", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "072", name: "USB terminal", nameKo: "USB 단자", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "071", name: "AUX terminal", nameKo: "AUX 단자", section: "03", sectionName: "Convenience/Multimedia" },
  { code: "014", name: "leather seat", nameKo: "가죽시트", section: "04", sectionName: "Seats" },
  { code: "021", name: "Electric seat (driver's seat)", nameKo: "전동시트(운전석)", section: "04", sectionName: "Seats" },
  { code: "035", name: "Electric seat (passenger seat)", nameKo: "전동시트(동승석)", section: "04", sectionName: "Seats" },
  { code: "089", name: "Electric seat (rear seat)", nameKo: "전동시트(뒷좌석)", section: "04", sectionName: "Seats" },
  { code: "022", name: "Heated seats (front seats)", nameKo: "열선시트(앞좌석)", section: "04", sectionName: "Seats" },
  { code: "063", name: "Heated seats (rear seats)", nameKo: "열선시트(뒷좌석)", section: "04", sectionName: "Seats" },
  { code: "051", name: "Memory seat (driver's seat)", nameKo: "메모리 시트(운전석)", section: "04", sectionName: "Seats" },
  { code: "078", name: "Memory seat (passenger seat)", nameKo: "메모리 시트(동승석)", section: "04", sectionName: "Seats" },
  { code: "034", name: "Ventilated seat (driver's seat)", nameKo: "통풍시트(운전석)", section: "04", sectionName: "Seats" },
  { code: "077", name: "Ventilated seat (passenger seat)", nameKo: "통풍시트(동승석)", section: "04", sectionName: "Seats" },
  { code: "090", name: "Ventilated seats (rear seats)", nameKo: "통풍시트(뒷좌석)", section: "04", sectionName: "Seats" },
  { code: "091", name: "massage sheet", nameKo: "마사지 시트", section: "04", sectionName: "Seats" },
];

/** code → KoreaOption lookup, built once at module load. */
export const KOREA_OPTION_BY_CODE: Record<string, KoreaOption> = Object.fromEntries(
  KOREA_OPTIONS.map((o) => [o.code, o]),
);

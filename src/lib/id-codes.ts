// Human-readable ID codes, composed at read time from the stable serials stored in the DB
// (unit_seq / instructor_seq / learner_seq / course_seq — see migration 20261028110000) plus a
// unit's CURRENT region + province. Composing instead of storing means editing a unit's province
// re-derives every child code consistently and no code string ever goes stale.
//
// Shapes (confirmed with the user 2026-10-28):
//   Unit    : <REGION>-<PROVINCE2>-<serial3>     e.g. NE-40-007   (region + province both visible)
//   Program : PG-<serial3>                        e.g. PG-001      (course catalog, shared across units)
//   Class   : <unitCode>-<batchCode>              e.g. NE-40-007-R001
//   Teacher : <unitCode>-T<serial2>               e.g. NE-40-007-T01   (carries its unit)
//   Student : <unitCode>-S<serial4>               e.g. NE-40-007-S0001 (carries its unit)

export type RegionCode = "north" | "northeast" | "east" | "central" | "south";

const REGION_CODE: Record<string, string> = {
  north: "N",
  northeast: "NE",
  east: "E",
  central: "C",
  south: "S",
  bangkok: "BKK",
};

// Thai province -> official 2-digit ADM code (รหัสจังหวัด มหาดไทย). Keyed by canonical Thai name;
// provinceCode() normalizes an incoming name (which comes from a Nominatim reverse-geocode and is
// user-editable) before lookup, falling back to "00" when it cannot be matched.
const PROVINCE_CODE: Record<string, string> = {
  กรุงเทพมหานคร: "10", สมุทรปราการ: "11", นนทบุรี: "12", ปทุมธานี: "13", พระนครศรีอยุธยา: "14",
  อ่างทอง: "15", ลพบุรี: "16", สิงห์บุรี: "17", ชัยนาท: "18", สระบุรี: "19",
  ชลบุรี: "20", ระยอง: "21", จันทบุรี: "22", ตราด: "23", ฉะเชิงเทรา: "24",
  ปราจีนบุรี: "25", นครนายก: "26", สระแก้ว: "27",
  นครราชสีมา: "30", บุรีรัมย์: "31", สุรินทร์: "32", ศรีสะเกษ: "33", อุบลราชธานี: "34",
  ยโสธร: "35", ชัยภูมิ: "36", อำนาจเจริญ: "37", บึงกาฬ: "38", หนองบัวลำภู: "39",
  ขอนแก่น: "40", อุดรธานี: "41", เลย: "42", หนองคาย: "43", มหาสารคาม: "44",
  ร้อยเอ็ด: "45", กาฬสินธุ์: "46", สกลนคร: "47", นครพนม: "48", มุกดาหาร: "49",
  เชียงใหม่: "50", ลำพูน: "51", ลำปาง: "52", อุตรดิตถ์: "53", แพร่: "54",
  น่าน: "55", พะเยา: "56", เชียงราย: "57", แม่ฮ่องสอน: "58",
  นครสวรรค์: "60", อุทัยธานี: "61", กำแพงเพชร: "62", ตาก: "63", สุโขทัย: "64",
  พิษณุโลก: "65", พิจิตร: "66", เพชรบูรณ์: "67",
  ราชบุรี: "70", กาญจนบุรี: "71", สุพรรณบุรี: "72", นครปฐม: "73", สมุทรสาคร: "74",
  สมุทรสงคราม: "75", เพชรบุรี: "76", ประจวบคีรีขันธ์: "77",
  นครศรีธรรมราช: "80", กระบี่: "81", พังงา: "82", ภูเก็ต: "83", สุราษฎร์ธานี: "84",
  ระนอง: "85", ชุมพร: "86",
  สงขลา: "90", สตูล: "91", ตรัง: "92", พัทลุง: "93", ปัตตานี: "94",
  ยะลา: "95", นราธิวาส: "96",
};

const pad = (n: number, width: number) => String(n).padStart(width, "0");

export function regionCode(region: string | null | undefined): string {
  return (region && REGION_CODE[region]) || "XX";
}

export function provinceCode(provinceName: string | null | undefined): string {
  if (!provinceName) return "00";
  const key = provinceName.replace(/^จังหวัด\s*/, "").trim();
  return PROVINCE_CODE[key] ?? "00";
}

/** Inputs needed to compose a unit's code: its region, its (editable) province name, and its serial. */
export type UnitCodeParts = {
  region: string | null | undefined;
  provinceName: string | null | undefined;
  unitSeq: number | null | undefined;
};

export function unitCode(parts: UnitCodeParts): string | null {
  if (parts.unitSeq == null) return null;
  return `${regionCode(parts.region)}-${provinceCode(parts.provinceName)}-${pad(parts.unitSeq, 3)}`;
}

export function programCode(courseSeq: number | null | undefined): string | null {
  return courseSeq == null ? null : `PG-${pad(courseSeq, 3)}`;
}

export function classCode(unitCodeStr: string | null, batchCode: string | null | undefined): string | null {
  if (!unitCodeStr || !batchCode) return batchCode ?? null;
  return `${unitCodeStr}-${batchCode}`;
}

export function teacherCode(unitCodeStr: string | null, instructorSeq: number | null | undefined): string | null {
  if (!unitCodeStr || instructorSeq == null) return null;
  return `${unitCodeStr}-T${pad(instructorSeq, 2)}`;
}

export function studentCode(unitCodeStr: string | null, learnerSeq: number | null | undefined): string | null {
  if (!unitCodeStr || learnerSeq == null) return null;
  return `${unitCodeStr}-S${pad(learnerSeq, 4)}`;
}

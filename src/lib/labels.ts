export const UNIT_TYPE_LABEL: Record<string, string> = {
  university: "มหาวิทยาลัย",
  vocational: "สถาบันอาชีวะ",
  other: "อื่นๆ",
};

export const REGION_LABEL: Record<string, string> = {
  north: "ภาคเหนือ",
  northeast: "ภาคตะวันออกเฉียงเหนือ",
  central: "ภาคกลาง",
  south: "ภาคใต้",
  east: "ภาคตะวันออก",
  bangkok: "กรุงเทพมหานคร",
};

// Fixed display order for region breakdowns on the dashboard (เหนือ อีสาน กลาง ใต้ ตะวันออก กทม.).
export const REGION_ORDER = ["north", "northeast", "central", "south", "east", "bangkok"] as const;

// Decorative dot colors for the per-region breakdown lists (always paired with a text label, so
// never color-alone). Drawn from the data-viz reference palette's light steps.
export const REGION_COLOR: Record<string, string> = {
  north: "#2a78d6",
  northeast: "#eb6834",
  central: "#eda100",
  south: "#4a3aa7",
  east: "#1baf7a",
  bangkok: "#e87ba4",
};

export const ROLE_LABEL: Record<string, string> = {
  web_master: "Web Master",
  central_staff: "Central Staff",
  unit_coordinator: "Unit Coordinator",
  executive: "Executive",
};

export const ASSESSMENT_STANDARD_LABEL: Record<string, string> = {
  dsd_l1: "มาตรฐานฝีมือแรงงาน DSD ระดับ 1",
  anamai_food_handler: "กรมอนามัย — ผู้ประกอบอาหาร",
  anamai_food_contact: "กรมอนามัย — ผู้สัมผัสอาหาร",
  professional_qualification: "คุณวุฒิวิชาชีพ",
  other: "อื่นๆ",
};

export const ASSESSMENT_RESULT_LABEL: Record<string, string> = {
  passed: "ได้",
  failed: "ไม่ได้",
  pending: "รอผล",
};

export const TESTING_CENTER_STATUS_LABEL: Record<string, string> = {
  not_registered: "ยังไม่ขึ้นทะเบียน",
  in_progress: "อยู่ระหว่างขอ",
  registered: "ได้รับแล้ว",
};

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

// Fiscal-year participation ("รอบยืนยันการเข้าร่วมรายปีงบประมาณ")
export const PARTICIPATION_STATUS_LABEL: Record<string, string> = {
  invited: "ยังไม่ตอบรับ",
  confirmed: "ยืนยันเข้าร่วม",
  declined: "ขอไม่เข้าร่วม",
};

export const ROUND_STATUS_LABEL: Record<string, string> = {
  open: "เปิดรับยืนยัน",
  closed: "ปิดรอบแล้ว",
};

// Class (ชั้นเรียน/รุ่นฝึกอบรม) descriptive enums — stored as ascii codes, shown in Thai.
export const CLASS_MODE_LABEL: Record<string, string> = {
  onsite: "เรียนในสถานที่",
  online: "เรียนออนไลน์",
  hybrid: "ผสม (ในสถานที่ + ออนไลน์)",
};

export const CLASS_STATUS_LABEL: Record<string, string> = {
  planned: "วางแผน",
  open: "เปิดรับสมัคร",
  ongoing: "กำลังอบรม",
  completed: "จบแล้ว",
  cancelled: "ยกเลิก",
};

export const CLASS_STATUS_PILL: Record<string, string> = {
  planned: "muted",
  open: "pending",
  ongoing: "study",
  completed: "done",
  cancelled: "fail",
};

// Enrollment status (per learner within a class)
export const ENROLL_STATUS_LABEL: Record<string, string> = {
  applied: "สมัคร",
  attending: "เข้าร่วม",
  completed: "สำเร็จ",
  failed: "ไม่สำเร็จ",
};

export const ENROLL_STATUS_PILL: Record<string, string> = {
  applied: "pending",
  attending: "study",
  completed: "done",
  failed: "fail",
};

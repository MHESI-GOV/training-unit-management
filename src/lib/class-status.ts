// Class/รุ่น status is DERIVED from its dates, never stored/edited (per user 2026-10-28). Exactly
// three states based on today vs. the class's start/end dates:
//   รับสมัคร       — ยังไม่ถึงวันเรียนวันแรก (today < start_date)
//   อยู่ระหว่างเรียน — ถึงวันเริ่มเรียนแล้ว แต่ยังไม่เลยวันสุดท้าย (start_date ≤ today ≤ end_date)
//   เสร็จสิ้น       — เลยวันสุดท้ายของการฝึกอบรม (today > end_date)
export type ClassStatusCode = "open" | "ongoing" | "completed";

export const CLASS_STATUS_DISPLAY: Record<ClassStatusCode, { label: string; pill: string }> = {
  open: { label: "รับสมัคร", pill: "pending" },
  ongoing: { label: "อยู่ระหว่างเรียน", pill: "study" },
  completed: { label: "เสร็จสิ้น", pill: "done" },
};

// ISO date (YYYY-MM-DD) in local time — class dates are stored as plain dates, so compare date-only.
function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeClassStatus(startDate: string | null, endDate: string | null, today = new Date()): ClassStatusCode {
  const t = localIsoDate(today);
  if (startDate && t < startDate) return "open";
  if (endDate && t > endDate) return "completed";
  return "ongoing";
}

export function classStatusDisplay(startDate: string | null, endDate: string | null, today = new Date()) {
  return CLASS_STATUS_DISPLAY[computeClassStatus(startDate, endDate, today)];
}

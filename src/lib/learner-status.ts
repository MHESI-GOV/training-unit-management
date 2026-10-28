// A learner's status follows their class's timeline, collapsed to exactly 3 states (per user
// 2026-10-28): ถอนตัว (manual withdrawal) overrides everything; otherwise it mirrors whether the
// class has ended — เรียนเสร็จแล้ว once past the last day, อยู่ระหว่างเรียน before that (this folds the
// class's "รับสมัคร" state into "อยู่ระหว่างเรียน", since a learner has no separate "สมัคร" state).
// Pass/fail of the course is a separate RESULT (the ผ่านเกณฑ์ checkbox / certificate), not a status.
export type LearnerStatusCode = "in_progress" | "finished" | "withdrawn";

export const LEARNER_STATUS_DISPLAY: Record<LearnerStatusCode, { label: string; pill: string }> = {
  in_progress: { label: "อยู่ระหว่างเรียน", pill: "study" },
  finished: { label: "เรียนเสร็จแล้ว", pill: "done" },
  withdrawn: { label: "ถอนตัว", pill: "muted" },
};

function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeLearnerStatus(
  enrollmentStatus: string | null,
  classEndDate: string | null,
  today = new Date(),
): LearnerStatusCode {
  if (enrollmentStatus === "withdrawn") return "withdrawn";
  if (classEndDate && localIsoDate(today) > classEndDate) return "finished";
  return "in_progress";
}

export function learnerStatusDisplay(enrollmentStatus: string | null, classEndDate: string | null, today = new Date()) {
  return LEARNER_STATUS_DISPLAY[computeLearnerStatus(enrollmentStatus, classEndDate, today)];
}

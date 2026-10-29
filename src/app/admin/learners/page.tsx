import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { AppShell } from "@/components/layout/AppShell";
import { loadAllLearners } from "@/app/unit/learners/load-learners";
import { AllLearnersTable } from "./all-learners-table";

// Cross-unit learner database — Web Master / Central Staff only (staff-gated by requireStaffProfile,
// RLS also restricts rows to what the caller may read, which for these roles is all units).
export default async function AllLearnersPage() {
  const profile = await requireStaffProfile();
  const data = await loadAllLearners();

  return (
    <AppShell profile={profile} active="all-learners" eyebrow="ฐานข้อมูลผู้เรียน" title="ฐานข้อมูลผู้เรียนทุกหน่วย">
      <p className="footnote" style={{ marginBottom: 18 }}>
        ตรวจสอบผู้เรียนข้ามทุกหน่วยฝึกอบรม — ค้นด้วยเลขบัตรประชาชน 13 หลักเพื่อดูว่าเรียนที่หน่วยไหน รุ่นอะไร
        ปีงบไหน หรือกรองตามหน่วย/ปีงบ/สถานะ/มาตรฐาน แล้วส่งออกเป็นไฟล์ Excel (CSV) ได้
      </p>
      <AllLearnersTable
        learners={data.rows}
        units={data.units}
        standards={data.standardOptions}
        fiscalYears={data.fiscalYearOptions}
      />
    </AppShell>
  );
}

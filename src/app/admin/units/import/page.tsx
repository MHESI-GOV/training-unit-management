import Link from "next/link";
import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { AppShell } from "@/components/layout/AppShell";
import { ImportUnitsClient } from "./import-units-client";

// Bulk-create training units from a CSV/xlsx (round 12) — for the ~72 units that already operated.
// WM/Central Staff only (requireStaffProfile). Assigning coordinators + participation is done
// afterward from each unit's data-sheet.
export default async function ImportUnitsPage() {
  const profile = await requireStaffProfile();

  return (
    <AppShell profile={profile} active="units" eyebrow="นำเข้าข้อมูล" title="นำเข้าหน่วยฝึกอบรมจากไฟล์">
      <p style={{ marginBottom: 14 }}>
        <Link href="/admin/units">← กลับไปหน่วยฝึกอบรมทั้งหมด</Link>
      </p>
      <p className="footnote" style={{ marginBottom: 20 }}>
        สร้างหลายหน่วยพร้อมกัน — รายละเอียดอื่น (รูป / ผู้ดูแล / ชั้นเรียน / ผู้เรียน) เพิ่มทีหลังได้จากหน้าข้อมูลของแต่ละหน่วย
      </p>
      <ImportUnitsClient />
    </AppShell>
  );
}

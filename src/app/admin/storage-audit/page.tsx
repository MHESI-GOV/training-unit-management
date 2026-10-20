import { requireWebMaster } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { CheckNowButton } from "./check-now-button";
import { DeleteOrphanButton } from "./delete-orphan-button";

export default async function StorageAuditPage() {
  const profile = await requireWebMaster();

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("storage_orphan_reports")
    .select("report_id, checked_at, orphan_keys, orphan_count")
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <AppShell profile={profile} active="storage-audit" eyebrow="ผู้ดูแลระบบสูงสุด" title="ไฟล์ภาพกำพร้า (Unit Photos)">
      <p className="footnote" style={{ marginBottom: 16 }}>
        ตรวจสอบ storage object ใน bucket unit-photos ที่ไม่มี record อ้างอิงใน training_unit_images
        — ไม่มีการลบอัตโนมัติ ต้องกดลบทีละไฟล์หลังตรวจสอบเองเท่านั้น (ตามแผนใน
        docs/planning/10-image-storage-options.md §3) ระบบจะตรวจอัตโนมัติทุกสัปดาห์ด้วย
      </p>

      <CheckNowButton />

      {!report && <p className="footnote" style={{ marginTop: 16 }}>ยังไม่มีการตรวจสอบ</p>}

      {report && (
        <div className="card" style={{ marginTop: 16 }}>
          <p>
            ตรวจสอบล่าสุด: {new Date(report.checked_at).toLocaleString("th-TH")} — พบไฟล์กำพร้า{" "}
            <strong>{report.orphan_count}</strong> ไฟล์
          </p>

          {report.orphan_keys.length === 0 && <p className="pill done" style={{ marginTop: 10 }}>ไม่พบไฟล์กำพร้า</p>}

          {report.orphan_keys.length > 0 && (
            <ul style={{ marginTop: 14, display: "grid", gap: 10, listStyle: "none" }}>
              {report.orphan_keys.map((key) => (
                <li key={key} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 13 }}>{key}</span>
                  <DeleteOrphanButton reportId={report.report_id} storageKey={key} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AppShell>
  );
}

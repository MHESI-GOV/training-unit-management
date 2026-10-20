import { requireWebMaster } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { CheckNowButton } from "./check-now-button";
import { DeleteOrphanButton } from "./delete-orphan-button";

export default async function StorageAuditPage() {
  await requireWebMaster();

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("storage_orphan_reports")
    .select("report_id, checked_at, orphan_keys, orphan_count")
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main style={{ maxWidth: 700, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>ไฟล์ภาพกำพร้า (Unit Photos)</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        ตรวจสอบ storage object ใน bucket unit-photos ที่ไม่มี record อ้างอิงใน training_unit_images
        — ไม่มีการลบอัตโนมัติ ต้องกดลบทีละไฟล์หลังตรวจสอบเองเท่านั้น (ตามแผนใน
        docs/planning/10-image-storage-options.md §3) ระบบจะตรวจอัตโนมัติทุกสัปดาห์ด้วย
      </p>

      <CheckNowButton />

      {!report && <p style={{ marginTop: 16 }}>ยังไม่มีการตรวจสอบ</p>}

      {report && (
        <div style={{ marginTop: 16 }}>
          <p>
            ตรวจสอบล่าสุด: {new Date(report.checked_at).toLocaleString("th-TH")} — พบไฟล์กำพร้า{" "}
            {report.orphan_count} ไฟล์
          </p>

          {report.orphan_keys.length === 0 && <p style={{ color: "green" }}>ไม่พบไฟล์กำพร้า</p>}

          {report.orphan_keys.length > 0 && (
            <ul>
              {report.orphan_keys.map((key) => (
                <li key={key} style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 13 }}>{key}</span>
                  <DeleteOrphanButton reportId={report.report_id} storageKey={key} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}

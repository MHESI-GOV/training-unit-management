import { requireWebMaster } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { formatThaiDateTime } from "@/lib/date-format";

export default async function AuditLogPage() {
  const profile = await requireWebMaster();

  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from("audit_log")
    .select("log_id, action, entity_type, record_id, changed_fields, occurred_at, profiles(display_name)")
    .order("occurred_at", { ascending: false })
    .limit(200);

  return (
    <AppShell profile={profile} active="audit" eyebrow="ผู้ดูแลระบบสูงสุด" title="Audit Log">
      <p className="footnote" style={{ marginBottom: 20 }}>
        เฉพาะ Web Master เท่านั้นที่เข้าถึงหน้านี้ได้ — ไม่เก็บค่า PII เดิม/ใหม่แบบเต็ม
      </p>

      {error && <p className="notice error">โหลดไม่สำเร็จ: {error.message}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ผู้กระทำ</th>
              <th>การกระทำ</th>
              <th>ประเภท</th>
              <th>รหัสอ้างอิง</th>
              <th>ฟิลด์ที่เปลี่ยน</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.log_id}>
                <td>{formatThaiDateTime(log.occurred_at)}</td>
                <td>{log.profiles?.display_name ?? "—"}</td>
                <td>{log.action}</td>
                <td>{log.entity_type}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{log.record_id}</td>
                <td>{log.changed_fields?.join(", ") ?? "—"}</td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)" }}>
                  ยังไม่มีรายการ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

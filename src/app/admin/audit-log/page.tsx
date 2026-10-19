import { requireWebMaster } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";

export default async function AuditLogPage() {
  await requireWebMaster();

  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from("audit_log")
    .select("log_id, action, entity_type, record_id, changed_fields, occurred_at, profiles(display_name)")
    .order("occurred_at", { ascending: false })
    .limit(200);

  return (
    <main style={{ maxWidth: 900, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>Audit Log</h1>
      <p style={{ color: "#666", fontSize: 13 }}>
        เฉพาะ Web Master เท่านั้นที่เข้าถึงหน้านี้ได้ — ไม่เก็บค่า PII เดิม/ใหม่แบบเต็ม
      </p>

      {error && <p style={{ color: "crimson" }}>โหลดไม่สำเร็จ: {error.message}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
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
            <tr key={log.log_id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{new Date(log.occurred_at).toLocaleString("th-TH")}</td>
              <td>{log.profiles?.display_name ?? "—"}</td>
              <td>{log.action}</td>
              <td>{log.entity_type}</td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{log.record_id}</td>
              <td>{log.changed_fields?.join(", ") ?? "—"}</td>
            </tr>
          ))}
          {(logs ?? []).length === 0 && (
            <tr>
              <td colSpan={6}>ยังไม่มีรายการ</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

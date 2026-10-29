import { requireWebMaster } from "@/lib/auth/require-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/layout/AppShell";
import { ROLE_LABEL } from "@/lib/labels";
import { formatThaiDateTime } from "@/lib/date-format";
import { GenerateUserDialog } from "./generate-user-dialog";
import { AccountRow } from "./account-admin";
import { approveEmailChange, rejectEmailChange } from "./actions";

export default async function UserManagementPage() {
  const profile = await requireWebMaster();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authList }, { data: pending }] = await Promise.all([
    admin.from("profiles").select("id, role, unit_scope, display_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin
      .from("email_change_requests")
      .select("request_id, user_id, current_email, requested_email, requested_at")
      .eq("status", "pending")
      .order("requested_at", { ascending: true }),
  ]);

  const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? "-"]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "-"]));
  const bannedById = new Map(
    (authList?.users ?? []).map((u) => {
      const bu = (u as { banned_until?: string | null }).banned_until;
      return [u.id, !!bu && new Date(bu).getTime() > Date.now()];
    }),
  );

  const sortedProfiles = (profiles ?? []).slice().sort((a, b) =>
    (ROLE_LABEL[a.role] ?? a.role).localeCompare(ROLE_LABEL[b.role] ?? b.role),
  );

  return (
    <AppShell profile={profile} active="users" eyebrow="ผู้ดูแลระบบสูงสุด" title="User Management">
      <div style={{ display: "grid", gap: 20 }}>
        {pending && pending.length > 0 && (
          <section className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>คำขอเปลี่ยนอีเมล (รออนุมัติ) · {pending.length}</h2>
            <div style={{ marginTop: 14, display: "grid", gap: 16 }}>
              {pending.map((r) => (
                <div key={r.request_id} style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <p style={{ fontWeight: 600 }}>{nameById.get(r.user_id) ?? "-"}</p>
                  <p className="footnote">
                    {r.current_email} → <strong>{r.requested_email}</strong>
                  </p>
                  <p className="footnote">ส่งเมื่อ {formatThaiDateTime(r.requested_at)}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                    <form action={approveEmailChange}>
                      <input type="hidden" name="request_id" value={r.request_id} />
                      <button type="submit" className="btn primary">อนุมัติ</button>
                    </form>
                    <form action={rejectEmailChange} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="hidden" name="request_id" value={r.request_id} />
                      <input name="reason" placeholder="เหตุผล (ถ้าปฏิเสธ)" className="field" style={{ maxWidth: 220 }} />
                      <button type="submit" className="btn danger">ปฏิเสธ</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>บัญชีทั้งหมด ({sortedProfiles.length})</h2>
              <p className="footnote" style={{ marginTop: 4 }}>
                จัดการบัญชีผู้ใช้ — เปลี่ยนอีเมล / รีเซ็ตรหัสผ่าน / ปิด-เปิดใช้งาน (ไม่มีการลบถาวร เพื่อคงข้อมูลและประวัติ)
              </p>
            </div>
            <GenerateUserDialog />
          </div>

          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "10px" }}>หน่วยงาน</th>
                  <th style={{ padding: "10px" }}>Email (ใช้เข้าระบบ)</th>
                  <th style={{ padding: "10px" }}>สถานะบัญชี</th>
                  <th style={{ padding: "10px" }}>บทบาท (role)</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>รีเซ็ตรหัส</th>
                </tr>
              </thead>
              <tbody>
                {sortedProfiles.map((p) => (
                  <AccountRow
                    key={p.id}
                    userId={p.id}
                    name={p.display_name ?? "-"}
                    email={emailById.get(p.id) ?? "-"}
                    roleRaw={p.role}
                    disabled={bannedById.get(p.id) ?? false}
                    isSelf={p.id === profile.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

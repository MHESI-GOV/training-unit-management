import { requireWebMaster } from "@/lib/auth/require-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/layout/AppShell";
import { ROLE_LABEL } from "@/lib/labels";
import { GenerateUserDialog } from "./generate-user-dialog";
import { AccountAdminActions } from "./account-admin";
import { approveEmailChange, rejectEmailChange } from "./actions";

export default async function UserManagementPage() {
  const profile = await requireWebMaster();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: authList }, { data: pending }, { data: units }] = await Promise.all([
    admin.from("profiles").select("id, role, unit_scope, display_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin
      .from("email_change_requests")
      .select("request_id, user_id, current_email, requested_email, requested_at")
      .eq("status", "pending")
      .order("requested_at", { ascending: true }),
    admin.from("training_units").select("unit_id, name"),
  ]);

  const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? "-"]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "-"]));
  const unitNameById = new Map((units ?? []).map((u) => [u.unit_id, u.name]));
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
                  <p className="footnote">ส่งเมื่อ {new Date(r.requested_at).toLocaleString("th-TH")}</p>
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px 10px" }}>ชื่อ</th>
                  <th style={{ padding: "8px 10px" }}>อีเมล</th>
                  <th style={{ padding: "8px 10px" }}>บทบาท</th>
                  <th style={{ padding: "8px 10px" }}>หน่วย</th>
                  <th style={{ padding: "8px 10px" }}>สถานะ</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {sortedProfiles.map((p) => {
                  const email = emailById.get(p.id) ?? "-";
                  const isSelf = p.id === profile.id;
                  const banned = bannedById.get(p.id) ?? false;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{p.display_name ?? "-"}</td>
                      <td style={{ padding: "8px 10px" }} className="footnote">{email}</td>
                      <td style={{ padding: "8px 10px" }}>{ROLE_LABEL[p.role] ?? p.role}</td>
                      <td style={{ padding: "8px 10px" }} className="footnote">
                        {p.unit_scope ? unitNameById.get(p.unit_scope) ?? p.unit_scope : "—"}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span className={`pill ${banned ? "muted" : "done"}`}>
                          {banned ? "ปิดใช้งาน" : "ใช้งานอยู่"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                        {isSelf ? (
                          <span className="footnote">บัญชีของคุณ (จัดการที่ &quot;บัญชีของฉัน&quot;)</span>
                        ) : (
                          <AccountAdminActions
                            userId={p.id}
                            currentEmail={email}
                            disabled={banned}
                            canDisable={p.role !== "web_master"}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

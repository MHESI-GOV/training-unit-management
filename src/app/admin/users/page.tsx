import { requireWebMaster } from "@/lib/auth/require-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/layout/AppShell";
import { ROLE_LABEL } from "@/lib/labels";
import { GenerateUserForm } from "./generate-user-form";
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

  const sortedProfiles = (profiles ?? []).slice().sort((a, b) =>
    (ROLE_LABEL[a.role] ?? a.role).localeCompare(ROLE_LABEL[b.role] ?? b.role),
  );

  return (
    <AppShell profile={profile} active="users" eyebrow="ผู้ดูแลระบบสูงสุด" title="User Management">
      <div style={{ display: "grid", gap: 20 }}>
        <section className="card" style={{ maxWidth: 480 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Generate User</h2>
          <div style={{ marginTop: 14 }}>
            <GenerateUserForm />
          </div>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>
            คำขอเปลี่ยนอีเมล (รออนุมัติ){pending && pending.length > 0 ? ` · ${pending.length}` : ""}
          </h2>
          {!pending || pending.length === 0 ? (
            <p className="footnote" style={{ marginTop: 10 }}>ไม่มีคำขอที่รออนุมัติ</p>
          ) : (
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
          )}
        </section>

        <section className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>บัญชีทั้งหมด ({sortedProfiles.length})</h2>
          <p className="footnote" style={{ marginTop: 6 }}>
            ใช้ &quot;เปลี่ยนอีเมล&quot; เมื่อมีการเปลี่ยนตัวผู้ประสานงาน (ส่งมอบหน่วยเดิม) — ข้อมูลของหน่วยจะยังอยู่ครบ
            และผู้ใช้คนเดิมจะเข้าระบบด้วยอีเมลเก่าไม่ได้อีก
          </p>
          <div style={{ marginTop: 14, display: "grid", gap: 18 }}>
            {sortedProfiles.map((p) => {
              const email = emailById.get(p.id) ?? "-";
              return (
                <div key={p.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "grid", gap: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{p.display_name ?? "-"}</p>
                    <p className="footnote">{email}</p>
                    <p className="footnote">
                      บทบาท: {ROLE_LABEL[p.role] ?? p.role}
                      {p.unit_scope ? ` · หน่วย: ${unitNameById.get(p.unit_scope) ?? p.unit_scope}` : ""}
                    </p>
                  </div>
                  {p.id === profile.id ? (
                    <p className="footnote">(บัญชีของคุณเอง — จัดการที่หน้า &quot;บัญชีของฉัน&quot;)</p>
                  ) : (
                    <AccountAdminActions userId={p.id} currentEmail={email} />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

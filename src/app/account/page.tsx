import { requireProfile } from "@/lib/auth/require-profile";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getAvatarUrl } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ROLE_LABEL } from "@/lib/labels";
import { ChangePasswordForm, EmailChangeForm } from "./account-forms";
import { AvatarUploader } from "./avatar-uploader";
import { Collapsible } from "./collapsible";
import { cancelEmailRequest } from "./actions";
import { UnitProfilePanel } from "@/app/unit/profile/unit-profile-panel";

export default async function AccountPage() {
  const profile = await requireProfile();
  const { email } = await getCurrentProfile();
  const avatarUrl = await getAvatarUrl(profile.avatar_path);

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("email_change_requests")
    .select("request_id, requested_email, requested_at")
    .eq("user_id", profile.id)
    .eq("status", "pending")
    .maybeSingle();

  const mustChange = profile.must_change_password;
  const initial = (profile.display_name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <AppShell profile={profile} active="account" eyebrow="บัญชีของฉัน" title="การตั้งค่าบัญชี">
      <div style={{ display: "grid", gap: 20, maxWidth: 680 }}>
        {mustChange && (
          <p className="notice" style={{ background: "#fff3da", color: "#76520c", border: "1px solid #f0d9a6" }}>
            นี่เป็นการเข้าสู่ระบบด้วยรหัสผ่านชั่วคราว — กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งานระบบต่อ
          </p>
        )}

        <section className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>รูปโปรไฟล์</h2>
          <AvatarUploader avatarUrl={avatarUrl} initial={initial} />
        </section>

        <section className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>ข้อมูลบัญชี</h2>
          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
            <p className="footnote">ชื่อผู้ใช้: <strong>{profile.display_name ?? "-"}</strong></p>
            <p className="footnote">บทบาท: <strong>{ROLE_LABEL[profile.role] ?? profile.role}</strong></p>
            <p className="footnote">อีเมลเข้าสู่ระบบ: <strong>{email ?? "-"}</strong></p>
          </div>
        </section>

        {profile.role === "unit_coordinator" && profile.unit_scope && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 14px" }}>โปรไฟล์หน่วยฝึก</h2>
            <UnitProfilePanel unitId={profile.unit_scope} />
          </div>
        )}

        <Collapsible title="เปลี่ยนรหัสผ่าน" openLabel="เปลี่ยนรหัสผ่าน">
          <ChangePasswordForm />
        </Collapsible>

        {pending ? (
          <section className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>เปลี่ยนอีเมลเข้าสู่ระบบ</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <p className="pill pending">รออนุมัติ: {pending.requested_email}</p>
              <p className="footnote">
                ส่งคำขอเมื่อ {new Date(pending.requested_at).toLocaleString("th-TH")} — รอผู้ดูแลระบบสูงสุดอนุมัติ
              </p>
              <form action={cancelEmailRequest}>
                <input type="hidden" name="request_id" value={pending.request_id} />
                <button type="submit" className="btn secondary">ยกเลิกคำขอ</button>
              </form>
            </div>
          </section>
        ) : (
          <Collapsible title="เปลี่ยนอีเมลเข้าสู่ระบบ" openLabel="เปลี่ยนอีเมล">
            <EmailChangeForm currentEmail={email} />
          </Collapsible>
        )}
      </div>
    </AppShell>
  );
}

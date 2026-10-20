import { requireWebMaster } from "@/lib/auth/require-profile";
import { AppShell } from "@/components/layout/AppShell";
import { GenerateUserForm } from "./generate-user-form";

export default async function UserManagementPage() {
  const profile = await requireWebMaster();

  return (
    <AppShell profile={profile} active="users" eyebrow="ผู้ดูแลระบบสูงสุด" title="User Management">
      <section className="card" style={{ maxWidth: 480 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Generate User</h2>
        <div style={{ marginTop: 14 }}>
          <GenerateUserForm />
        </div>
      </section>
    </AppShell>
  );
}

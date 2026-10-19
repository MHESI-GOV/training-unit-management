import { requireWebMaster } from "@/lib/auth/require-profile";
import { GenerateUserForm } from "./generate-user-form";

export default async function UserManagementPage() {
  await requireWebMaster();

  return (
    <main style={{ maxWidth: 560, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>User Management</h1>
      <h2>Generate User</h2>
      <GenerateUserForm />
    </main>
  );
}

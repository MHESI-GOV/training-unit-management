import { AuthCard } from "./AuthCard";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: 20,
      }}
    >
      <AuthCard title={title} subtitle={subtitle}>
        {children}
      </AuthCard>
    </div>
  );
}

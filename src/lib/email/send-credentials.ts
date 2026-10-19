import "server-only";
import { Resend } from "resend";

export async function sendCredentialsEmail(params: {
  to: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  // DNS access for mhesi.go.th is unconfirmed (docs/planning/13-risk-register.md R16) — until
  // RESEND_API_KEY/EMAIL_FROM are configured, Generate User falls back to on-screen display.
  if (!apiKey || !from) {
    return { sent: false, reason: "email_not_configured" };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: "บัญชีผู้ใช้ระบบจัดการหน่วยฝึกอบรม",
    text: [
      `สร้างบัญชีผู้ใช้สำเร็จ`,
      ``,
      `Username: ${params.username}`,
      `รหัสผ่านชั่วคราว: ${params.temporaryPassword}`,
      ``,
      `เข้าสู่ระบบที่: ${params.loginUrl}`,
      `กรุณาเปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบครั้งแรก`,
    ].join("\n"),
  });

  if (error) {
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

import "server-only";
import nodemailer from "nodemailer";

export async function sendCredentialsEmail(params: {
  to: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  // Until GMAIL_USER/GMAIL_APP_PASSWORD are configured, Generate User falls back to
  // on-screen display -- same fallback this app has always had, just via Gmail SMTP now
  // instead of Resend (Resend can't verify a gmail.com "from" address since that domain's
  // DNS isn't the user's to control).
  if (!user || !appPassword) {
    return { sent: false, reason: "email_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  try {
    await transporter.sendMail({
      from: user,
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
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : "send failed" };
  }

  return { sent: true };
}

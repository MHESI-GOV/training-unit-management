import "server-only";
import nodemailer from "nodemailer";

// Notice emailed to each unit coordinator when Web Master opens (or re-sends) a fiscal-year
// participation round, asking them to confirm the unit's participation that year. Same Gmail-SMTP
// transport + on-screen fallback philosophy as send-credentials.ts — if email isn't configured the
// caller just relies on the in-app banner/nav prompt instead.
export async function sendParticipationNotice(params: {
  to: string;
  fiscalYear: number;
  deadline?: string | null;
  noticeMessage?: string | null;
  loginUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    return { sent: false, reason: "email_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  const lines = [
    `ขอเชิญยืนยันการเข้าร่วมโครงการ ประจำปีงบประมาณ ${params.fiscalYear}`,
    ``,
    params.noticeMessage ? params.noticeMessage : null,
    params.noticeMessage ? `` : null,
    params.deadline ? `กรุณายืนยันภายในวันที่ ${params.deadline}` : null,
    `โปรดเข้าสู่ระบบเพื่อยืนยันการเข้าร่วม: ${params.loginUrl}/unit/participation`,
  ].filter((l): l is string => l !== null);

  try {
    await transporter.sendMail({
      from: user,
      to: params.to,
      subject: `ยืนยันการเข้าร่วมโครงการ ปีงบประมาณ ${params.fiscalYear}`,
      text: lines.join("\n"),
    });
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : "send failed" };
  }

  return { sent: true };
}

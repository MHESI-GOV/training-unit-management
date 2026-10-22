"use server";

import { revalidatePath } from "next/cache";
import { requireWebMaster } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendParticipationNotice } from "@/lib/email/send-participation-notice";

const loginUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://training-unit-management.vercel.app";

// Email a participation notice to each coordinator whose unit is in the round. When
// onlyPending is true, only units still 'invited' (not yet responded) are notified — used by
// the "ส่ง Notice ซ้ำ" / sync action. Best-effort: returns how many were actually sent.
async function notifyRoundCoordinators(
  roundId: string,
  fiscalYear: number,
  deadline: string | null,
  notice: string | null,
  onlyPending: boolean,
): Promise<{ sent: number; total: number }> {
  const admin = createAdminClient();

  let partQ = admin
    .from("unit_participation")
    .select("unit_id, status")
    .eq("round_id", roundId);
  if (onlyPending) partQ = partQ.eq("status", "invited");
  const { data: parts } = await partQ;
  const unitIds = new Set((parts ?? []).map((p) => p.unit_id));
  if (unitIds.size === 0) return { sent: 0, total: 0 };

  const { data: coords } = await admin
    .from("profiles")
    .select("id, unit_scope")
    .eq("role", "unit_coordinator")
    .not("unit_scope", "is", null);

  const targetUserIds = (coords ?? [])
    .filter((c) => c.unit_scope && unitIds.has(c.unit_scope))
    .map((c) => c.id);
  if (targetUserIds.length === 0) return { sent: 0, total: 0 };

  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  let sent = 0;
  for (const uid of targetUserIds) {
    const email = emailById.get(uid);
    if (!email) continue;
    const res = await sendParticipationNotice({
      to: email,
      fiscalYear,
      deadline,
      noticeMessage: notice,
      loginUrl,
    });
    if (res.sent) sent += 1;
  }
  return { sent, total: targetUserIds.length };
}

export type OpenRoundState = {
  error?: string;
  result?: { fiscalYear: number; invited: number; emailsSent: number; emailTotal: number };
};

export async function openRound(
  _prev: OpenRoundState,
  formData: FormData,
): Promise<OpenRoundState> {
  await requireWebMaster();

  const fiscalYear = Number(formData.get("fiscal_year"));
  const deadline = String(formData.get("deadline") ?? "").trim() || null;
  const notice = String(formData.get("notice_message") ?? "").trim() || null;

  if (!Number.isInteger(fiscalYear) || fiscalYear < 2500 || fiscalYear > 2700) {
    return { error: "กรุณาระบุปีงบประมาณ (พ.ศ.) ให้ถูกต้อง" };
  }

  // Runs as the WM's own session so the SECURITY DEFINER role check (auth.uid()) passes.
  const supabase = await createClient();
  const { data: roundId, error } = await supabase.rpc("open_participation_round", {
    p_fiscal_year: fiscalYear,
    p_notice: notice ?? undefined,
    p_deadline: deadline ?? undefined,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `มีรอบของปีงบประมาณ ${fiscalYear} อยู่แล้ว` };
    }
    return { error: `เปิดรอบไม่สำเร็จ: ${error.message}` };
  }

  const admin = createAdminClient();
  const { count: invited } = await admin
    .from("unit_participation")
    .select("participation_id", { count: "exact", head: true })
    .eq("round_id", roundId as string);

  const mail = await notifyRoundCoordinators(
    roundId as string,
    fiscalYear,
    deadline,
    notice,
    false,
  );

  revalidatePath("/admin/participation");
  return {
    result: { fiscalYear, invited: invited ?? 0, emailsSent: mail.sent, emailTotal: mail.total },
  };
}

export async function resendNotice(formData: FormData): Promise<void> {
  await requireWebMaster();
  const roundId = String(formData.get("round_id") ?? "");
  if (!roundId) return;

  // Pull newly-created units into the round, then notify everyone still pending.
  const supabase = await createClient();
  await supabase.rpc("sync_participation_round", { p_round_id: roundId });

  const admin = createAdminClient();
  const { data: round } = await admin
    .from("participation_rounds")
    .select("fiscal_year, deadline, notice_message")
    .eq("round_id", roundId)
    .maybeSingle();
  if (round) {
    await notifyRoundCoordinators(
      roundId,
      round.fiscal_year,
      round.deadline,
      round.notice_message,
      true,
    );
  }
  revalidatePath("/admin/participation");
  revalidatePath(`/admin/participation/${roundId}`);
}

export async function setRoundStatus(formData: FormData): Promise<void> {
  await requireWebMaster();
  const roundId = String(formData.get("round_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!roundId || (status !== "open" && status !== "closed")) return;

  const supabase = await createClient();
  await supabase.rpc("set_participation_round_status", {
    p_round_id: roundId,
    p_status: status,
  });
  revalidatePath("/admin/participation");
  revalidatePath(`/admin/participation/${roundId}`);
}

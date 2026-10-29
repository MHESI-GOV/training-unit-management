import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PARTICIPATION_STATUS_LABEL, ROUND_STATUS_LABEL } from "@/lib/labels";
import { formatFiscalYear } from "@/lib/fiscal-year";
import { formatThaiDate, formatThaiDateTime } from "@/lib/date-format";
import { respondParticipation } from "./actions";

const STATUS_PILL: Record<string, string> = {
  confirmed: "done",
  declined: "muted",
  invited: "study",
};

export default async function UnitParticipationPage() {
  const profile = await requireProfile();
  if (profile.role !== "unit_coordinator") redirect("/");
  if (!profile.unit_scope) redirect("/unit-setup");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("unit_participation")
    .select(
      "participation_id, status, responded_at, note, round_id, fiscal_year, participation_rounds(status, deadline, notice_message)",
    )
    .eq("unit_id", profile.unit_scope);

  const sorted = (rows ?? []).slice().sort((a, b) => b.fiscal_year - a.fiscal_year);

  return (
    <AppShell
      profile={profile}
      active="participation"
      eyebrow="หน่วยฝึกอบรม"
      title="ยืนยันการเข้าร่วมรายปีงบประมาณ"
    >
      {sorted.length === 0 && (
        <p className="footnote">ยังไม่มีรอบการยืนยันที่เปิดให้หน่วยของคุณ</p>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {sorted.map((row) => {
          const round = row.participation_rounds;
          const roundOpen = round?.status === "open";
          const canRespond = roundOpen; // can set or change the answer while the round is open
          return (
            <article key={row.participation_id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <strong style={{ fontSize: 17 }}>{formatFiscalYear(row.fiscal_year)}</strong>
                  <span className={`pill ${STATUS_PILL[row.status] ?? "muted"}`} style={{ marginLeft: 10 }}>
                    {PARTICIPATION_STATUS_LABEL[row.status]}
                  </span>
                  {!roundOpen && (
                    <span className="pill muted" style={{ marginLeft: 6 }}>
                      {ROUND_STATUS_LABEL[round?.status ?? "closed"]}
                    </span>
                  )}
                  {round?.deadline && roundOpen && (
                    <p className="footnote" style={{ marginTop: 6 }}>กรุณายืนยันภายใน {formatThaiDate(round.deadline)}</p>
                  )}
                  {round?.notice_message && (
                    <p className="footnote" style={{ marginTop: 6 }}>{round.notice_message}</p>
                  )}
                  {row.responded_at && (
                    <p className="footnote" style={{ marginTop: 6 }}>
                      ตอบเมื่อ {formatThaiDateTime(row.responded_at)}
                    </p>
                  )}
                </div>

                {canRespond && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <form action={respondParticipation}>
                      <input type="hidden" name="round_id" value={row.round_id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <button type="submit" className="btn primary">ยืนยันเข้าร่วม</button>
                    </form>
                    <form action={respondParticipation}>
                      <input type="hidden" name="round_id" value={row.round_id} />
                      <input type="hidden" name="status" value="declined" />
                      <button type="submit" className="btn secondary">ขอไม่เข้าร่วมปีนี้</button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

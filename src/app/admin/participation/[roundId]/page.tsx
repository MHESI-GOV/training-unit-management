import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWebMaster } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import {
  PARTICIPATION_STATUS_LABEL,
  ROUND_STATUS_LABEL,
  REGION_LABEL,
  UNIT_TYPE_LABEL,
} from "@/lib/labels";
import { formatFiscalYear } from "@/lib/fiscal-year";
import { resendNotice, setRoundStatus } from "../actions";

const STATUS_PILL: Record<string, string> = {
  confirmed: "done",
  declined: "muted",
  invited: "study",
};

export default async function RoundDetailPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  const profile = await requireWebMaster();
  const supabase = await createClient();

  const { data: round } = await supabase
    .from("participation_rounds")
    .select("round_id, fiscal_year, status, deadline, notice_message")
    .eq("round_id", roundId)
    .maybeSingle();
  if (!round) notFound();

  const { data: rows } = await supabase
    .from("unit_participation")
    .select("participation_id, status, responded_at, training_units(name, region, type)")
    .eq("round_id", roundId)
    .order("status");

  // Sort: pending first (invited), then declined, then confirmed — so follow-up work is on top.
  const order: Record<string, number> = { invited: 0, declined: 1, confirmed: 2 };
  const sorted = (rows ?? []).slice().sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return (
    <AppShell
      profile={profile}
      active="participation"
      eyebrow="รอบยืนยันการเข้าร่วม"
      title={formatFiscalYear(round.fiscal_year)}
    >
      <div style={{ display: "grid", gap: 18 }}>
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span className={`pill ${round.status === "open" ? "study" : "muted"}`}>
                {ROUND_STATUS_LABEL[round.status]}
              </span>
              {round.deadline && (
                <p className="footnote" style={{ marginTop: 6 }}>กำหนดยืนยันภายใน {round.deadline}</p>
              )}
              {round.notice_message && (
                <p className="footnote" style={{ marginTop: 6 }}>ข้อความแจ้ง: {round.notice_message}</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
              {round.status === "open" && (
                <form action={resendNotice}>
                  <input type="hidden" name="round_id" value={round.round_id} />
                  <button type="submit" className="btn secondary">ส่ง Notice ซ้ำ</button>
                </form>
              )}
              <form action={setRoundStatus}>
                <input type="hidden" name="round_id" value={round.round_id} />
                <input type="hidden" name="status" value={round.status === "open" ? "closed" : "open"} />
                <button type="submit" className="btn secondary">
                  {round.status === "open" ? "ปิดรอบ" : "เปิดรอบอีกครั้ง"}
                </button>
              </form>
              <Link href="/admin/participation" className="btn secondary">ย้อนกลับ</Link>
            </div>
          </div>
        </section>

        <section className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "8px 10px" }}>หน่วยฝึกอบรม</th>
                <th style={{ padding: "8px 10px" }}>ภูมิภาค</th>
                <th style={{ padding: "8px 10px" }}>ประเภท</th>
                <th style={{ padding: "8px 10px" }}>สถานะ</th>
                <th style={{ padding: "8px 10px" }}>ตอบเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const u = row.training_units;
                return (
                  <tr key={row.participation_id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 10px" }}>{u?.name ?? "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{u ? REGION_LABEL[u.region] ?? u.region : "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{u ? UNIT_TYPE_LABEL[u.type] ?? u.type : "—"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span className={`pill ${STATUS_PILL[row.status] ?? "muted"}`}>
                        {PARTICIPATION_STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px" }} className="footnote">
                      {row.responded_at ? new Date(row.responded_at).toLocaleString("th-TH") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && <p className="footnote">ยังไม่มีหน่วยในรอบนี้</p>}
        </section>
      </div>
    </AppShell>
  );
}

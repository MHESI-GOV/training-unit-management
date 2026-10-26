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
  REGION_ORDER,
} from "@/lib/labels";
import { Download } from "lucide-react";
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

  // Only units that have CONFIRMED participation are listed here.
  const { data: rows } = await supabase
    .from("unit_participation")
    .select("participation_id, status, responded_at, training_units(name, region, type)")
    .eq("round_id", roundId)
    .eq("status", "confirmed");

  // Sort by region (fixed dashboard order) then unit name.
  const regionRank = (r: string | undefined) => {
    const i = REGION_ORDER.indexOf((r ?? "") as (typeof REGION_ORDER)[number]);
    return i === -1 ? 99 : i;
  };
  const sorted = (rows ?? []).slice().sort((a, b) => {
    const ra = regionRank(a.training_units?.region);
    const rb = regionRank(b.training_units?.region);
    if (ra !== rb) return ra - rb;
    return (a.training_units?.name ?? "").localeCompare(b.training_units?.name ?? "", "th");
  });

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              หน่วยที่ยืนยันเข้าร่วม <span className="footnote">({sorted.length} แห่ง)</span>
            </h2>
            {sorted.length > 0 && (
              <a
                href={`/api/export/participation?round_id=${round.round_id}`}
                className="btn secondary"
                download
              >
                <Download size={15} /> Export Excel
              </a>
            )}
          </div>
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
          {sorted.length === 0 && <p className="footnote">ยังไม่มีหน่วยที่ยืนยันเข้าร่วมในรอบนี้</p>}
        </section>
      </div>
    </AppShell>
  );
}

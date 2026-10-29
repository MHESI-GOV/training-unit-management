import Link from "next/link";
import { requireWebMaster } from "@/lib/auth/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ROUND_STATUS_LABEL } from "@/lib/labels";
import { formatFiscalYear, thaiFiscalYear } from "@/lib/fiscal-year";
import { formatThaiDate } from "@/lib/date-format";
import { OpenRoundDialog } from "./open-round-dialog";
import { resendNotice, setRoundStatus } from "./actions";

export default async function ParticipationPage() {
  const profile = await requireWebMaster();
  const supabase = await createClient();

  const { data: rounds } = await supabase
    .from("participation_rounds")
    .select("round_id, fiscal_year, status, deadline, opened_at")
    .order("fiscal_year", { ascending: false });

  // Per-round counts via the aggregate function (no PII, org-level only).
  const summaries = await Promise.all(
    (rounds ?? []).map(async (r) => {
      const { data } = await supabase.rpc("get_participation_summary", {
        p_fiscal_year: r.fiscal_year,
      });
      const s = data?.[0] ?? { total: 0, confirmed: 0, declined: 0, invited: 0 };
      return { round_id: r.round_id, ...s };
    }),
  );
  const summaryByRound = new Map(summaries.map((s) => [s.round_id, s]));

  return (
    <AppShell
      profile={profile}
      active="participation"
      eyebrow="ผู้ดูแลระบบสูงสุด"
      title="รอบยืนยันการเข้าร่วมรายปีงบประมาณ"
    >
      <div style={{ display: "grid", gap: 20 }}>
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>รอบการยืนยัน</h2>
              <p className="footnote" style={{ marginTop: 4 }}>
                เปิดรอบของแต่ละปีงบประมาณเพื่อให้ทุกหน่วยฝึกยืนยันการเข้าร่วม — &quot;จำนวนหน่วย active&quot; ของปีนั้นนับจากหน่วยที่ยืนยันแล้ว
              </p>
            </div>
            <OpenRoundDialog defaultFiscalYear={thaiFiscalYear()} />
          </div>
        </section>

        {(rounds ?? []).length === 0 && (
          <p className="footnote">ยังไม่มีรอบการยืนยัน — กด &quot;เปิดรอบปีงบใหม่&quot; เพื่อเริ่ม</p>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {(rounds ?? []).map((r) => {
            const s = summaryByRound.get(r.round_id);
            const confirmed = Number(s?.confirmed ?? 0);
            const total = Number(s?.total ?? 0);
            const declined = Number(s?.declined ?? 0);
            const invited = Number(s?.invited ?? 0);
            return (
              <article key={r.round_id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <strong style={{ fontSize: 17 }}>{formatFiscalYear(r.fiscal_year)}</strong>
                    <span className={`pill ${r.status === "open" ? "study" : "muted"}`} style={{ marginLeft: 10 }}>
                      {ROUND_STATUS_LABEL[r.status]}
                    </span>
                    {r.deadline && (
                      <p className="footnote" style={{ marginTop: 6 }}>กำหนดยืนยันภายใน {formatThaiDate(r.deadline)}</p>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent, #1d4f82)" }}>
                      {confirmed}<span style={{ fontSize: 14, fontWeight: 500 }}> / {total} หน่วย</span>
                    </div>
                    <p className="footnote">หน่วย active (ยืนยันแล้ว)</p>
                  </div>
                </div>

                <p className="footnote" style={{ marginTop: 10 }}>
                  ยืนยันแล้ว {confirmed} · ยังไม่ตอบ {invited} · ขอไม่เข้าร่วม {declined}
                </p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
                  <Link href={`/admin/participation/${r.round_id}`} className="btn secondary">ดูรายหน่วย</Link>
                  {r.status === "open" && (
                    <form action={resendNotice}>
                      <input type="hidden" name="round_id" value={r.round_id} />
                      <button type="submit" className="btn secondary">ส่ง Notice ซ้ำ (หน่วยที่ยังไม่ตอบ)</button>
                    </form>
                  )}
                  <form action={setRoundStatus}>
                    <input type="hidden" name="round_id" value={r.round_id} />
                    <input type="hidden" name="status" value={r.status === "open" ? "closed" : "open"} />
                    <button type="submit" className="btn secondary">
                      {r.status === "open" ? "ปิดรอบ" : "เปิดรอบอีกครั้ง"}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

import { formatFiscalYear } from "@/lib/fiscal-year";
import type { PendingParticipation } from "@/lib/participation";
import { respondParticipation } from "@/app/unit/participation/actions";

// Non-dismissable blocking popup shown over every page while a Unit Coordinator has an unanswered
// invite in an open round. There is no close button and the backdrop swallows all clicks, so the
// coordinator must confirm or decline before using any other function. Answering (either way)
// changes the participation status off 'invited', so on the automatic post-action refresh AppShell
// stops rendering this gate. Rendered on every AppShell page, so it also covers direct URL nav.
export function ParticipationGate({ pending }: { pending: PendingParticipation }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="participation-gate-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23, 44, 72, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 460 }}>
        <span className="pill study">ต้องดำเนินการก่อนใช้งาน</span>
        <h2 id="participation-gate-title" style={{ fontSize: 19, fontWeight: 800, marginTop: 12 }}>
          ยืนยันการเข้าร่วมโครงการ {formatFiscalYear(pending.fiscal_year)}
        </h2>
        <p className="footnote" style={{ marginTop: 8 }}>
          กระทรวงได้เปิดรอบการยืนยันการเข้าร่วมประจำปีงบประมาณนี้ กรุณายืนยันว่าหน่วยของท่านจะเข้าร่วมหรือไม่
          ก่อนใช้งานเมนูอื่น
        </p>
        {pending.notice_message && (
          <p style={{ marginTop: 10 }}>{pending.notice_message}</p>
        )}
        {pending.deadline && (
          <p className="footnote" style={{ marginTop: 10 }}>กำหนดยืนยันภายใน {pending.deadline}</p>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <form action={respondParticipation} style={{ flex: 1, minWidth: 160 }}>
            <input type="hidden" name="round_id" value={pending.round_id} />
            <input type="hidden" name="status" value="confirmed" />
            <button type="submit" className="btn primary" style={{ width: "100%" }}>
              ยืนยันเข้าร่วม
            </button>
          </form>
          <form action={respondParticipation} style={{ flex: 1, minWidth: 160 }}>
            <input type="hidden" name="round_id" value={pending.round_id} />
            <input type="hidden" name="status" value="declined" />
            <button type="submit" className="btn secondary" style={{ width: "100%" }}>
              ขอไม่เข้าร่วมปีนี้
            </button>
          </form>
        </div>
        <p className="footnote" style={{ marginTop: 12 }}>
          หากเลือก &quot;ขอไม่เข้าร่วมปีนี้&quot; หน่วยของท่านจะไม่ถูกนับเป็นหน่วยที่เข้าร่วมในปีงบประมาณนี้
          (ข้อมูลเดิมยังอยู่ครบ)
        </p>
      </div>
    </div>
  );
}

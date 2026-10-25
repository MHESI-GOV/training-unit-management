import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { PublicHome } from "@/components/home/PublicHome";
import { UnitFilter } from "@/components/dashboard/unit-filter";
import { ExportLearners } from "@/components/dashboard/export-learners";
import { ExportClasses } from "@/components/dashboard/export-classes";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { type Overview, resolveFiscalYear } from "@/lib/dashboard";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ unit_id?: string; fy?: string }>;
}) {
  const { email, profile } = await getCurrentProfile();
  const { unit_id, fy } = await searchParams;

  const supabase = await createClient();

  // Logged-out visitors get the standalone marketing/landing layout (the existing public
  // dashboard design), now showing the same overview content as the authenticated dashboard.
  if (!profile) {
    const { data: yearsRaw } = await supabase.rpc("get_dashboard_fiscal_years");
    const years = (yearsRaw as number[] | null) ?? [];
    const { selected, param } = resolveFiscalYear(fy, years);
    const { data: ovRaw, error } = await supabase.rpc("get_dashboard_overview", {
      p_unit_id: undefined,
      p_fiscal_year: param ?? undefined,
    });
    const publicOv = ovRaw as Overview | null;
    return publicOv ? (
      <PublicHome ov={publicOv} years={years} selectedYear={selected} />
    ) : (
      <main style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
        <p style={{ color: "var(--danger)" }}>โหลดข้อมูลไม่สำเร็จ{error ? `: ${error.message}` : ""}</p>
        <Link href="/login" className="btn primary" style={{ marginTop: 14 }}>
          เข้าสู่ระบบ
        </Link>
      </main>
    );
  }

  const pendingUnitSetup = profile.role === "unit_coordinator" && !profile.unit_scope;
  const canFilterByUnit = profile.role === "web_master" || profile.role === "central_staff";
  const filterUnitId = canFilterByUnit ? unit_id : undefined;

  const { data: yearsRaw } = await supabase.rpc("get_dashboard_fiscal_years");
  const years = (yearsRaw as number[] | null) ?? [];
  const { selected: selectedYear, param: fyParam } = resolveFiscalYear(fy, years);

  const [{ data: ovRaw, error }, { data: units }] = await Promise.all([
    supabase.rpc("get_dashboard_overview", {
      p_unit_id: filterUnitId ?? undefined,
      p_fiscal_year: fyParam ?? undefined,
    }),
    canFilterByUnit
      ? supabase.from("training_units").select("unit_id, name").order("name")
      : Promise.resolve({ data: null }),
  ]);
  const ov = (ovRaw as Overview | null) ?? null;

  return (
    <AppShell profile={profile} active="home" eyebrow="ภาพรวมโครงการ" title="หนึ่งหมู่บ้าน หนึ่งเชฟอาหารไทย">
      <p className="footnote" style={{ marginBottom: 16 }}>
        เข้าสู่ระบบในนาม <strong>{email}</strong>
      </p>

      {pendingUnitSetup && (
        <section className="notice" style={{ background: "#fff3da", color: "#76520c", border: "1px solid #f0d9a6" }}>
          บัญชีนี้ยังไม่ได้ผูกกับหน่วยฝึกอบรมใด —{" "}
          <Link href="/unit-setup" style={{ fontWeight: 600 }}>
            กรอกข้อมูลหน่วยฝึกอบรม
          </Link>{" "}
          ก่อนจึงจะใช้งานส่วนอื่นได้
        </section>
      )}

      {canFilterByUnit && <UnitFilter units={units ?? []} selected={unit_id ?? ""} />}

      {error && <p style={{ color: "var(--danger)" }}>โหลดข้อมูลไม่สำเร็จ: {error.message}</p>}

      {ov && (
        <>
          <div style={{ marginTop: canFilterByUnit ? 16 : 20 }}>
            <OverviewSection
              key={filterUnitId ?? "all"}
              initialOv={ov}
              years={years}
              initialSelected={selectedYear}
              unitId={filterUnitId}
            />
          </div>

          {canFilterByUnit && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
              <ExportLearners unitId={unit_id ?? ""} />
              <ExportClasses unitId={unit_id ?? ""} />
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { REGION_LABEL, UNIT_TYPE_LABEL, REGION_ORDER } from "@/lib/labels";
import { formatFiscalYear } from "@/lib/fiscal-year";

// Export the units that have CONFIRMED participation in a given round, as an Excel-openable
// CSV (BOM + UTF-8), same backend-role-check + audit-log pattern as the other export routes.
// Participation is a Web-Master-only area, so this route restricts to web_master.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "web_master") return new Response("forbidden", { status: 403 });

  const roundId = new URL(request.url).searchParams.get("round_id");
  if (!roundId) return new Response("round_id required", { status: 400 });

  const { data: round } = await supabase
    .from("participation_rounds")
    .select("fiscal_year")
    .eq("round_id", roundId)
    .maybeSingle();

  const { data: rows, error } = await supabase
    .from("unit_participation")
    .select("responded_at, training_units(name, region, type)")
    .eq("round_id", roundId)
    .eq("status", "confirmed");
  if (error) return new Response(error.message, { status: 500 });

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

  const fyLabel = round ? formatFiscalYear(round.fiscal_year) : "";
  const out: (string | number | null)[][] = [
    ["ลำดับ", "หน่วยฝึกอบรม", "ภูมิภาค", "ประเภทสถาบัน", "ปีงบประมาณ", "สถานะ", "วันที่ตอบรับ"],
  ];
  sorted.forEach((row, i) => {
    const u = row.training_units;
    out.push([
      i + 1,
      u?.name ?? "",
      u ? REGION_LABEL[u.region] ?? u.region : "",
      u ? UNIT_TYPE_LABEL[u.type] ?? u.type : "",
      fyLabel,
      "ยืนยันเข้าร่วม",
      row.responded_at ? new Date(row.responded_at).toLocaleString("th-TH") : "",
    ]);
  });

  await supabase.from("audit_log").insert({
    actor_user_id: user.id,
    action: "export_participation_confirmed",
    entity_type: "participation_round",
    record_id: roundId,
    changed_fields: [`${out.length - 1} rows`],
  });

  return new Response(toCsv(out), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="participation_confirmed_${roundId}_${Date.now()}.csv"`,
    },
  });
}

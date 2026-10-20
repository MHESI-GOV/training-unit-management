import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

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

  // Role is checked here at the backend, not just hidden in UI -- same rule as
  // /api/export/learners.
  if (profile?.role !== "web_master" && profile?.role !== "central_staff") {
    return new Response("forbidden", { status: 403 });
  }

  const unitId = new URL(request.url).searchParams.get("unit_id");

  let query = supabase
    .from("classes")
    .select(
      "start_date, end_date, seat_count, external_ref, training_units(name), courses(name), class_instructors(role_in_class, instructors(name, phone, email))",
    );
  if (unitId) query = query.eq("unit_id", unitId);

  const { data: classes, error } = await query.order("start_date", { ascending: false });
  if (error) return new Response(error.message, { status: 500 });

  const rows: (string | number | null)[][] = [
    [
      "หน่วยฝึกอบรม",
      "หลักสูตร",
      "วันเริ่มต้น",
      "วันสิ้นสุด",
      "จำนวนที่นั่ง",
      "รหัสอ้างอิงเดิม",
      "วิทยากร",
    ],
  ];
  for (const c of classes ?? []) {
    const instructorList = c.class_instructors
      .map((ci) => `${ci.instructors?.name ?? ""} (${ci.role_in_class ?? ""})`)
      .join("; ");
    rows.push([
      c.training_units?.name ?? "",
      c.courses?.name ?? "",
      c.start_date,
      c.end_date,
      c.seat_count,
      c.external_ref,
      instructorList,
    ]);
  }

  await supabase.from("audit_log").insert({
    actor_user_id: user.id,
    action: "export_classes",
    entity_type: "class",
    record_id: unitId ?? "all_units",
    changed_fields: [`${rows.length - 1} rows`],
  });

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="classes_export_${Date.now()}.csv"`,
    },
  });
}

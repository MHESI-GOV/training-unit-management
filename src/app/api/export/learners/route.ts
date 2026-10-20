import { createClient } from "@/lib/supabase/server";
import { byteaHexToBuffer, decryptNationalId } from "@/lib/crypto/national-id";
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

  // §07-import-export-plan.md §4 — role is checked here at the backend, not just hidden in UI.
  if (profile?.role !== "web_master" && profile?.role !== "central_staff") {
    return new Response("forbidden", { status: 403 });
  }

  const unitId = new URL(request.url).searchParams.get("unit_id");

  let query = supabase
    .from("learners")
    .select("first_name, last_name, national_id_encrypted, phone, email, address, created_at, training_units(name)");
  if (unitId) query = query.eq("unit_id", unitId);

  const { data: learners, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  const rows: (string | number | null)[][] = [
    ["ชื่อ", "นามสกุล", "เลขบัตรประชาชน", "เบอร์โทร", "อีเมล", "ที่อยู่", "หน่วยฝึกอบรม", "วันที่สร้าง"],
  ];
  for (const l of learners ?? []) {
    const nationalId = decryptNationalId(byteaHexToBuffer(l.national_id_encrypted as unknown as string));
    rows.push([
      l.first_name,
      l.last_name,
      nationalId,
      l.phone,
      l.email,
      l.address,
      l.training_units?.name ?? "",
      l.created_at,
    ]);
  }

  await supabase.from("audit_log").insert({
    actor_user_id: user.id,
    action: "export_learners",
    entity_type: "learner",
    record_id: unitId ?? "all_units",
    changed_fields: [`${rows.length - 1} rows`],
  });

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="learners_export_${Date.now()}.csv"`,
    },
  });
}

import { requireStaffProfile } from "@/lib/auth/resolve-unit";
import { createClient } from "@/lib/supabase/server";
import { unitCode } from "@/lib/id-codes";
import { AppShell } from "@/components/layout/AppShell";
import { UnitsList, type UnitCard } from "./units-list";
import { CreateUnitToolbar } from "./create-unit-dialog";

export default async function AdminUnitsPage() {
  const profile = await requireStaffProfile();

  const supabase = await createClient();
  // Aggregate embeds (classes(count), learners(count)) aren't modeled by the generated types,
  // so the row shape is declared explicitly and cast.
  type UnitRow = {
    unit_id: string;
    name: string;
    type: string;
    region: string;
    unit_seq: number | null;
    classes: { count: number }[] | null;
    learners: { count: number }[] | null;
    training_unit_images: { storage_key: string; display_order: number | null; status: string }[] | null;
    training_unit_profiles: { province_name: string | null; is_food_testing_center: boolean | null } | null;
    unit_participation: { fiscal_year: number; status: string }[] | null;
  };
  const { data: unitsRaw } = await supabase
    .from("training_units")
    .select(
      "unit_id, name, type, region, unit_seq, classes(count), learners(count), " +
        "training_unit_images(storage_key, display_order, status), " +
        "training_unit_profiles(province_name, is_food_testing_center), " +
        "unit_participation(fiscal_year, status)",
    )
    .order("unit_seq");
  const units = (unitsRaw ?? []) as unknown as UnitRow[];

  const cards: UnitCard[] = await Promise.all(
    units.map(async (u) => {
      const classCount = (u.classes as { count: number }[] | null)?.[0]?.count ?? 0;
      const learnerCount = (u.learners as { count: number }[] | null)?.[0]?.count ?? 0;

      const cover = (u.training_unit_images ?? [])
        .filter((i) => i.status === "active")
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];
      let coverUrl: string | null = null;
      if (cover) {
        const { data } = await supabase.storage.from("unit-photos").createSignedUrl(cover.storage_key, 3600);
        coverUrl = data?.signedUrl ?? null;
      }

      return {
        unit_id: u.unit_id,
        code: unitCode({ region: u.region, provinceName: u.training_unit_profiles?.province_name ?? null, unitSeq: u.unit_seq }),
        name: u.name,
        type: u.type,
        region: u.region,
        classCount,
        learnerCount,
        isTestingCenter: u.training_unit_profiles?.is_food_testing_center === true,
        participationYears: (u.unit_participation ?? [])
          .filter((p) => p.status === "confirmed")
          .map((p) => p.fiscal_year),
        coverUrl,
      };
    }),
  );

  return (
    <AppShell profile={profile} active="units" eyebrow="หน่วยในระบบ" title="หน่วยฝึกอบรมทั้งหมด">
      <CreateUnitToolbar />
      {cards.length === 0 ? (
        <p className="footnote">ยังไม่มีหน่วยฝึกอบรมในระบบ</p>
      ) : (
        <UnitsList units={cards} />
      )}
    </AppShell>
  );
}

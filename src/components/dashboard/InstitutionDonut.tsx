import { UNIT_TYPE_LABEL } from "@/lib/labels";
import { DonutChart, type DonutSlice } from "./DonutChart";

// Categorical palette, first three slots of the data-viz reference palette — the only set that
// clears the all-pairs colorblind + normal-vision floors (dataviz skill, references/palette.md).
// The app is light-theme only, so the light steps are used directly.
const COLORS: Record<string, string> = {
  university: "#2a78d6",
  vocational: "#eb6834",
  other: "#1baf7a",
};

export function InstitutionDonut({ counts }: { counts: Record<string, number> }) {
  const slices: DonutSlice[] = Object.keys(UNIT_TYPE_LABEL).map((key) => ({
    key,
    label: UNIT_TYPE_LABEL[key],
    value: counts[key] ?? 0,
    color: COLORS[key] ?? "#9aa6b2",
  }));
  return <DonutChart slices={slices} centerLabel="หน่วยฝึกอบรม" />;
}

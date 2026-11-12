"use client";

import { useState } from "react";
import { REGION_LABEL, REGION_ORDER } from "@/lib/labels";
import { PROVINCE_NAMES, regionFromProvince } from "@/lib/id-codes";

// Province + region kept in step: whenever the province changes (typed, picked from the list, or
// filled from the map pin) the region is re-filled from it. The region select stays editable, so a
// manual pick sticks until the province changes again.
export function useProvinceRegion(initialProvince = "", initialRegion = "") {
  const [province, setProvinceRaw] = useState(initialProvince);
  const [region, setRegion] = useState(initialRegion || regionFromProvince(initialProvince) || "");
  function setProvince(next: string) {
    setProvinceRaw(next);
    const derived = regionFromProvince(next);
    if (derived) setRegion(derived);
  }
  return { province, setProvince, region, setRegion };
}

export const PROVINCE_LIST_ID = "province-names";

/** <datalist> of every province, so a province <input list={PROVINCE_LIST_ID}> suggests valid names. */
export function ProvinceDatalist() {
  return (
    <datalist id={PROVINCE_LIST_ID}>
      {PROVINCE_NAMES.map((p) => (
        <option key={p} value={p} />
      ))}
    </datalist>
  );
}

export function RegionSelect({
  value,
  onChange,
  label = "ภูมิภาค *",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <select name="region" required value={value} onChange={(e) => onChange(e.target.value)} className="field">
        <option value="" disabled>
          — เลือกจังหวัดแล้วระบบเติมให้ —
        </option>
        {REGION_ORDER.map((r) => (
          <option key={r} value={r}>
            {REGION_LABEL[r]}
          </option>
        ))}
      </select>
      <span className="footnote">ระบบเติมให้จากจังหวัด แก้ได้ถ้าไม่ตรง</span>
    </label>
  );
}

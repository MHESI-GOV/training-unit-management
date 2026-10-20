"use client";

import { useActionState, useState } from "react";
import { upsertUnitProfile, type ProfileFormState } from "./actions";
import { LocationPicker, type GeoAddress } from "@/app/unit-setup/LocationPicker";

export type ProfileInitial = {
  house_no: string | null;
  road: string | null;
  province_name: string | null;
  district_name: string | null;
  subdistrict_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  coordinator_first_name: string | null;
  coordinator_last_name: string | null;
  description: string | null;
  is_food_testing_center: boolean | null;
  latitude: number | null;
  longitude: number | null;
} | null;

const initialState: ProfileFormState = {};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: "6px 0 -2px" }}>{children}</h3>;
}

export function ProfileForm({ unitId, initial }: { unitId: string; initial: ProfileInitial }) {
  const [state, formAction, pending] = useActionState(upsertUnitProfile, initialState);

  const [houseNo, setHouseNo] = useState(initial?.house_no ?? "");
  const [road, setRoad] = useState(initial?.road ?? "");
  const [province, setProvince] = useState(initial?.province_name ?? "");
  const [district, setDistrict] = useState(initial?.district_name ?? "");
  const [subdistrict, setSubdistrict] = useState(initial?.subdistrict_name ?? "");

  const initialPos =
    initial?.latitude != null && initial?.longitude != null
      ? { lat: initial.latitude, lng: initial.longitude }
      : null;

  function applyGeocode(a: GeoAddress) {
    if (a.houseNo) setHouseNo(a.houseNo);
    if (a.road) setRoad(a.road);
    if (a.province) setProvince(a.province);
    if (a.district) setDistrict(a.district);
    if (a.subdistrict) setSubdistrict(a.subdistrict);
  }

  const tcInitial = initial?.is_food_testing_center;

  return (
    <form action={formAction} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="unit_id" value={unitId} />

      <SectionTitle>ข้อมูลทั่วไป</SectionTitle>
      <LocationPicker initial={initialPos} onGeocode={applyGeocode} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <label>
          <span className="field-label">เลขที่</span>
          <input name="house_no" value={houseNo} onChange={(e) => setHouseNo(e.target.value)} className="field" />
        </label>
        <label>
          <span className="field-label">ถนน</span>
          <input name="road" value={road} onChange={(e) => setRoad(e.target.value)} className="field" />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">จังหวัด</span>
          <input name="province_name" value={province} onChange={(e) => setProvince(e.target.value)} className="field" />
        </label>
        <label>
          <span className="field-label">อำเภอ / เขต</span>
          <input name="district_name" value={district} onChange={(e) => setDistrict(e.target.value)} className="field" />
        </label>
        <label>
          <span className="field-label">ตำบล / แขวง</span>
          <input
            name="subdistrict_name"
            value={subdistrict}
            onChange={(e) => setSubdistrict(e.target.value)}
            className="field"
          />
        </label>
      </div>

      <SectionTitle>สถานะศูนย์ทดสอบ</SectionTitle>
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <span className="field-label">ศูนย์ทดสอบมาตรฐานฝีมือแรงงาน สาขาอาหาร</span>
        <div style={{ display: "flex", gap: 18, marginTop: 6 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="radio" name="is_food_testing_center" value="true" defaultChecked={tcInitial === true} /> เป็น
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="radio" name="is_food_testing_center" value="false" defaultChecked={tcInitial !== true} /> ไม่เป็น
          </label>
        </div>
      </fieldset>

      <SectionTitle>ผู้ประสานงานหน่วยฝึก</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">ชื่อ</span>
          <input name="coordinator_first_name" defaultValue={initial?.coordinator_first_name ?? ""} className="field" />
        </label>
        <label>
          <span className="field-label">นามสกุล</span>
          <input name="coordinator_last_name" defaultValue={initial?.coordinator_last_name ?? ""} className="field" />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">เบอร์โทรศัพท์</span>
          <input name="phone" defaultValue={initial?.phone ?? ""} className="field" />
        </label>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" defaultValue={initial?.email ?? ""} className="field" />
        </label>
      </div>

      <SectionTitle>ข้อมูลอื่น ๆ</SectionTitle>
      <label>
        <span className="field-label">คำอธิบายหน่วย / ข้อมูลเพิ่มเติม</span>
        <textarea name="description" defaultValue={initial?.description ?? ""} className="field" rows={3} />
      </label>

      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
      {state.success && <p className="notice success">บันทึกแล้ว</p>}
    </form>
  );
}

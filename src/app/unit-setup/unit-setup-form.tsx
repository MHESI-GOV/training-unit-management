"use client";

import { useActionState, useState } from "react";
import { submitTrainingUnit, type SubmitUnitState } from "./actions";
import { UNIT_TYPE_LABEL, REGION_LABEL } from "@/lib/labels";
import { LocationPicker, type GeoAddress } from "./LocationPicker";

const initialState: SubmitUnitState = {};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: "6px 0 -2px" }}>{children}</h3>
  );
}

export function UnitSetupForm() {
  const [state, formAction, pending] = useActionState(submitTrainingUnit, initialState);

  // Address parts are controlled so the map pin can pre-fill them (reverse-geocode) while staying
  // fully editable. Only overwrite a part when geocoding actually returns something for it.
  const [houseNo, setHouseNo] = useState("");
  const [road, setRoad] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");

  function applyGeocode(a: GeoAddress) {
    if (a.houseNo) setHouseNo(a.houseNo);
    if (a.road) setRoad(a.road);
    if (a.province) setProvince(a.province);
    if (a.district) setDistrict(a.district);
    if (a.subdistrict) setSubdistrict(a.subdistrict);
  }

  return (
    <form action={formAction} style={{ display: "grid", gap: 14 }}>
      <SectionTitle>ข้อมูลทั่วไป</SectionTitle>
      <label>
        <span className="field-label">ชื่อสถาบัน / หน่วยฝึกอบรม *</span>
        <input name="name" required className="field" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">ประเภทหน่วย</span>
          <select name="type" required className="field">
            {Object.entries(UNIT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">ภูมิภาค</span>
          <select name="region" required className="field">
            {Object.entries(REGION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <LocationPicker onGeocode={applyGeocode} />

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
            <input type="radio" name="is_food_testing_center" value="true" /> เป็น
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="radio" name="is_food_testing_center" value="false" defaultChecked /> ไม่เป็น
          </label>
        </div>
      </fieldset>

      <SectionTitle>ผู้ประสานงานหน่วยฝึก</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">ชื่อ</span>
          <input name="coordinator_first_name" className="field" />
        </label>
        <label>
          <span className="field-label">นามสกุล</span>
          <input name="coordinator_last_name" className="field" />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          <span className="field-label">เบอร์โทรศัพท์</span>
          <input name="phone" className="field" />
        </label>
        <label>
          <span className="field-label">อีเมล</span>
          <input name="email" type="email" className="field" />
        </label>
      </div>

      <p className="footnote" style={{ marginTop: 2 }}>
        ข้อมูลอื่น ๆ และรูปภาพหน่วยฝึก เพิ่ม/แก้ไขภายหลังได้ที่เมนู “โปรไฟล์หน่วยฝึก” — จำเป็นต้องกรอกเฉพาะ
        ชื่อสถาบันเท่านั้น
      </p>

      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? "กำลังบันทึก..." : "บันทึกและเริ่มใช้งาน"}
      </button>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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

// Editing is gated: the profile opens read-only. The edit button is a pencil icon next to the
// "ข้อมูลหน่วยฝึก" heading (tooltip on hover); clicking it reveals the editable form + save button.
// Mounting the edit form fresh each time means a cancelled edit is discarded (fields re-init from
// `initial` / `unitName`).
export function ProfileForm({
  unitId,
  unitName,
  initial,
}: {
  unitId: string;
  unitName: string;
  initial: ProfileInitial;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>ข้อมูลหน่วยฝึก</h2>
        {!editing && (
          <button
            type="button"
            className="icon-btn"
            data-tip="แก้ไขข้อมูลหน่วยฝึก"
            aria-label="แก้ไขข้อมูลหน่วยฝึก"
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} />
          </button>
        )}
      </div>
      <div style={{ marginTop: 14 }}>
        {editing ? (
          <ProfileEditForm
            unitId={unitId}
            unitName={unitName}
            initial={initial}
            onDone={() => setEditing(false)}
          />
        ) : (
          <ProfileView unitName={unitName} initial={initial} />
        )}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div style={{ fontSize: 15, color: value ? "var(--ink)" : "var(--muted)", marginTop: 2 }}>{value || "—"}</div>
    </div>
  );
}

function ProfileView({ unitName, initial }: { unitName: string; initial: ProfileInitial }) {
  const pos =
    initial?.latitude != null && initial?.longitude != null
      ? { lat: initial.latitude, lng: initial.longitude }
      : null;
  const tc = initial?.is_food_testing_center;
  const fullName = [initial?.coordinator_first_name, initial?.coordinator_last_name].filter(Boolean).join(" ");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Field label="ชื่อสถาบัน / หน่วยฝึกอบรม" value={unitName} />

      <SectionTitle>ผู้ประสานงานหน่วยฝึก</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="ชื่อ - นามสกุล" value={fullName} />
        <Field label="เบอร์โทรศัพท์" value={initial?.phone} />
        <Field label="อีเมล" value={initial?.email} />
      </div>

      <SectionTitle>ข้อมูลทั่วไป</SectionTitle>
      <LocationPicker readOnly initial={pos} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="เลขที่" value={initial?.house_no} />
        <Field label="ถนน" value={initial?.road} />
        <Field label="จังหวัด" value={initial?.province_name} />
        <Field label="อำเภอ / เขต" value={initial?.district_name} />
        <Field label="ตำบล / แขวง" value={initial?.subdistrict_name} />
      </div>

      <SectionTitle>สถานะศูนย์ทดสอบ</SectionTitle>
      <Field
        label="ศูนย์ทดสอบมาตรฐานฝีมือแรงงาน สาขาอาหาร"
        value={tc == null ? null : tc ? "เป็น" : "ไม่เป็น"}
      />

      <SectionTitle>ข้อมูลอื่น ๆ</SectionTitle>
      <Field label="คำอธิบายหน่วย / ข้อมูลเพิ่มเติม" value={initial?.description} />
    </div>
  );
}

function ProfileEditForm({
  unitId,
  unitName,
  initial,
  onDone,
}: {
  unitId: string;
  unitName: string;
  initial: ProfileInitial;
  onDone: () => void;
}) {
  const router = useRouter();
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

  // On a successful save, pull fresh server data and drop back to read-only view.
  useEffect(() => {
    if (state.success) {
      router.refresh();
      onDone();
    }
  }, [state.success, router, onDone]);

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

      <label>
        <span className="field-label">ชื่อสถาบัน / หน่วยฝึกอบรม *</span>
        <input name="name" required defaultValue={unitName} className="field" />
      </label>

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

      <SectionTitle>ข้อมูลอื่น ๆ</SectionTitle>
      <label>
        <span className="field-label">คำอธิบายหน่วย / ข้อมูลเพิ่มเติม</span>
        <textarea name="description" defaultValue={initial?.description ?? ""} className="field" rows={3} />
      </label>

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button type="button" className="btn secondary" onClick={onDone} disabled={pending}>
          ยกเลิก
        </button>
      </div>
      {state.error && <p className="notice error">{state.error}</p>}
    </form>
  );
}

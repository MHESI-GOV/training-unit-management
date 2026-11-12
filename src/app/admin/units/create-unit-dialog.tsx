"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Popup } from "@/components/ui/Popup";
import { UNIT_TYPE_LABEL } from "@/lib/labels";
import { useProvinceRegion, RegionSelect, ProvinceDatalist, PROVINCE_LIST_ID } from "@/components/ui/RegionField";
import { createTrainingUnitAsStaff, type CreateUnitState } from "./actions";

const initial: CreateUnitState = {};

// WM/Central Staff toolbar above the units list: create one unit (popup) or go to bulk import.
export function CreateUnitToolbar() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createTrainingUnitAsStaff, initial);
  const { province, setProvince, region, setRegion } = useProvinceRegion();

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
      <button type="button" className="btn primary" onClick={() => setOpen(true)}>
        <Plus size={15} /> เพิ่มหน่วยฝึกอบรม
      </button>
      <Link href="/admin/units/import" className="btn secondary">
        <Upload size={15} /> นำเข้าจากไฟล์
      </Link>

      <Popup open={open} onClose={() => setOpen(false)} title="เพิ่มหน่วยฝึกอบรม">
        <form action={action} style={{ display: "grid", gap: 12 }}>
          <label>
            <span className="field-label">ชื่อสถาบัน / หน่วยฝึกอบรม *</span>
            <input name="name" required className="field" placeholder="เช่น มหาวิทยาลัยขอนแก่น" />
          </label>
          <label>
            <span className="field-label">ประเภทหน่วย *</span>
            <select name="type" required defaultValue="university" className="field">
              {Object.entries(UNIT_TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">จังหวัด</span>
            <input
              name="province_name"
              list={PROVINCE_LIST_ID}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="field"
              placeholder="เช่น ขอนแก่น"
            />
            <ProvinceDatalist />
          </label>
          <RegionSelect value={region} onChange={setRegion} />
          <p className="footnote">
            กรอกเฉพาะข้อมูลพื้นฐานก่อน รายละเอียดอื่น (ที่อยู่ / ผู้ประสานงาน / รูป / ชั้นเรียน /
            ผู้เรียน) กรอกต่อในหน้าข้อมูลหน่วยได้ทันทีหลังสร้าง
          </p>
          {state.error && <p className="notice error">{state.error}</p>}
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "กำลังสร้าง..." : "สร้างหน่วยและกรอกข้อมูลต่อ"}
          </button>
        </form>
      </Popup>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Search } from "lucide-react";

const Inner = dynamic(() => import("./LocationPickerInner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 360,
        borderRadius: 12,
        background: "var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted)",
        fontSize: 14,
      }}
    >
      กำลังโหลดแผนที่…
    </div>
  ),
});

export type GeoAddress = {
  province: string;
  district: string;
  subdistrict: string;
  road: string;
  houseNo: string;
};

// Best-effort map of a Nominatim reverse-geocode address object to Thai address parts. Keys vary
// by place, so each slot falls back through the plausible alternatives; everything is editable
// afterwards, so an imperfect guess just saves typing.
function toThaiAddress(a: Record<string, string>): GeoAddress {
  return {
    province: a.province || a.state || a.city || a.county || "",
    district: a.city_district || a.district || a.county || a.municipality || a.town || "",
    subdistrict: a.suburb || a.subdistrict || a.quarter || a.neighbourhood || a.village || a.hamlet || "",
    road: a.road || "",
    houseNo: a.house_number || "",
  };
}

// Search + pin-drop location picker for unit creation/editing. Search uses the free
// Nominatim/OpenStreetMap geocoder (no API key); a map click drops/moves the pin. The chosen
// lat/lng are written to hidden inputs so they travel with the form's FormData. When a pin is set
// its reverse-geocoded address parts are handed up via onGeocode so the parent can pre-fill its
// editable จังหวัด/อำเภอ/ตำบล/ถนน/เลขที่ fields.
export function LocationPicker({
  initial,
  onGeocode,
  readOnly = false,
}: {
  initial?: { lat: number; lng: number } | null;
  onGeocode?: (addr: GeoAddress) => void;
  readOnly?: boolean;
}) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initial ?? null);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pickPosition(lat: number, lng: number) {
    setPos({ lat, lng });
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=th&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const d = (await res.json()) as { address?: Record<string, string> };
      if (onGeocode) onGeocode(toThaiAddress(d.address ?? {}));
    } catch {
      /* keep whatever the fields had; coords are what matter */
    }
  }

  async function search() {
    const query = q.trim();
    if (!query) return;
    setSearching(true);
    setErr(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (!data.length) {
        setErr("ไม่พบสถานที่ที่ค้นหา ลองคำอื่นหรือคลิกบนแผนที่");
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setCenter([lat, lng]);
      await pickPosition(lat, lng);
    } catch {
      setErr("ค้นหาไม่สำเร็จ ลองใหม่อีกครั้งหรือคลิกบนแผนที่");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <span className="field-label">
        {readOnly ? "ตำแหน่งที่ตั้งบนแผนที่" : "ตำแหน่งที่ตั้งบนแผนที่ (ปักหมุดเพื่อเก็บพิกัด)"}
      </span>
      {!readOnly && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              placeholder="ค้นหาสถานที่ เช่น มหาวิทยาลัยเชียงใหม่"
              className="field"
              style={{ width: "100%", paddingLeft: 30 }}
            />
          </div>
          <button type="button" className="btn secondary" onClick={search} disabled={searching}>
            {searching ? "กำลังค้นหา…" : "ค้นหา"}
          </button>
        </div>
      )}

      <Inner position={pos} center={center} onPick={pickPosition} readOnly={readOnly} />

      <p className="footnote">
        {pos
          ? `พิกัดที่เลือก: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`
          : readOnly
            ? "ยังไม่ได้ปักหมุดตำแหน่ง"
            : "ค้นหาสถานที่ หรือคลิกบนแผนที่เพื่อปักหมุด (ไม่บังคับ เพิ่มภายหลังได้)"}
      </p>
      {err && <p className="notice error">{err}</p>}

      <input type="hidden" name="latitude" value={pos?.lat ?? ""} />
      <input type="hidden" name="longitude" value={pos?.lng ?? ""} />
    </div>
  );
}

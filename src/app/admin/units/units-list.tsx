"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Building2, GraduationCap, Store, Pencil, Search } from "lucide-react";
import { UNIT_TYPE_LABEL, REGION_LABEL, REGION_COLOR, REGION_ORDER } from "@/lib/labels";

export type UnitCard = {
  unit_id: string;
  name: string;
  type: string;
  region: string;
  classCount: number;
  learnerCount: number;
  tags: { type: string; label: string }[];
  coverUrl: string | null;
};

function TypeIcon({ type }: { type: string }) {
  if (type === "university") return <GraduationCap size={30} />;
  if (type === "vocational") return <Building2 size={28} />;
  return <Store size={28} />;
}

export function UnitsList({ units }: { units: UnitCard[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return units.filter(
      (u) =>
        (region === "all" || u.region === region) &&
        (q === "" || u.name.toLowerCase().includes(q)),
    );
  }, [units, query, region]);

  return (
    <>
      <div className="unit-filterbar">
        <div className="unit-search">
          <Search size={16} />
          <input
            className="field"
            placeholder="ค้นหาชื่อหน่วยฝึกอบรม"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="ค้นหาชื่อหน่วยฝึกอบรม"
          />
        </div>
        <div className="unit-region-filter" role="group" aria-label="กรองตามภูมิภาค">
          <button
            type="button"
            className={`region-chip ${region === "all" ? "active" : ""}`}
            onClick={() => setRegion("all")}
          >
            ทั้งหมด
          </button>
          {REGION_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              className={`region-chip ${region === r ? "active" : ""}`}
              onClick={() => setRegion(r)}
            >
              {REGION_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <p className="footnote" style={{ marginBottom: 14 }}>
        พบ {filtered.length} หน่วย
      </p>

      {filtered.length === 0 ? (
        <p className="footnote">ไม่พบหน่วยฝึกอบรมที่ตรงกับเงื่อนไข</p>
      ) : (
        <div className="unit-list">
          {filtered.map((u) => {
            const accent = REGION_COLOR[u.region] ?? "#17569d";
            return (
              <article key={u.unit_id} className="unit-row">
                <div
                  className="unit-thumb"
                  style={
                    u.coverUrl
                      ? { backgroundImage: `url(${u.coverUrl})` }
                      : { background: `linear-gradient(135deg, ${accent}, ${accent}22)` }
                  }
                  aria-hidden
                >
                  {!u.coverUrl && <TypeIcon type={u.type} />}
                </div>

                <div className="unit-row-main">
                  <div className="unit-row-name">{u.name}</div>
                  <div className="unit-row-meta">
                    {UNIT_TYPE_LABEL[u.type] ?? u.type} · {REGION_LABEL[u.region] ?? u.region}
                  </div>
                  <div className="unit-row-tags">
                    {u.tags.length > 0 ? (
                      u.tags.map((t) => (
                        <span key={t.type} className="pill done">
                          {t.label}
                        </span>
                      ))
                    ) : (
                      <span className="pill muted">ยังไม่เป็นศูนย์ทดสอบ</span>
                    )}
                  </div>
                </div>

                <div className="unit-row-side">
                  <div className="unit-row-stats">
                    <div>
                      <b>{u.classCount}</b> รุ่นฝึกอบรม
                    </div>
                    <div>
                      <b>{u.learnerCount}</b> ผู้เรียน
                    </div>
                  </div>
                  <Link href={`/admin/units/${u.unit_id}`} className="btn primary unit-row-edit">
                    <Pencil size={15} /> แก้ไขข้อมูล
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

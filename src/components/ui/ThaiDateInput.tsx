"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatThaiDate, isoDateInThailand, parseThaiDate } from "@/lib/date-format";

const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const BE_OFFSET = 543;
const FIRST_PICKER_YEAR_CE = 1900;
const POPUP_HEIGHT = 330;
const POPUP_WIDTH = 280;

// A browser's own <input type="date"> always follows the browser's calendar and locale, and reads a
// typed 2533 as the Gregorian year 2533. This field is typed and shown as DD/MM/พ.ศ., while the form
// still submits the Gregorian "YYYY-MM-DD" through a hidden input, so server actions and the database
// see what they always did.
function maskDate(raw: string): string {
  // "1/5/2533": a slash after a single digit means that part is finished, so pad it.
  const parts = raw.split("/");
  const digits = parts
    .map((p, i) => (i < parts.length - 1 && p.length === 1 ? `0${p}` : p))
    .join("")
    .replace(/\D/g, "")
    .slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function validate(text: string, noFuture: boolean): { iso: string; error: string } {
  if (!text) return { iso: "", error: "" };
  if (text.length < 10) return { iso: "", error: "กรุณากรอกวันที่ให้ครบ วว/ดด/ปปปป (พ.ศ.)" };
  const parsed = parseThaiDate(text);
  if (parsed.iso === undefined) return { iso: "", error: parsed.error };
  if (noFuture && parsed.iso > isoDateInThailand()) return { iso: "", error: "วันที่ต้องไม่เกินวันนี้" };
  return { iso: parsed.iso, error: "" };
}

export function ThaiDateInput({
  name,
  defaultValue,
  required = false,
  noFuture = false,
  style,
  ariaLabel,
}: {
  name: string;
  defaultValue?: string | null; // Gregorian "YYYY-MM-DD"
  required?: boolean;
  noFuture?: boolean; // for dates that can't be in the future, such as a birth date
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const initialText = formatThaiDate(defaultValue, "");
  const [text, setText] = useState(initialText);
  const [touched, setTouched] = useState(false);
  const [popupAt, setPopupAt] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { iso, error } = validate(text, noFuture);

  // Blocks the form's submit: the visible field has no name, so nothing else would notice a bad date.
  useEffect(() => {
    inputRef.current?.setCustomValidity(error);
  }, [error]);

  // React resets a form after its action runs, but a controlled value doesn't follow that by itself.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setText(initialText);
      setTouched(false);
      setPopupAt(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [initialText]);

  useEffect(() => {
    if (!popupAt) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPopupAt(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopupAt(null);
    };
    const close = () => setPopupAt(null);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
    };
  }, [popupAt]);

  function togglePopup() {
    if (popupAt) return setPopupAt(null);
    // Fixed position, so a dialog's or table's overflow can't clip the calendar.
    const box = wrapRef.current!.getBoundingClientRect();
    const fitsBelow = box.bottom + POPUP_HEIGHT <= window.innerHeight;
    setPopupAt({
      top: Math.max(8, fitsBelow ? box.bottom + 4 : box.top - POPUP_HEIGHT - 4),
      left: Math.max(8, Math.min(box.left, window.innerWidth - POPUP_WIDTH - 8)),
    });
  }

  return (
    <>
      <div ref={wrapRef} style={{ position: "relative", ...style }}>
        <input type="hidden" name={name} value={iso} />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          required={required}
          value={text}
          placeholder="วว/ดด/ปปปป"
          aria-label={ariaLabel}
          aria-invalid={touched && !!error}
          title="วันที่แบบ วว/ดด/ปปปป (พ.ศ.)"
          className="field"
          style={{ width: "100%", paddingRight: 36, fontVariantNumeric: "tabular-nums" }}
          onChange={(e) => setText(maskDate(e.target.value))}
          onBlur={() => setTouched(true)}
        />
        <button
          type="button"
          aria-label="เปิดปฏิทิน"
          aria-expanded={!!popupAt}
          onClick={togglePopup}
          style={{ position: "absolute", top: 0, bottom: 0, right: 8, display: "flex", alignItems: "center", padding: 0, border: 0, background: "none", color: "var(--muted)", cursor: "pointer" }}
        >
          <CalendarDays size={17} />
        </button>
        {popupAt && (
          <CalendarPopup
            at={popupAt}
            selected={iso}
            noFuture={noFuture}
            onPick={(picked) => {
              setText(formatThaiDate(picked, ""));
              setTouched(true);
              setPopupAt(null);
              inputRef.current?.focus();
            }}
          />
        )}
      </div>
      {touched && error && (
        <span className="footnote" role="alert" style={{ display: "block", marginTop: 4, color: "#b42318" }}>
          {error}
        </span>
      )}
    </>
  );
}

function CalendarPopup({
  at,
  selected,
  noFuture,
  onPick,
}: {
  at: { top: number; left: number };
  selected: string;
  noFuture: boolean;
  onPick: (iso: string) => void;
}) {
  const today = isoDateInThailand();
  const start = selected || today;
  const [year, setYear] = useState(Number(start.slice(0, 4)));
  const [month, setMonth] = useState(Number(start.slice(5, 7)) - 1);

  const thisYear = Number(today.slice(0, 4));
  const lastYear = noFuture ? thisYear : thisYear + 10;
  const years: number[] = [];
  for (let y = Math.max(lastYear, year); y >= Math.min(FIRST_PICKER_YEAR_CE, year); y--) years.push(y);

  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  function shiftMonth(by: number) {
    const d = new Date(Date.UTC(year, month + by, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  const navStyle: CSSProperties = { display: "flex", padding: 4, border: 0, background: "none", color: "var(--ink)", cursor: "pointer" };

  return (
    <div
      role="dialog"
      aria-label="เลือกวันที่"
      style={{ position: "fixed", top: at.top, left: at.left, width: POPUP_WIDTH, zIndex: 200, padding: 10, background: "#fff", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 8px 24px rgba(21, 59, 105, 0.18)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
        <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => shiftMonth(-1)} style={navStyle}>
          <ChevronLeft size={16} />
        </button>
        <select aria-label="เดือน" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="field" style={{ flex: 1, minWidth: 0, padding: "4px 6px" }}>
          {MONTHS.map((label, i) => (
            <option key={label} value={i}>{label}</option>
          ))}
        </select>
        <select aria-label="ปี พ.ศ." value={year} onChange={(e) => setYear(Number(e.target.value))} className="field" style={{ width: 82, padding: "4px 6px" }}>
          {years.map((y) => (
            <option key={y} value={y}>{y + BE_OFFSET}</option>
          ))}
        </select>
        <button type="button" aria-label="เดือนถัดไป" onClick={() => shiftMonth(1)} style={navStyle}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center", fontSize: 13 }}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="footnote" style={{ padding: "2px 0" }}>{w}</span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = iso === selected;
          const disabled = noFuture && iso > today;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-label={formatThaiDate(iso)}
              aria-current={iso === today ? "date" : undefined}
              onClick={() => onPick(iso)}
              style={{
                padding: "6px 0",
                border: iso === today && !isSelected ? "1px solid var(--blue)" : "1px solid transparent",
                borderRadius: 8,
                background: isSelected ? "var(--blue)" : "none",
                color: isSelected ? "#fff" : "var(--ink)",
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

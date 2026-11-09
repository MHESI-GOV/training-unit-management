"use client";

import { useState } from "react";
import { formatPhone, formatPhoneTyping, PHONE_FORMAT_HINT } from "@/lib/phone";

// Phone field used by every form: digits only, dashes inserted as you type, length capped by prefix
// (06/08/09 → XX-XXXX-XXXX, others → XX-XXX-XXXX). The server re-checks with normalizePhone().
export function PhoneInput({
  name = "phone",
  defaultValue,
  required,
  className = "field",
}: {
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(() => formatPhone(defaultValue));
  return (
    <input
      name={name}
      value={value}
      onChange={(e) => setValue(formatPhoneTyping(e.target.value))}
      inputMode="tel"
      autoComplete="tel"
      maxLength={12}
      pattern="0[689]-\d{4}-\d{4}|0[2-57]-\d{3}-\d{4}"
      placeholder="08-1234-5678"
      title={PHONE_FORMAT_HINT}
      required={required}
      className={className}
    />
  );
}

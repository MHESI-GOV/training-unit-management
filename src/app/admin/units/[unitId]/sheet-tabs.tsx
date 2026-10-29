"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, UsersRound, UserRound } from "lucide-react";

export function SheetTabs({ unitId }: { unitId: string }) {
  const path = usePathname();
  const base = `/admin/units/${unitId}`;
  const tabs = [
    { href: base, label: "แดชบอร์ด", icon: <LayoutDashboard size={16} /> },
    { href: `${base}/profile`, label: "โปรไฟล์หน่วยฝึก", icon: <Building2 size={16} /> },
    { href: `${base}/classes`, label: "รุ่นฝึกอบรม", icon: <Users size={16} /> },
    { href: `${base}/learners`, label: "ผู้เรียน", icon: <UsersRound size={16} /> },
    { href: `${base}/instructors`, label: "ผู้สอน", icon: <UserRound size={16} /> },
  ];

  return (
    <nav className="sheet-tabs" aria-label="ข้อมูลหน่วยฝึก">
      {tabs.map((t) => {
        const active = t.href === base ? path === base : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`sheet-tab ${active ? "active" : ""}`}>
            {t.icon}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

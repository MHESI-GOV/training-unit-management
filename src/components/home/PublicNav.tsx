"use client";

import { useState } from "react";
import Link from "next/link";
import { ChefHat, LogIn, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#about", label: "เกี่ยวกับโครงการ" },
  { href: "#stats", label: "สถิติและรายงาน" },
  { href: "#contact", label: "ติดต่อเรา" },
];

// Public-home top navigation. Client component so the ≤860px layout can collapse the section
// links + login into a hamburger panel instead of wrapping onto three stacked rows. On desktop
// it renders exactly as before (links inline, login button on the right).
export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#about");

  return (
    <header className="public-nav">
      <div className="public-nav-inner">
        <div className="public-logo">
          <div className="public-logo-badge">
            <ChefHat size={22} />
          </div>
          <div className="public-logo-text">
            <div className="public-logo-org">กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม</div>
            <div className="public-logo-project">โครงการหนึ่งหมู่บ้าน หนึ่งเชฟอาหารไทย</div>
          </div>
        </div>

        {/* Hamburger — only shown ≤860px via CSS */}
        <button
          type="button"
          className="public-nav-toggle"
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Desktop links + login (inline), or the mobile dropdown panel when open */}
        <div className={`public-nav-collapse ${open ? "open" : ""}`}>
          <nav className="public-nav-links" aria-label="นำทางหลัก">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`public-nav-link ${active === l.href ? "active" : ""}`}
                onClick={() => {
                  setActive(l.href);
                  setOpen(false);
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <Link href="/login" className="public-login-btn" onClick={() => setOpen(false)}>
            <LogIn size={16} />
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </header>
  );
}

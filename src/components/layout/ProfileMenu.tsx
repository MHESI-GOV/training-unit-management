"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserRound, LogOut, Settings } from "lucide-react";
import { signOut } from "@/app/login/actions";

export function ProfileMenu({
  displayName,
  roleLabel,
  email,
  avatarUrl,
}: {
  displayName: string;
  roleLabel: string;
  email: string | null;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (displayName || email || "?").trim().charAt(0).toUpperCase();
  // eslint-disable-next-line @next/next/no-img-element
  const avatarImg = (cls: string) => <img className={cls} src={avatarUrl!} alt="" />;

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? avatarImg("profile-avatar img") : <span className="profile-avatar">{initial}</span>}
        <span className="profile-trigger-text">
          <span className="profile-trigger-name">{displayName}</span>
          <span className="profile-trigger-role">{roleLabel}</span>
        </span>
      </button>

      {open && (
        <div className="profile-pop" role="menu">
          <div className="profile-pop-head">
            {avatarUrl ? avatarImg("profile-avatar lg img") : <span className="profile-avatar lg">{initial}</span>}
            <div style={{ minWidth: 0 }}>
              <div className="profile-pop-name">{displayName}</div>
              <div className="profile-pop-sub">{roleLabel}</div>
              {email && <div className="profile-pop-sub ellipsis">{email}</div>}
            </div>
          </div>

          <div className="profile-pop-divider" />

          <Link href="/account" className="profile-pop-item" role="menuitem" onClick={() => setOpen(false)}>
            <Settings size={16} />
            <span>บัญชีของฉัน</span>
          </Link>

          <div className="profile-pop-divider" />

          <form action={signOut}>
            <button type="submit" className="profile-pop-item danger" role="menuitem">
              <LogOut size={16} />
              <span>ออกจากระบบ</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Compact login trigger for anonymous visitors, kept here so the topbar has one home for the
// account control in both states.
export function LoginTrigger() {
  return (
    <Link href="/login" className="profile-trigger">
      <span className="profile-avatar">
        <UserRound size={16} />
      </span>
      <span className="profile-trigger-text">
        <span className="profile-trigger-name">เข้าสู่ระบบ</span>
      </span>
    </Link>
  );
}

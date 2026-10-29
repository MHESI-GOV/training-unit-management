import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  SlidersHorizontal,
  BookOpen,
  UserRound,
  UsersRound,
  ClipboardList,
  CalendarCheck,
  GraduationCap,
  Image as ImageIcon,
} from "lucide-react";
import type { Profile } from "@/lib/auth/get-profile";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getAvatarUrl } from "@/lib/avatar";
import { ROLE_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { getPendingParticipation } from "@/lib/participation";
import { ParticipationGate } from "@/components/participation/ParticipationGate";
import { ProfileMenu, LoginTrigger } from "./ProfileMenu";

type NavItem = { href: string; label: string; icon: React.ReactNode; id: string };

function navForProfile(profile: Profile | null): NavItem[] {
  if (!profile) return [];

  if (profile.role === "unit_coordinator" && !profile.unit_scope) {
    return [{ href: "/unit-setup", label: "กรอกข้อมูลหน่วยฝึกอบรม", icon: <SlidersHorizontal size={17} />, id: "unit-setup" }];
  }

  if (profile.role === "unit_coordinator") {
    return [
      { href: "/unit/classes", label: "จัดการชั้นเรียน", icon: <Users size={17} />, id: "classes" },
      { href: "/unit/learners", label: "ผู้เรียน (ค้นหา/รายงาน)", icon: <UsersRound size={17} />, id: "learners" },
      { href: "/unit/instructors", label: "คลังวิทยากร", icon: <GraduationCap size={17} />, id: "instructors" },
      { href: "/unit/participation", label: "ยืนยันการเข้าร่วมปีงบ", icon: <CalendarCheck size={17} />, id: "participation" },
      { href: "/courses", label: "หลักสูตร", icon: <BookOpen size={17} />, id: "courses" },
    ];
  }

  if (profile.role === "web_master" || profile.role === "central_staff") {
    const items: NavItem[] = [
      { href: "/admin/units", label: "หน่วยฝึกอบรมทั้งหมด", icon: <Building2 size={17} />, id: "units" },
      { href: "/courses", label: "หลักสูตร", icon: <BookOpen size={17} />, id: "courses" },
    ];
    if (profile.role === "web_master") {
      items.unshift(
        { href: "/admin/users", label: "User Management", icon: <UserRound size={17} />, id: "users" },
        { href: "/admin/participation", label: "รอบยืนยันการเข้าร่วม", icon: <CalendarCheck size={17} />, id: "participation" },
        { href: "/admin/audit-log", label: "Audit Log", icon: <ClipboardList size={17} />, id: "audit" },
        { href: "/admin/storage-audit", label: "ไฟล์ภาพกำพร้า", icon: <ImageIcon size={17} />, id: "storage-audit" },
      );
    }
    return items;
  }

  // executive: dashboard (home) is the only screen -- no extra nav items
  return [];
}

export async function AppShell({
  profile,
  active,
  children,
  eyebrow,
  title,
  unitName,
}: {
  profile: Profile | null;
  active?: string;
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  // Name of the training unit this page is operating within, shown as a prominent bar so it is
  // always clear which unit you are working in. If omitted, it is auto-derived from a Unit
  // Coordinator's own unit_scope (covers every /unit/* page with no per-page wiring).
  unitName?: string | null;
}) {
  const navItems = navForProfile(profile);
  const email = profile ? (await getCurrentProfile()).email : null;
  const avatarUrl = profile ? await getAvatarUrl(profile.avatar_path) : null;

  let currentUnitName: string | null = unitName ?? null;
  if (!currentUnitName && profile?.role === "unit_coordinator" && profile.unit_scope) {
    const { data: unit } = await (await createClient())
      .from("training_units")
      .select("name")
      .eq("unit_id", profile.unit_scope)
      .maybeSingle();
    currentUnitName = unit?.name ?? null;
  }

  // Force the fiscal-year participation popup before any other function: once Web Master opens a
  // round, a Unit Coordinator with an unanswered invite is gated on EVERY page until they respond.
  const pendingParticipation =
    profile?.role === "unit_coordinator" && profile.unit_scope
      ? await getPendingParticipation(await createClient(), profile.unit_scope)
      : null;

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="เมนูหลัก">
        <div>
          <div className="sidebar-kicker">โครงการภาครัฐ</div>
          <div className="sidebar-name">
            หนึ่งหมู่บ้าน
            <br />
            หนึ่งเชฟอาหารไทย
          </div>
        </div>
        <nav className="nav-list" aria-label="นำทางหลัก">
          <Link href="/" className={`nav-btn ${active === "home" ? "active" : ""}`}>
            <LayoutDashboard size={17} />
            <span>แดชบอร์ดภาพรวม</span>
          </Link>
          {navItems.map((item) => (
            <Link key={item.id} href={item.href} className={`nav-btn ${active === item.id ? "active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <p className="sidebar-note desktop-only">ระบบบริหารจัดการหน่วยฝึกอบรม กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม</p>
      </aside>

      <div className="content-col">
        <header className="topbar">
          <div className="topbar-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {currentUnitName && (
                <Building2 size={22} style={{ flex: "0 0 auto", color: "var(--accent, #1d4f82)" }} />
              )}
              <div style={{ minWidth: 0 }}>
                {(currentUnitName ? "หน่วยฝึกอบรมปัจจุบัน" : eyebrow) ? (
                  <p className="topbar-label">{currentUnitName ? "หน่วยฝึกอบรมปัจจุบัน" : eyebrow}</p>
                ) : null}
                <strong className="topbar-title" title={currentUnitName ?? undefined}>
                  {currentUnitName ?? title}
                </strong>
              </div>
            </div>
            {profile ? (
              <ProfileMenu
                displayName={profile.display_name ?? (email ?? "ผู้ใช้")}
                roleLabel={ROLE_LABEL[profile.role] ?? profile.role}
                email={email}
                avatarUrl={avatarUrl}
              />
            ) : (
              <LoginTrigger />
            )}
          </div>
          {currentUnitName && (
            <div className="topbar-unit">
              <span className="topbar-unit-label">เมนูที่กำลังใช้งาน</span>
              <strong className="topbar-unit-name">{title}</strong>
            </div>
          )}
        </header>
        <main className="page">{children}</main>
      </div>
      {pendingParticipation && <ParticipationGate pending={pendingParticipation} />}
    </div>
  );
}

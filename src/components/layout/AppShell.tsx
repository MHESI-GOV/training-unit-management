import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  SlidersHorizontal,
  FileUp,
  BookOpen,
  UserRound,
  UsersRound,
  ClipboardList,
  CalendarCheck,
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
      { href: "/unit/classes", label: "รุ่นฝึกอบรมและวิทยากร", icon: <Users size={17} />, id: "classes" },
      { href: "/unit/learners", label: "ผู้เรียน", icon: <UsersRound size={17} />, id: "learners" },
      { href: "/unit/participation", label: "ยืนยันการเข้าร่วมปีงบ", icon: <CalendarCheck size={17} />, id: "participation" },
      { href: "/unit/testing-center", label: "สถานะศูนย์ทดสอบมาตรฐาน", icon: <ClipboardList size={17} />, id: "testing-center" },
      { href: "/unit/import", label: "นำเข้าผู้เรียน CSV", icon: <FileUp size={17} />, id: "import" },
      { href: "/unit/import-assessments", label: "นำเข้าผลทดสอบ CSV", icon: <FileUp size={17} />, id: "import-assessments" },
      { href: "/unit/import-classes", label: "นำเข้ารุ่นฝึกอบรม CSV", icon: <FileUp size={17} />, id: "import-classes" },
      { href: "/unit/import-instructors", label: "นำเข้าวิทยากร CSV", icon: <FileUp size={17} />, id: "import-instructors" },
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
}: {
  profile: Profile | null;
  active?: string;
  children: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  const navItems = navForProfile(profile);
  const email = profile ? (await getCurrentProfile()).email : null;
  const avatarUrl = profile ? await getAvatarUrl(profile.avatar_path) : null;

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
            <div>
              {eyebrow ? <p className="topbar-label">{eyebrow}</p> : null}
              <strong className="topbar-title">{title}</strong>
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
        </header>
        <main className="page">{children}</main>
      </div>
      {pendingParticipation && <ParticipationGate pending={pendingParticipation} />}
    </div>
  );
}

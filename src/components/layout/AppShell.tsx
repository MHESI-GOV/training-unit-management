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
  Image as ImageIcon,
  LogOut,
  LogIn,
} from "lucide-react";
import type { Profile } from "@/lib/auth/get-profile";
import { ROLE_LABEL } from "@/lib/labels";
import { signOut } from "@/app/login/actions";

type NavItem = { href: string; label: string; icon: React.ReactNode; id: string };

function navForProfile(profile: Profile | null): NavItem[] {
  if (!profile) return [];

  if (profile.role === "unit_coordinator" && !profile.unit_scope) {
    return [{ href: "/unit-setup", label: "กรอกข้อมูลหน่วยฝึกอบรม", icon: <SlidersHorizontal size={17} />, id: "unit-setup" }];
  }

  if (profile.role === "unit_coordinator") {
    return [
      { href: "/unit/profile", label: "โปรไฟล์หน่วยฝึก", icon: <ImageIcon size={17} />, id: "profile" },
      { href: "/unit/classes", label: "รุ่นฝึกอบรมและวิทยากร", icon: <Users size={17} />, id: "classes" },
      { href: "/unit/learners", label: "ผู้เรียน", icon: <UsersRound size={17} />, id: "learners" },
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
        { href: "/admin/audit-log", label: "Audit Log", icon: <ClipboardList size={17} />, id: "audit" },
        { href: "/admin/storage-audit", label: "ไฟล์ภาพกำพร้า", icon: <ImageIcon size={17} />, id: "storage-audit" },
      );
    }
    return items;
  }

  // executive: dashboard (home) is the only screen -- no extra nav items
  return [];
}

export function AppShell({
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
        {profile ? (
          <form action={signOut} style={{ marginTop: 24 }}>
            <button type="submit" className="nav-btn" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
              <LogOut size={17} />
              <span>ออกจากระบบ ({ROLE_LABEL[profile.role] ?? profile.role})</span>
            </button>
          </form>
        ) : (
          <Link href="/login" className="nav-btn" style={{ marginTop: 24, border: "1px solid rgba(255,255,255,0.2)" }}>
            <LogIn size={17} />
            <span>เข้าสู่ระบบ</span>
          </Link>
        )}
        <p className="sidebar-note desktop-only">ระบบบริหารจัดการหน่วยฝึกอบรม กระทรวงการอุดมศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม</p>
      </aside>

      <div className="content-col">
        <header className="topbar">
          <div className="topbar-row">
            <div>
              <p className="topbar-label">{eyebrow}</p>
              <strong className="topbar-title">{title}</strong>
            </div>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}

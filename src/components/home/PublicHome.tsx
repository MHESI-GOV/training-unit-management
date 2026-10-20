import Link from "next/link";
import { Users, GraduationCap, Award, Building2, ChefHat, Soup, Leaf, LogIn } from "lucide-react";

type Kpi = {
  applicants: number | null;
  completed: number | null;
  anamai_passed: number | null;
  dsd_passed: number | null;
  total_units: number;
  units_with_data: number;
};

function formatCount(value: number | null) {
  if (value === null) {
    return <span className="kpi-cell-value suppressed">ข้อมูลน้อยเกินไปที่จะแสดงผลได้</span>;
  }
  return <span className="kpi-cell-value">{value.toLocaleString("th-TH")}</span>;
}

// "มาตรฐานที่ได้รับ" -- total standards achieved across both tracks. If either side is
// suppressed (ST-4, a non-zero count under the 5-person disclosure threshold) the combined
// figure can't be shown either, since it would leak the suppressed side back out by subtraction.
function standardsAchieved(kpi: Kpi): number | null {
  if (kpi.anamai_passed === null || kpi.dsd_passed === null) return null;
  return kpi.anamai_passed + kpi.dsd_passed;
}

export function PublicHome({ kpi }: { kpi: Kpi }) {
  return (
    <div className="public-page">
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
          <nav className="public-nav-links" aria-label="นำทางหลัก">
            <a href="#about" className="public-nav-link active">
              เกี่ยวกับโครงการ
            </a>
            <a href="#units" className="public-nav-link">
              หน่วยฝึกอบรม
            </a>
            <a href="#stats" className="public-nav-link">
              สถิติและรายงาน
            </a>
            <a href="#contact" className="public-nav-link">
              ติดต่อเรา
            </a>
          </nav>
          <Link href="/login" className="public-login-btn">
            <LogIn size={16} />
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      <section id="about" className="hero">
        <div>
          <h1 className="hero-title">หนึ่งหมู่บ้าน หนึ่งเชฟอาหารไทย</h1>
          <p className="hero-subtitle">ระบบบริหารจัดการหน่วยฝึกอบรม</p>
          <p className="hero-desc">
            พัฒนาทักษะเชฟไทย สร้างอาชีพ สร้างรายได้ให้ชุมชน ขับเคลื่อนเศรษฐกิจฐานรากอย่างยั่งยืน
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <Soup className="hero-art-icon" size={220} style={{ top: -30, left: -30 }} />
          <Leaf className="hero-art-icon" size={100} style={{ bottom: 10, right: 20, transform: "rotate(25deg)" }} />
          <div className="hero-art-center">
            <ChefHat size={56} />
          </div>
        </div>
      </section>

      <section id="stats" className="kpi-row">
        <div className="kpi-grid">
          <div className="kpi-cell">
            <div className="kpi-icon blue">
              <Users size={20} />
            </div>
            <div className="kpi-cell-label">ผู้เข้าร่วมโครงการ</div>
            {formatCount(kpi.applicants)}
            <div className="kpi-cell-caption">สะสมทั้งหมด (คน)</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-icon green">
              <GraduationCap size={20} />
            </div>
            <div className="kpi-cell-label">ผู้ผ่านการอบรม</div>
            {formatCount(kpi.completed)}
            <div className="kpi-cell-caption">สะสมทั้งหมด (คน)</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-icon purple">
              <Award size={20} />
            </div>
            <div className="kpi-cell-label">มาตรฐานที่ได้รับ</div>
            {formatCount(standardsAchieved(kpi))}
            <div className="kpi-cell-caption">สะสมทั้งหมด (รายการ)</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-icon orange">
              <Building2 size={20} />
            </div>
            <div className="kpi-cell-label" id="units">
              หน่วยฝึกอบรม
            </div>
            <span className="kpi-cell-value">{kpi.total_units.toLocaleString("th-TH")}</span>
            <div className="kpi-cell-caption">สะสมทั้งหมด (แห่ง)</div>
          </div>
        </div>
      </section>

      <footer id="contact" className="public-footer">
        <p>อัปเดตจากหน่วยฝึกอบรม {kpi.units_with_data.toLocaleString("th-TH")}/{kpi.total_units.toLocaleString("th-TH")} แห่งที่มีข้อมูลผู้เรียน</p>
        <p style={{ marginTop: 6 }}>
          สำหรับผู้ประสานงานหน่วยฝึกอบรม เจ้าหน้าที่ส่วนกลาง หรือผู้ดูแลระบบ กรุณา{" "}
          <Link href="/login" style={{ color: "var(--blue)", fontWeight: 600 }}>
            เข้าสู่ระบบ
          </Link>{" "}
          เพื่อใช้งานฟังก์ชันอื่นเพิ่มเติม
        </p>
      </footer>
    </div>
  );
}

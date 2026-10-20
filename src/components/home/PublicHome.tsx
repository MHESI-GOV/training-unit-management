import Link from "next/link";
import { ChefHat, Soup, Leaf } from "lucide-react";
import { type Overview } from "@/lib/dashboard";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { PublicNav } from "./PublicNav";

export function PublicHome({ ov }: { ov: Overview }) {
  return (
    <div className="public-page">
      <PublicNav />

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

      {/* ภาพรวม — layout เดียวกับ dashboard ฝั่งล็อกอิน (OverviewCards) */}
      <div id="stats" style={{ maxWidth: 1200, margin: "32px auto 0", padding: "0 24px" }}>
        <OverviewCards ov={ov} />
      </div>

      <footer id="contact" className="public-footer">
        <p>อัปเดตจากหน่วยฝึกอบรม {ov.total_units.toLocaleString("th-TH")} แห่งทั่วประเทศ</p>
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

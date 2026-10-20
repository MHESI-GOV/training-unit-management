export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ width: "100%", maxWidth: 400 }}>
      <p className="pill study">หนึ่งหมู่บ้าน หนึ่งเชฟอาหารไทย</p>
      <h1 className="page-title" style={{ marginTop: 12 }}>
        {title}
      </h1>
      {subtitle && <p className="footnote" style={{ marginTop: 6 }}>{subtitle}</p>}
      <div style={{ marginTop: 20 }}>{children}</div>
    </div>
  );
}

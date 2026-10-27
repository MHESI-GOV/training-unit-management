// Documents the columns of a CSV template so users know each field's type/format before importing.
export type FieldSpec = { field: string; type: string; required: boolean; note?: string };

export function FieldSpecTable({ specs }: { specs: FieldSpec[] }) {
  return (
    <div className="table-wrap" style={{ marginBottom: 12 }}>
      <table style={{ fontSize: 13 }}>
        <thead>
          <tr>
            <th>คอลัมน์</th>
            <th>ชนิดข้อมูล</th>
            <th>จำเป็น</th>
            <th>รายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((s) => (
            <tr key={s.field}>
              <td><code>{s.field}</code></td>
              <td>{s.type}</td>
              <td>{s.required ? "✓" : "—"}</td>
              <td>{s.note ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

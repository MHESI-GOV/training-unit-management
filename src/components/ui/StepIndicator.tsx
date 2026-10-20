export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
      {steps.map((label, i) => (
        <span key={label} className={`step ${current === i ? "on" : ""}`}>
          {i + 1}. {label}
        </span>
      ))}
    </div>
  );
}

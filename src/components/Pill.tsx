// src/components/Pill.tsx
export default function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary";
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition shadow-sm";

  const styles =
    tone === "primary"
      ? `
        bg-indigo-50
        text-indigo-700
        ring-1 ring-indigo-200
        shadow-[0_0_0_2px_rgba(99,102,241,0.08)]
      `
      : `
        bg-white
        text-slate-600
        ring-1 ring-slate-200
        hover:bg-slate-50
      `;

  return <span className={`${base} ${styles}`}>{children}</span>;
}
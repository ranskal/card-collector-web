import clsx from "clsx";

type Props = {
  company?: string | null;
  grade?: number | string | null;
  size?: "sm" | "md";
  className?: string;
};

export default function GradeBadge({
  company,
  grade,
  size = "md",
  className,
}: Props) {
  if (!company || grade === null || grade === undefined) return null;

  const c = company.toUpperCase();

  const theme =
    c === "PSA"
      ? {
          ring: "ring-red-300",
          bg: "bg-red-50",
          text: "text-red-700",
        }
      : c === "SGC"
        ? {
            ring: "ring-slate-400",
            bg: "bg-slate-100",
            text: "text-slate-800",
          }
        : c === "BGS"
          ? {
              ring: "ring-blue-300",
              bg: "bg-blue-50",
              text: "text-blue-700",
            }
          : {
              ring: "ring-indigo-300",
              bg: "bg-indigo-50",
              text: "text-indigo-700",
            };

  const sizes =
    size === "sm"
      ? {
          wrap: "w-9 h-9",
          company: "text-[9px]",
          grade: "text-base",
        }
      : {
          wrap: "w-14 h-14",
          company: "text-[11px]",
          grade: "text-lg",
        };

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-full ring-2 shadow-sm",
        theme.bg,
        theme.text,
        theme.ring,
        sizes.wrap,
        className
      )}
      title={`${company} ${grade}`}
    >
      <div className={clsx("font-semibold leading-none", sizes.company)}>
        {company}
      </div>
      <div className={clsx("font-extrabold leading-none", sizes.grade)}>
        {grade}
      </div>
    </div>
  );
}
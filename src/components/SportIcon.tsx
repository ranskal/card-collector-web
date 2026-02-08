type SportIconProps = {
  sport?: string | null;
  className?: string;
};

export default function SportIcon({ sport, className }: SportIconProps) {
  const base = "text-base leading-none";
  const cls = [base, className].filter(Boolean).join(" ");

  let emoji = "🏷️"; // fallback

  switch ((sport ?? "").toLowerCase()) {
    case "baseball":
      emoji = "⚾";
      break;
    case "football":
      emoji = "🏈";
      break;
    case "basketball":
      emoji = "🏀";
      break;
    case "hockey":
      emoji = "🏒";
      break;
    case "soccer":
      emoji = "⚽";
      break;
    case "golf":
      emoji = "⛳";
      break;
    case "tennis":
      emoji = "🎾";
      break;
    case "boxing":
      emoji = "🥊";
      break;
  }

  return (
    <span
      className={cls}
      title={sport || "Sport"}
      aria-label={sport || "Sport"}
    >
      {emoji}
    </span>
  );
}
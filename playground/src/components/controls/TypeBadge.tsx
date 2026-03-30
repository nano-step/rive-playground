const BADGE_COLORS: Record<string, string> = {
  boolean: "#3b82f6",
  number: "#8b5cf6",
  trigger: "#f59e0b",
  string: "#10b981",
  color: "#ec4899",
  enum: "#06b6d4",
  image: "#f97316",
  viewModel: "#a78bfa",
};

interface Props {
  type: string;
}

export function TypeBadge({ type }: Props) {
  const color = BADGE_COLORS[type] ?? "#6b7280";
  return (
    <span className="type-badge" style={{ borderColor: color, color }}>
      {type}
    </span>
  );
}

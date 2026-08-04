// Shared so the same person always renders with the same color/initials
// everywhere (friends list, trip companions, notifications, trip cards).
export const AVATAR_COLORS = [
  "#8B5CF6", "#F97316", "#10B981", "#3B82F6", "#EC4899", "#EAB308",
  "#EF4444", "#14B8A6", "#6366F1", "#84CC16", "#F43F5E", "#0EA5E9",
  "#A855F7", "#22C55E", "#FB923C", "#0891B2",
];

export function avatarColorForId(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

export function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

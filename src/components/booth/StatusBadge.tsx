"use client";

export default function StatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "cyan" | "pink" | "gold" | "warn" | "muted";
}) {
  return <span className={`boothBadge boothBadge--${tone}`}>{label}</span>;
}

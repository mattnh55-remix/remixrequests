"use client";

export default function StatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: string;
}) {
  return <span className={`statusPill statusPill--${tone}`}>{label}</span>;
}

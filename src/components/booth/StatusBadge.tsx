"use client";

export default function StatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: string;
}) {
  const toneClass = tone === "red" ? "alert" : tone;
  return <span className={`statusPill statusPill--${toneClass}`}>{label}</span>;
}

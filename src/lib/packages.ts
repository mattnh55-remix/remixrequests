export type PackageKey = "5_10" | "10_25" | "15_35" | "20_50";

export const PACKAGES: Record<
  PackageKey,
  { label: string; priceCents: number; credits: number }
> = {
  "5_10": { label: "$5 for 10 credits", priceCents: 500, credits: 10 },
  "10_25": { label: "$10 for 25 credits", priceCents: 1000, credits: 25 },
  "15_35": { label: "$15 for 35 credits", priceCents: 1500, credits: 35 },
  "20_50": { label: "$20 for 50 credits", priceCents: 2000, credits: 50 },
};
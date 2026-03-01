import React from "react";

type TrendingItem = {
  id: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
};

export function TrendingRail(props: { items: TrendingItem[] }) {
  const { items } = props;

  if (!items?.length) return null;

  return (
    <div className="neonPanel" style={{ padding: 10 }}>
      <div style={{ padding: "10px 12px 0", fontWeight: 1000, letterSpacing: 0.4 }}>
        Trending at Remix
      </div>
      <div className="neonRail">
        {items.map((it) => (
          <button
            key={it.id}
            className="neonChip"
            onClick={it.onClick}
            style={{ textAlign: "left" }}
          >
            <div className="neonArt" />
            <div>
              <div style={{ fontWeight: 1000, fontSize: 13, lineHeight: 1.1 }}>
                {it.title}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>
                {it.subtitle || "Tap to request"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
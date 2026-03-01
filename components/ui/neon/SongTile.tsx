import React from "react";

export function SongTile(props: {
  title: string;
  artist?: string;
  isHot?: boolean;        // highlight tile (e.g. trending)
  badge?: string;         // e.g. “Play Now”
  subBadge?: string;      // e.g. “1 credit”
  onClick?: () => void;   // your existing request flow

  // NEW (optional, non-breaking):
  boostLabel?: string;       // e.g. "BOOST"
  boostSubLabel?: string;    // e.g. "Play Now"
  onBoost?: () => void;      // hook for premium action
  disabled?: boolean;
}) {
  const {
    title,
    artist,
    isHot,
    badge,
    subBadge,
    onClick,
    boostLabel,
    boostSubLabel,
    onBoost,
    disabled,
  } = props;

  return (
    <div
      className="neonTile"
      data-hot={isHot ? "true" : "false"}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
      onClick={() => {
        if (disabled) return;
        onClick?.();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="neonTileBody" style={{ display: "grid", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div className="neonTileTitle" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>

          {artist ? (
            <div className="neonTileMeta" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {artist}
            </div>
          ) : null}
        </div>

        {(badge || subBadge || isHot) ? (
          <div className="neonBadgeRow">
            {isHot ? <span className="neonBadge neonBadgeHot">HOT</span> : null}
            {badge ? <span className="neonBadge">{badge}</span> : null}
            {subBadge ? <span className="neonBadge">{subBadge}</span> : null}
          </div>
        ) : null}

        {onBoost ? (
          <button
            className="neonBtn neonBtnPrimary"
            style={{
              borderRadius: 16,
              padding: "12px 14px",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              onBoost?.();
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 35%, rgba(255,255,255,0) 70%)",
                transform: "translateX(-120%)",
                animation: "neonShimmer 2.8s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
            <span style={{ position: "relative", display: "grid", gap: 2 }}>
              <span style={{ fontWeight: 1000, letterSpacing: 0.3 }}>
                {boostLabel || "BOOST"}
              </span>
              {boostSubLabel ? (
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  {boostSubLabel}
                </span>
              ) : null}
            </span>
          </button>
        ) : null}

        <style>{`
          @keyframes neonShimmer {
            0% { transform: translateX(-120%); opacity: 0.0; }
            15% { opacity: 1.0; }
            55% { transform: translateX(120%); opacity: 0.7; }
            100% { transform: translateX(120%); opacity: 0.0; }
          }
        `}</style>
      </div>
    </div>
  );
}
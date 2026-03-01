import React from "react";

export function SongTile(props: {
  title: string;
  artist?: string;
  isHot?: boolean;      // highlight tile (e.g. trending)
  badge?: string;       // e.g. “Play Now”
  subBadge?: string;    // e.g. “1 credit”
  onClick?: () => void; // your existing request flow
}) {
  const { title, artist, isHot, badge, subBadge, onClick } = props;

  return (
    <div
      className="neonTile"
      data-hot={isHot ? "true" : "false"}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" ? onClick?.() : null)}
    >
      <div className="neonTileTop">
        <div className="neonTilePulse" />
        {/* Optional: you can render real artwork here later */}
      </div>

      <div className="neonTileBody">
        <div>
          <div className="neonTileTitle">{title}</div>
          <div className="neonTileMeta">{artist || " "}</div>
        </div>

        <div className="neonBadgeRow">
          {badge ? <span className="neonBadge neonBadgeHot">{badge}</span> : null}
          {subBadge ? <span className="neonBadge">{subBadge}</span> : null}
          {isHot ? <span className="neonBadge neonBadgeHot">HOT</span> : null}
        </div>
      </div>
    </div>
  );
}
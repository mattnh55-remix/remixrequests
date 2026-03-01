import React from "react";

export function NowPlayingLane(props: {
  title?: string;
  artist?: string;
  note?: string; // e.g. “DJ APPROVED” or “UP NEXT”
}) {
  const { title, artist, note } = props;

  return (
    <div className="neonPanel neonNow">
      <div className="neonNowTop">
        <div className="neonNowArt" />
        <div>
          <div className="neonNowTitle">{title || "Now Playing"}</div>
          <div className="neonNowMeta">
            {artist || "Loading the vibe…"}
            {note ? ` • ${note}` : ""}
          </div>
          <div className="neonEQ" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>
        </div>
      </div>
    </div>
  );
}
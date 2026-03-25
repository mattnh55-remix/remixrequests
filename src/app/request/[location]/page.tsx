"use client";

import React from "react";
import { PublicTheme } from "@/app/components/ui/public/PublicTheme";

// ⚠️ KEEP ALL YOUR EXISTING IMPORTS BELOW
// DO NOT REMOVE ANY EXISTING HOOKS / STATE / LOGIC IMPORTS
// (paste yours back if missing)

export default function RequestPage({ params }: { params: { location: string } }) {
  const { location } = params;

  // ⚠️ KEEP ALL EXISTING STATE / HOOKS / EFFECTS EXACTLY AS-IS ABOVE RETURN
  // (do not modify any logic)

  return (
    <PublicTheme>
      <div className="rrPageShell">

        {/* ========================= */}
        {/* HERO STRIP (QUEUE STYLE)  */}
        {/* ========================= */}
        <div className="rrHeroGrid">

          {/* LEFT: LOGO */}
          <div className="rrLogoCard">
            <img src="/logo.png" alt="logo" />
          </div>

          {/* CENTER: TITLE */}
          <div className="rrHeroCard">
            <div className="rrTitle">REQUEST A SONG</div>
            <div className="rrTitleSub">
              Search, vote, and control the playlist
            </div>
          </div>

          {/* RIGHT: POINTS */}
          <div className="rrPointsCard">
            <div className="rrHudLabel">POINTS</div>
            <div className="rrHudValue">
              {/* ⚠️ KEEP YOUR EXISTING BALANCE VARIABLE */}
              {balance ?? 0}
            </div>

            <button
              className="rrBtn"
              onClick={() => {
                // ⚠️ KEEP EXISTING OPEN BUY / DRAWER HANDLER
                openBuyPoints?.();
              }}
            >
              Add Points
            </button>
          </div>
        </div>

        {/* ========================= */}
        {/* TEASER / LOGIN STATE      */}
        {/* ========================= */}

        {!isVerified && (
          <div className="rrNoticeCard">
            <div className="rrTitleSub">
              Get your first points free.
            </div>

            <div className="rrMessage">
              Enter your phone number to unlock your credits and start making requests.
            </div>

            {/* ⚠️ KEEP YOUR EXISTING INPUT + VERIFY HANDLERS */}
            <div className="rrPanelBody" style={{ marginTop: 10 }}>
              <input
                className="rrInput"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <button
                className="rrBtn"
                onClick={handleStartAuth}
                style={{ marginTop: 8 }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ========================= */}
        {/* SEARCH PANEL              */}
        {/* ========================= */}

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div className="rrPanelTitle">Search Songs</div>
            <div className="rrPanelSub">Find something to play</div>
          </div>

          <div className="rrPanelBody">
            {/* ⚠️ KEEP YOUR EXISTING SEARCH INPUT + HANDLER */}
            <input
              className="rrInput"
              placeholder="Search songs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ========================= */}
        {/* RESULTS PANEL             */}
        {/* ========================= */}

        <div className="rrPanel">
          <div className="rrPanelHead">
            <div className="rrPanelTitle">Results</div>
            <div className="rrPanelSub">
              Tap to request or boost
            </div>
          </div>

          <div className="rrPanelBody">

            {results?.length === 0 && (
              <div className="rrMessage">
                Start typing to search for songs.
              </div>
            )}

            {results?.map((track: any) => (
              <div key={track.id} className="rrQueueRow">

                <div className="rrQueueMeta">
                  <div className="rrQueueTitle">{track.title}</div>
                  <div className="rrQueueSub">{track.artist}</div>
                </div>

                <div className="rrQueueActions">

                  <button
                    className="rrBtnGhost"
                    onClick={() => handleRequest(track)}
                  >
                    Request
                  </button>

                  <button
                    className="rrBtn"
                    onClick={() => handleBoost(track)}
                  >
                    Play Now
                  </button>

                </div>
              </div>
            ))}

          </div>
        </div>

        {/* ========================= */}
        {/* LOWER DRAWER (UNTOUCHED)  */}
        {/* ========================= */}

        {/* ⚠️ DO NOT MODIFY YOUR EXISTING DRAWER */}
        {/* Leave your current drawer JSX EXACTLY as-is below */}
        {renderDrawer?.()}

        {/* ========================= */}
        {/* FOOTER                   */}
        {/* ========================= */}

        <div className="rrFooterBar">
          <div className="rrFooterInner">

            <button
              className="rrFooterCta"
              onClick={() => {
                window.location.href = `/queue/${location}`;
              }}
            >
              Back to Queue
            </button>

            <button
              className="rrBtn"
              onClick={openBuyPoints}
            >
              Get Points
            </button>

          </div>
        </div>

      </div>
    </PublicTheme>
  );
}
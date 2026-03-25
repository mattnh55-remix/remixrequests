"use client";

export default function PublicGunmetalTheme() {
  return (
    <style jsx global>{`
      :root {
        --rr-bg: #05070f;
        --rr-bg-2: #0a111d;
        --rr-surface: linear-gradient(180deg, rgba(17, 24, 37, 0.94) 0%, rgba(8, 13, 22, 0.98) 100%);
        --rr-surface-2: linear-gradient(135deg, rgba(23, 32, 48, 0.92) 0%, rgba(9, 14, 23, 0.98) 100%);
        --rr-surface-3: linear-gradient(90deg, rgba(18, 27, 42, 0.96) 0%, rgba(13, 20, 33, 0.98) 55%, rgba(8, 14, 23, 0.98) 100%);
        --rr-panel-border: rgba(108, 137, 186, 0.18);
        --rr-text: #f3f6fb;
        --rr-text-soft: #b3bfd2;
        --rr-text-dim: #7c899f;
        --rr-line-soft: rgba(255, 255, 255, 0.05);
        --rr-blue: #4d8fe4;
        --rr-blue-2: #2f6fc6;
        --rr-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
        --rr-radius-xl: 12px;
        --rr-radius-lg: 10px;
        --rr-radius: 8px;
        --rr-radius-sm: 7px;
        --rr-max: 560px;
        --rr-hero-height: 96px;
      }

      * { box-sizing: border-box; }

      html,
      body {
        min-height: 100%;
        background:
          radial-gradient(circle at 20% 0%, rgba(80, 90, 140, 0.15), transparent 40%),
          linear-gradient(180deg, #05070f 0%, #070a14 100%);
        color: var(--rr-text);
      }

      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .rrPublicPage {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
      }

      .rrPublicShell {
        width: min(var(--rr-max), calc(100vw - 10px));
        margin: 0 auto;
        padding: 10px 0 84px;
        position: relative;
        z-index: 1;
      }

      .rrHeroGrid {
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr) 88px;
        gap: 8px;
        align-items: stretch;
        margin-bottom: 8px;
      }

      .rrLogoCard,
      .rrHeroCard,
      .rrPointsCard,
      .rrPanel,
      .rrNoticeCard,
      .rrMessage {
        border-radius: var(--rr-radius-xl);
        background: var(--rr-surface);
        border: 1px solid var(--rr-panel-border);
        box-shadow: var(--rr-shadow);
      }

      .rrLogoCard,
      .rrHeroCard,
      .rrPointsCard {
        min-height: var(--rr-hero-height);
        height: var(--rr-hero-height);
      }

      .rrLogoCard {
        display: grid;
        place-items: center;
        padding: 6px;
      }

      .rrBrandLogo {
        width: 42px;
        height: 42px;
        border-radius: var(--rr-radius);
        overflow: hidden;
        border: 1px solid rgba(120, 151, 201, 0.16);
        background: linear-gradient(180deg, rgba(25, 34, 49, 0.94), rgba(11, 17, 28, 0.98));
        display: grid;
        place-items: center;
      }

      .rrBrandLogo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .rrBrandBadge {
        min-width: 42px;
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(102, 151, 232, 0.2);
        background: linear-gradient(180deg, rgba(25, 38, 58, 0.95), rgba(12, 20, 32, 0.98));
        font-weight: 1000;
        font-size: 9px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .rrHeroCard {
        padding: 8px 10px;
        min-width: 0;
        background: var(--rr-surface-3);
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .rrHeroKicker {
        color: #95a4ba;
        font-size: 8px;
        font-weight: 1000;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        margin-bottom: 1px;
      }

      .rrHeroLabel {
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--rr-text-soft);
        margin-bottom: 2px;
      }

      .rrTitle {
        margin: 0;
        font-size: clamp(13px, 5.3vw, 20px);
        line-height: 0.92;
        font-weight: 1000;
        letter-spacing: -0.04em;
        text-transform: uppercase;
      }

      .rrTitleSub {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 10px;
        line-height: 1.18;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .rrHeroInlineRow,
      .rrChipRow,
      .rrNoticeActions,
      .rrPointsActions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .rrHeroInlineRow { margin-top: 5px; }

      .rrPointsCard {
        padding: 6px;
        display: grid;
        grid-template-rows: auto auto 1fr 1fr;
        align-content: stretch;
        gap: 5px;
      }

      .rrHudLabel {
        font-size: 8px;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--rr-text-dim);
        text-align: center;
      }

      .rrHudValue {
        font-size: 18px;
        line-height: 1;
        font-weight: 1000;
        text-align: center;
      }

      .rrBtn,
      .rrBtnGhost,
      .rrVoteBtn {
        appearance: none;
        border: 1px solid rgba(117, 145, 197, 0.22);
        border-radius: var(--rr-radius);
        color: #fff;
        font-weight: 900;
        font-size: 11px;
        letter-spacing: 0.01em;
        min-height: 28px;
        padding: 0 9px;
        cursor: pointer;
        transition: transform 0.14s ease, border-color 0.14s ease, opacity 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
      }

      .rrBtn:hover,
      .rrBtnGhost:hover,
      .rrVoteBtn:hover { filter: brightness(1.06); }

      .rrBtn:disabled,
      .rrBtnGhost:disabled,
      .rrVoteBtn:disabled {
        opacity: 0.48;
        cursor: not-allowed;
      }

      .rrBtn:not(:disabled):active,
      .rrBtnGhost:not(:disabled):active,
      .rrVoteBtn:not(:disabled):active {
        transform: translateY(1px);
      }

      .rrBtn {
        background: linear-gradient(180deg, var(--rr-blue) 0%, var(--rr-blue-2) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 18px rgba(32, 83, 155, 0.28);
      }

      .rrBtnGhost,
      .rrMuteBtn,
      .rrVoteBtnGhost {
        background: linear-gradient(180deg, rgba(43, 53, 72, 0.84), rgba(18, 26, 39, 0.94));
      }

      .rrPointsCard .rrBtn,
      .rrPointsCard .rrBtnGhost,
      .rrPointsCard .rrMuteBtn {
        width: 100%;
        min-height: 26px;
        font-size: 10px;
        padding: 0 7px;
      }

      .rrPanel,
      .rrNoticeCard,
      .rrMessage {
        overflow: hidden;
        margin-bottom: 8px;
      }

      .rrPanelHead {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 11px 7px;
        border-bottom: 1px solid var(--rr-line-soft);
        background: linear-gradient(180deg, rgba(15, 24, 38, 0.5), rgba(15, 24, 38, 0));
      }

      .rrPanelTitle,
      .rrNoticeTitle {
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .rrPanelSub,
      .rrNoticeText {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 11px;
        line-height: 1.35;
      }

      .rrPanelBody {
        padding: 9px 11px 11px;
      }

      .rrPanelBodyGrid,
      .rrSectionStack,
      .rrSectionIntro {
        display: grid;
        gap: 6px;
      }

      .rrStatusPill,
      .rrTag,
      .rrMetaPill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 18px;
        padding: 0 7px;
        border-radius: 999px;
        font-size: 8px;
        font-weight: 1000;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .rrStatusPill {
        background: rgba(255, 255, 255, 0.05);
        color: #d8e2f5;
      }

      .rrStatusPill--live {
        background: rgba(31, 86, 132, 0.34);
        border-color: rgba(105, 182, 255, 0.3);
        color: #cfe9ff;
      }

      .rrStatusPill--warn {
        background: rgba(103, 76, 18, 0.34);
        border-color: rgba(255, 214, 122, 0.2);
        color: #ffdf96;
      }

      .rrTag--request {
        background: rgba(128, 42, 42, 0.38);
        color: #ffd4d4;
        border-color: rgba(255, 149, 149, 0.16);
      }

      .rrTag--boost {
        background: rgba(99, 30, 68, 0.4);
        color: #ffd2f3;
        border-color: rgba(236, 141, 219, 0.16);
      }

      .rrTag--interstitial {
        background: rgba(24, 74, 102, 0.42);
        color: #c7eeff;
        border-color: rgba(105, 201, 255, 0.2);
      }

      .rrMetaPill {
        background: rgba(255, 255, 255, 0.06);
        color: #dbe5fb;
      }

      .rrNoticeCard { padding: 10px 11px; }

      .rrArt {
        width: 34px;
        height: 34px;
        overflow: hidden;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(135deg, rgba(46, 56, 74, 0.9), rgba(21, 28, 42, 0.96));
        display: grid;
        place-items: center;
      }

      .rrArt img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .rrArtFallback {
        font-size: 8px;
        font-weight: 1000;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #cad7ef;
      }

      .rrQueueRow {
        display: grid;
        grid-template-columns: 26px 34px minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        border-radius: var(--rr-radius-lg);
        padding: 7px 8px;
        background: linear-gradient(90deg, rgba(18, 27, 43, 0.96) 0%, rgba(10, 17, 28, 0.98) 70%, rgba(11, 16, 28, 0.98) 100%);
        border: 1px solid rgba(125, 156, 206, 0.12);
      }

      .rrQueueRow--emphasis {
        background: linear-gradient(90deg, rgba(27, 40, 62, 0.98) 0%, rgba(12, 20, 33, 0.98) 64%, rgba(58, 28, 58, 0.95) 100%);
        border-color: rgba(136, 169, 227, 0.18);
      }

      .rrQueueRank {
        width: 26px;
        height: 26px;
        border-radius: var(--rr-radius-sm);
        border: 1px solid rgba(125, 156, 206, 0.16);
        display: grid;
        place-items: center;
        color: #dbe5fb;
        font-weight: 1000;
        font-size: 12px;
        background: linear-gradient(180deg, rgba(25, 35, 52, 0.94), rgba(12, 19, 31, 0.98));
      }

      .rrQueueCopy { min-width: 0; }

      .rrQueueTopline {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .rrQueueTitle {
        font-size: 13px;
        font-weight: 1000;
        letter-spacing: -0.02em;
        line-height: 1.08;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .rrQueueMetaInline {
        color: var(--rr-text-soft);
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .rrQueueTagRow {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        margin-top: 3px;
      }

      .rrQueueRight {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .rrVoteRail {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .rrVoteBtn {
        min-height: 28px;
        height: 28px;
        padding: 0 7px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
      }

      .rrVoteBtnPrimary {
        background: linear-gradient(180deg, rgba(77, 143, 228, 0.98), rgba(47, 111, 198, 0.99));
      }

      .rrVoteCount {
        font-size: 11px;
        font-weight: 1000;
        line-height: 1;
      }

      .rrScorePill { min-width: 52px; }

      .rrEmpty {
        border-radius: var(--rr-radius-lg);
        border: 1px dashed rgba(125, 156, 206, 0.2);
        background: rgba(255, 255, 255, 0.03);
        padding: 14px;
        color: var(--rr-text-soft);
        text-align: center;
        font-size: 13px;
      }

      .rrInput {
        width: 100%;
        min-height: 38px;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(117, 145, 197, 0.22);
        background: linear-gradient(180deg, rgba(16, 24, 37, 0.96), rgba(9, 15, 24, 0.98));
        color: var(--rr-text);
        padding: 0 12px;
        outline: none;
      }

      .rrInput::placeholder { color: var(--rr-text-dim); }

      .rrInput:focus {
        border-color: rgba(105, 182, 255, 0.34);
        box-shadow: 0 0 0 1px rgba(61, 130, 215, 0.12);
      }

      .rrInlineForm {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
      }

      .rrMessage {
        padding: 11px 12px;
        font-size: 12px;
        color: #dfe8fb;
      }

      .rrFooterBar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
        background: linear-gradient(180deg, rgba(5, 8, 13, 0.04), rgba(5, 8, 13, 0.92));
        backdrop-filter: blur(12px);
      }

      .rrFooterInner {
        width: min(var(--rr-max), calc(100vw - 10px));
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
      }

      .rrFooterCta { width: 100%; }

      @media (max-width: 520px) {
        .rrPublicShell,
        .rrFooterInner {
          width: calc(100vw - 10px);
        }

        .rrHeroGrid {
          grid-template-columns: 54px minmax(0, 1fr) 82px;
          gap: 6px;
        }

        .rrLogoCard,
        .rrHeroCard,
        .rrPointsCard {
          min-height: 92px;
          height: 92px;
        }

        .rrBrandLogo,
        .rrBrandBadge {
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
        }

        .rrTitle {
          font-size: clamp(12px, 5vw, 18px);
        }

        .rrTitleSub {
          font-size: 9px;
          line-height: 1.15;
        }

        .rrHudLabel {
          font-size: 7px;
          letter-spacing: 0.16em;
        }

        .rrHudValue {
          font-size: 16px;
        }

        .rrPointsCard .rrBtn,
        .rrPointsCard .rrBtnGhost,
        .rrPointsCard .rrMuteBtn {
          min-height: 24px;
          font-size: 9px;
          padding: 0 5px;
        }

        .rrHeroInlineRow {
          gap: 4px;
          margin-top: 4px;
        }

        .rrStatusPill,
        .rrTag,
        .rrMetaPill {
          min-height: 17px;
          padding: 0 6px;
          font-size: 7px;
        }

        .rrInlineForm {
          grid-template-columns: 1fr;
        }

        .rrQueueRow {
          grid-template-columns: 24px 32px minmax(0, 1fr) auto;
          gap: 6px;
        }

        .rrVoteBtn {
          padding: 0 6px;
        }

        .rrQueueMetaInline {
          display: none;
        }
      }
    `}</style>
  );
}

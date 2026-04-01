"use client";

export default function PublicGunmetalTheme() {
  return (
    <style jsx global>{`
      :root {
        --rr-bg: #05070f;
        --rr-bg-2: #0a111d;
        --rr-surface: linear-gradient(180deg, rgba(17, 24, 37, 0.94) 0%, rgba(8, 13, 22, 0.98) 100%);
        --rr-surface-2: linear-gradient(135deg, rgba(23, 32, 48, 0.92) 0%, rgba(9, 14, 23, 0.98) 100%);
        --rr-surface-3: linear-gradient(
          90deg,
          rgba(18, 27, 42, 0.96) 0%,
          rgba(13, 20, 33, 0.98) 55%,
          rgba(8, 14, 23, 0.98) 100%
        );
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

      * {
        box-sizing: border-box;
      }

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
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
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
        grid-template-columns: 66px minmax(0, 1fr) 82px;
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
        padding: 5px;
      }

      .rrBrandLogo {
        width: 46px;
        height: 46px;
        border-radius: var(--rr-radius);
        overflow: hidden;
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
        padding: 8px 9px 7px;
        min-width: 0;
        background: var(--rr-surface-3);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      }

      .rrTitle {
        margin: 0;
        font-size: clamp(16px, 5.5vw, 22px);
        line-height: 0.92;
        font-weight: 1000;
        letter-spacing: -0.04em;
        text-transform: uppercase;
      }

      .rrTitleSub {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 10px;
        line-height: 1.15;
        display: -webkit-box;
        -webkit-line-clamp: 3;
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

      .rrHeroInlineRow {
        display: none;
      }

      .rrPointsCard {
        padding: 6px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: stretch;
        gap: 3px;
      }

      .rrPointsStack {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        height: 100%;
      }

      .rrHudLabel {
        font-size: 6px;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--rr-text-dim);
        text-align: center;
      }

      .rrHudValue {
        font-size: 17px;
        line-height: 1;
        font-weight: 1000;
        margin: 0;
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
        padding: 6px 9px;
        cursor: pointer;
        transition:
          transform 0.14s ease,
          border-color 0.14s ease,
          opacity 0.14s ease,
          box-shadow 0.14s ease,
          filter 0.14s ease;

        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        white-space: normal;
        overflow: visible;
        text-overflow: unset;
        word-break: break-word;
        line-height: 1.15;
      }

      .rrBtn span,
      .rrBtnGhost span,
      .rrVoteBtn span {
        display: block;
        width: 100%;
        white-space: normal;
        overflow: visible;
        text-overflow: unset;
        word-break: break-word;
        line-height: 1.15;
      }

      .rrBtn:hover,
      .rrBtnGhost:hover,
      .rrVoteBtn:hover {
        filter: brightness(1.06);
      }

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
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 8px 18px rgba(32, 83, 155, 0.28);
      }

      .rrBtnGhost,
      .rrMuteBtn,
      .rrVoteBtnGhost {
        background: linear-gradient(180deg, rgba(43, 53, 72, 0.84), rgba(18, 26, 39, 0.94));
      }

      .rrBtn--full {
        width: 100%;
        justify-content: center;
      }

      .rrPointsCard .rrBtn {
        width: 100%;
        min-height: 20px;
        height: 20px;
        font-size: 8px;
        padding: 0 6px;
        line-height: 1;
        margin-top: 1px;
      }

      .rrPointsCard .rrBtnGhost,
      .rrPointsCard .rrMuteBtn {
        width: 100%;
        min-height: 22px;
        height: 22px;
        font-size: 9px;
        padding: 0 6px;
        line-height: 1;
      }

      .rrPanel,
      .rrNoticeCard,
      .rrMessage {
        overflow: hidden;
        margin-bottom: 8px;
      }

      .rrNoticeCard {
        padding: 10px 11px;
      }

      .rrNoticeActions--full {
        width: 100%;
      }

      .rrNoticeActions--full .rrBtn {
        width: 100%;
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

      .rrPanelHead--centered {
        position: relative;
        justify-content: center;
        text-align: center;
      }

      .rrPanelHead--centered > div:first-child {
        width: 100%;
      }

      .rrPanelHead--centered .rrStatusPill {
        position: absolute;
        right: 11px;
        top: 10px;
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

      .rrArt img,
      .rrRequestArt img {
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

      .rrRequestArt {
        overflow: hidden;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(135deg, rgba(46, 56, 74, 0.9), rgba(21, 28, 42, 0.96));
        display: grid;
        place-items: center;
        flex-shrink: 0;
      }

      .rrRequestArt--lg {
        width: 100%;
        aspect-ratio: 1 / 1;
        height: auto;
      }

      .rrRequestChipScrollerWrap {
        position: relative;
        margin-top: 10px;
      }

      .rrRequestChipScroller {
        display: flex;
        flex-wrap: nowrap;
        gap: 6px;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        padding-bottom: 2px;
        padding-right: 24px;
      }

      .rrRequestChipScroller::-webkit-scrollbar {
        display: none;
      }

      .rrRequestChip {
        appearance: none;
        flex: 0 0 auto;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(117, 145, 197, 0.22);
        background: linear-gradient(180deg, rgba(43, 53, 72, 0.84), rgba(18, 26, 39, 0.94));
        color: #fff;
        font-size: 11px;
        font-weight: 900;
        cursor: pointer;
      }

      .rrRequestChip.is-active {
        background: linear-gradient(180deg, rgba(77, 143, 228, 0.98), rgba(47, 111, 198, 0.99));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 8px 18px rgba(32, 83, 155, 0.18);
      }

      .rrRequestChipHint {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 24px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 4px;
        color: #9fd0ff;
        font-size: 16px;
        font-weight: 1000;
        pointer-events: none;
        background: linear-gradient(90deg, rgba(5, 7, 15, 0), rgba(5, 7, 15, 0.92));
      }

      .rrTrendingRail,
      .rrSongTileGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .rrSongTile {
        display: grid;
        grid-template-rows: auto auto auto;
        gap: 8px;
        border-radius: 12px;
        padding: 10px;
        background: linear-gradient(
          180deg,
          rgba(18, 27, 43, 0.96) 0%,
          rgba(10, 17, 28, 0.98) 70%,
          rgba(11, 16, 28, 0.98) 100%
        );
        border: 1px solid rgba(125, 156, 206, 0.12);
        transition: box-shadow 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
      }

      .rrSongTile--success {
        border-color: rgba(84, 219, 170, 0.3);
        box-shadow: 0 0 0 1px rgba(84, 219, 170, 0.18), 0 12px 28px rgba(0, 0, 0, 0.36);
      }

      .rrSongTileCopy {
        min-width: 0;
      }

      .rrSongTileTitle {
        font-size: 14px;
        font-weight: 1000;
        line-height: 1.08;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .rrSongTileMeta {
        margin-top: 4px;
        font-size: 12px;
        color: var(--rr-text-soft);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .rrSongMetaRow {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
        margin-top: 6px;
      }

      .rrSongTileActions {
        display: grid;
        gap: 6px;
      }

      .rrSongTileActions button {
        width: 100%;
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

      .rrQueueCopy {
        min-width: 0;
      }

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

      .rrScorePill {
        min-width: 52px;
      }

      .rrOverlay {
        position: fixed;
        inset: 0;
        z-index: 90;
        background: rgba(2, 5, 10, 0.72);
        backdrop-filter: blur(8px);
        display: grid;
        align-items: end;
      }

      .rrDrawer {
        width: min(560px, 100vw);
        margin: 0 auto;
        border-top-left-radius: 16px;
        border-top-right-radius: 16px;
        border: 1px solid rgba(108, 137, 186, 0.18);
        background: linear-gradient(180deg, rgba(17, 24, 37, 0.98) 0%, rgba(8, 13, 22, 0.995) 100%);
        box-shadow: 0 -14px 40px rgba(0, 0, 0, 0.42);
        overflow: hidden;
      }

      .rrDrawerHead {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        background: linear-gradient(180deg, rgba(15, 24, 38, 0.5), rgba(15, 24, 38, 0));
      }

      .rrDrawerTitle {
        font-size: 13px;
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .rrDrawerTitle--small {
        font-size: 12px;
      }

      .rrDrawerSub {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 12px;
        line-height: 1.35;
      }

      .rrDrawerBody {
        padding: 12px;
      }

      .rrCloseBtn {
        min-width: 72px;
      }

      .rrStack {
        display: grid;
        gap: 8px;
      }

      .rrDivider {
        height: 1px;
        background: rgba(255, 255, 255, 0.07);
        margin: 4px 0;
      }

      .rrHelper {
        font-size: 12px;
        color: var(--rr-text-soft);
        line-height: 1.35;
      }

      .rrPackList {
        display: grid;
        gap: 8px;
      }

      .rrPackRow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        border-radius: 10px;
        padding: 9px 10px;
        background: linear-gradient(
          90deg,
          rgba(18, 27, 43, 0.96) 0%,
          rgba(10, 17, 28, 0.98) 70%,
          rgba(11, 16, 28, 0.98) 100%
        );
        border: 1px solid rgba(125, 156, 206, 0.12);
      }

      .rrPackCopy {
        min-width: 0;
      }

      .rrPackTitle {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 1000;
        line-height: 1.1;
      }

      .rrPackMeta {
        margin-top: 4px;
        font-size: 12px;
        color: var(--rr-text-soft);
      }

      .rrTwoCol {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
      }

.rrDrawer--buy {
  max-width: 560px;
}

.rrDrawerHead--buy {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.rrBuyLead {
  margin-bottom: 10px;
  padding: 10px 11px;
  border-radius: 10px;
  border: 1px solid rgba(108, 137, 186, 0.16);
  background: linear-gradient(180deg, rgba(18, 27, 43, 0.92), rgba(10, 16, 27, 0.96));
}

.rrBuyLeadTitle {
  font-size: 12px;
  font-weight: 1000;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rrBuyLeadText {
  margin-top: 4px;
  font-size: 12px;
  color: var(--rr-text-soft);
  line-height: 1.35;
}

.rrBuyPackGrid {
  display: grid;
  gap: 10px;
}

.rrBuyPackCard {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(125, 156, 206, 0.12);
  background: linear-gradient(
    180deg,
    rgba(18, 27, 43, 0.96) 0%,
    rgba(10, 17, 28, 0.98) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
}

.rrBuyPackCard--featured {
  border-color: rgba(77, 143, 228, 0.45);
  box-shadow:
    0 0 0 1px rgba(77, 143, 228, 0.16),
    0 12px 28px rgba(0, 0, 0, 0.34);
  background: linear-gradient(
    180deg,
    rgba(26, 38, 58, 0.98) 0%,
    rgba(11, 18, 31, 0.99) 100%
  );
}

.rrBuyPackTop {
  display: grid;
  gap: 4px;
}

.rrBuyPackTitleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rrBuyPackTitle {
  font-size: 18px;
  font-weight: 1000;
  line-height: 1;
  letter-spacing: -0.03em;
}

.rrBuyPackSubtitle {
  font-size: 12px;
  color: var(--rr-text-soft);
  line-height: 1.35;
}

.rrBuyPackValueRow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.rrBuyPackPoints {
  font-size: 13px;
  font-weight: 1000;
  color: #dfe8fb;
}

.rrBuyPackUsage {
  font-size: 11px;
  color: var(--rr-text-dim);
}

.rrBuyPackPrice {
  font-size: 22px;
  font-weight: 1000;
  line-height: 1;
  letter-spacing: -0.03em;
}

.rrBuyPackBadge--featured {
  border-color: rgba(77, 143, 228, 0.38);
  background: rgba(77, 143, 228, 0.16);
}

.rrBtn--featuredPack {
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.18),
    0 10px 22px rgba(32, 83, 155, 0.34);
}

@media (max-width: 520px) {
  .rrBuyPackCard {
    padding: 11px;
    gap: 7px;
  }

  .rrBuyPackTitle {
    font-size: 16px;
  }

  .rrBuyPackPrice {
    font-size: 20px;
  }

  .rrBuyLeadTitle {
    font-size: 11px;
  }

  .rrBuyLeadText,
  .rrBuyPackSubtitle {
    font-size: 11px;
  }
}

      .rrToast {
        position: fixed;
        left: 8px;
        right: 8px;
        bottom: calc(60px + env(safe-area-inset-bottom));
        z-index: 85;
      }

      .rrToastInner {
        width: min(var(--rr-max), calc(100vw - 16px));
        margin: 0 auto;
        border-radius: 12px;
        border: 1px solid rgba(108, 137, 186, 0.18);
        background: linear-gradient(180deg, rgba(17, 24, 37, 0.98) 0%, rgba(8, 13, 22, 0.995) 100%);
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
        padding: 8px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
      }

      .rrToastText {
        font-size: 12px;
        color: #dfe8fb;
      }

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

      .rrInput::placeholder {
        color: var(--rr-text-dim);
      }

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
  bottom: 150px;
  z-index: 79;
  padding: 0 12px;
  pointer-events: none;
}

.rrFooterInner {
  max-width: 860px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  pointer-events: auto;
}

      .rrFooterCta {
        width: 100%;
      }

      @media (max-width: 520px) {
        .rrPublicShell,
        .rrFooterInner {
          width: calc(100vw - 10px);
        }

        .rrHeroGrid {
          grid-template-columns: 60px minmax(0, 1fr) 78px;
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
          font-size: clamp(15px, 5.2vw, 19px);
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
          font-size: 15px;
        }

        .rrPointsCard .rrBtn,
        .rrPointsCard .rrBtnGhost,
        .rrPointsCard .rrMuteBtn {
          min-height: 22px;
          font-size: 8px;
          padding: 0 5px;
        }

        .rrStatusPill,
        .rrTag,
        .rrMetaPill {
          min-height: 17px;
          padding: 0 6px;
          font-size: 7px;
        }

        .rrPanelHead--centered .rrStatusPill {
          right: 10px;
          top: 10px;
        }

        .rrInlineForm,
        .rrPackRow,
        .rrTwoCol,
        .rrToastInner {
          grid-template-columns: 1fr;
        }

        .rrTrendingRail,
        .rrSongTileGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .rrSongTile {
          padding: 8px;
        }

        .rrSongTileTitle {
          font-size: 13px;
        }

        .rrSongTileMeta {
          font-size: 11px;
        }

        .rrSongTileActions {
          gap: 6px;
        }

        .rrRequestChipScroller {
          gap: 5px;
          padding-right: 22px;
        }

        .rrRequestChip {
          min-height: 26px;
          padding: 0 9px;
          font-size: 10px;
        }
      }

      .rrTextarea {
        width: 100%;
        min-height: 110px;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(117, 145, 197, 0.22);
        background: linear-gradient(180deg, rgba(16, 24, 37, 0.96), rgba(9, 15, 24, 0.98));
        color: var(--rr-text);
        padding: 11px 12px;
        outline: none;
        resize: vertical;
        font: inherit;
      }

      .rrTextarea::placeholder {
        color: var(--rr-text-dim);
      }

      .rrTextarea:focus {
        border-color: rgba(105, 182, 255, 0.34);
        box-shadow: 0 0 0 1px rgba(61, 130, 215, 0.12);
      }

      .rrField {
        display: grid;
        gap: 6px;
      }

      .rrFieldLabel {
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #dfe8fb;
      }

      .rrFieldMetaRow {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
      }

      .rrFieldMetaText {
        font-size: 11px;
        color: var(--rr-text-dim);
      }

      .rrProductGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
      }

      .rrShoutCard {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        min-height: 148px;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid rgba(123, 157, 213, 0.18);
        background:
          radial-gradient(circle at 14% 12%, rgba(92, 142, 220, 0.16), transparent 34%),
          linear-gradient(180deg, rgba(24, 37, 58, 0.98) 0%, rgba(12, 21, 34, 0.985) 54%, rgba(8, 14, 23, 0.995) 100%);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.06),
          inset 0 -1px 0 rgba(67, 101, 152, 0.12),
          0 10px 24px rgba(0, 0, 0, 0.26);
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 8px;
        text-align: left;
        transition:
          transform 0.16s ease,
          border-color 0.16s ease,
          box-shadow 0.16s ease,
          filter 0.16s ease;
      }

      .rrShoutCard::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: inherit;
        background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent 26%, transparent 72%, rgba(91, 135, 211, 0.08) 100%);
        opacity: 0.9;
        z-index: -1;
      }

      .rrShoutCard:hover:not(:disabled) {
        border-color: rgba(111, 159, 232, 0.28);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.07),
          inset 0 -1px 0 rgba(71, 107, 160, 0.16),
          0 14px 30px rgba(0, 0, 0, 0.3);
        filter: brightness(1.03);
      }

      .rrShoutCard--selected {
        border-color: rgba(97, 154, 236, 0.5);
        background:
          radial-gradient(circle at 12% 10%, rgba(118, 169, 246, 0.18), transparent 32%),
          linear-gradient(135deg, rgba(30, 47, 74, 0.99) 0%, rgba(13, 23, 37, 0.985) 66%, rgba(38, 18, 47, 0.96) 100%);
        box-shadow:
          0 0 0 1px rgba(77, 143, 228, 0.16),
          inset 0 1px 0 rgba(255,255,255,0.08),
          inset 0 -1px 0 rgba(84, 124, 185, 0.18),
          0 16px 34px rgba(0, 0, 0, 0.34);
      }

      .rrShoutCard--selected::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        box-shadow: inset 0 0 0 1px rgba(116, 171, 245, 0.16);
      }

      .rrShoutCard--pressed:not(:disabled) {
        transform: translateY(1px);
      }

      .rrShoutCard--disabled {
        opacity: 0.56;
      }

      .rrShoutCardTop {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }

      .rrShoutCardBadge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 19px;
        padding: 0 8px;
        border-radius: 999px;
        font-size: 8px;
        font-weight: 1000;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #e5eeff;
        background: linear-gradient(180deg, rgba(54, 69, 95, 0.82), rgba(23, 33, 49, 0.94));
        border: 1px solid rgba(144, 167, 210, 0.18);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
      }

      .rrShoutCardBadge--featured {
        color: #d8ebff;
        background: linear-gradient(180deg, rgba(73, 124, 201, 0.34), rgba(36, 76, 143, 0.2));
        border-color: rgba(101, 166, 252, 0.38);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.09), 0 0 0 1px rgba(77, 143, 228, 0.08);
      }

      .rrShoutPhotoChip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-height: 19px;
        padding: 0 7px;
        border-radius: 999px;
        border: 1px solid rgba(101, 166, 252, 0.24);
        background: linear-gradient(180deg, rgba(37, 59, 90, 0.72), rgba(15, 31, 52, 0.92));
        font-size: 8px;
        font-weight: 1000;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #d7e9ff;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .rrShoutPhotoIcon {
        width: 16px;
        height: 16px;
        border-radius: 5px;
        border: 1px solid rgba(131, 181, 245, 0.22);
        background: linear-gradient(180deg, rgba(69, 112, 176, 0.42), rgba(17, 34, 58, 0.96));
        display: inline-grid;
        place-items: center;
        font-size: 10px;
        line-height: 1;
        color: #eef6ff;
      }

      .rrShoutCardCopy {
        display: grid;
        gap: 6px;
        align-content: start;
      }

      .rrShoutCardTitle {
        font-size: 14px;
        line-height: 1.04;
        font-weight: 1000;
        letter-spacing: -0.035em;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.32);
      }

      .rrShoutCardDesc {
        font-size: 11px;
        line-height: 1.35;
        color: #d4e1f4;
      }

      .rrShoutCardMeta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }

      .rrShoutCardMeta .rrMetaPill {
        color: #f0f5ff;
        background: linear-gradient(180deg, rgba(82, 115, 170, 0.48), rgba(39, 61, 97, 0.72));
        border-color: rgba(141, 177, 234, 0.22);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
      }

      .rrShoutCardMeta .rrMetaPill {
        min-height: 19px;
        padding: 0 8px;
        color: #eaf2ff;
        border-color: rgba(129, 161, 214, 0.16);
        background: linear-gradient(180deg, rgba(44, 58, 80, 0.84), rgba(18, 29, 46, 0.94));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
      }

      .rrShoutCardMeta .rrMetaPill:last-child {
        background: linear-gradient(180deg, rgba(56, 82, 124, 0.88), rgba(24, 49, 90, 0.96));
        border-color: rgba(92, 150, 230, 0.24);
      }

      .rrShoutComposerSummary {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid rgba(125, 156, 206, 0.12);
        background: linear-gradient(180deg, rgba(18, 27, 43, 0.92), rgba(10, 16, 27, 0.96));
      }

      .rrUploadBox {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 10px;
        border: 1px dashed rgba(125, 156, 206, 0.26);
        background: rgba(255, 255, 255, 0.03);
      }

      .rrUploadPreview {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0,0,0,0.24);
      }

      .rrUploadPreview img {
        display: block;
        width: 100%;
        max-height: 180px;
        object-fit: contain;
        border-radius: 8px;
        background: #050814;
      }

      .rrCheckRow {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        font-size: 12px;
        line-height: 1.35;
        color: #dfe8fb;
      }

      .rrCheckRow input {
        margin-top: 2px;
      }

      .rrActionStack {
        display: grid;
        gap: 8px;
      }

      .rrFooterMeta {
        min-width: 0;
        display: grid;
        gap: 2px;
      }

      .rrFooterMetaStrong {
        font-size: 12px;
        font-weight: 1000;
        color: #dfe8fb;
      }

      .rrFooterMetaSub {
        font-size: 11px;
        color: var(--rr-text-dim);
      }

      @media (max-width: 420px) {
        .rrProductGrid {
          gap: 8px;
        }

        .rrShoutCard {
          min-height: 140px;
          padding: 9px;
        }

        .rrShoutCardTitle {
          font-size: 13px;
        }

        .rrShoutCardDesc {
          font-size: 10.5px;
        }
      }




      .rrPanelHead--centered {
        background:
          linear-gradient(180deg, rgba(20, 31, 49, 0.74), rgba(12, 20, 32, 0.08)),
          linear-gradient(90deg, rgba(65, 118, 198, 0.08), rgba(15, 24, 38, 0) 36%, rgba(77, 143, 228, 0.1));
      }

      .rrPanelHead--centered::after {
        content: "";
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 0;
        height: 1px;
        background: linear-gradient(90deg, rgba(77, 143, 228, 0), rgba(77, 143, 228, 0.42), rgba(77, 143, 228, 0));
        pointer-events: none;
      }

      .rrPanelHead--centered .rrPanelSub {
        color: #d8e6fb;
      }

      .rrProductGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .rrShoutCard {
        position: relative;
        min-height: 148px;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid rgba(120, 156, 214, 0.18);
        background:
          radial-gradient(circle at 18% 14%, rgba(72, 124, 210, 0.16), transparent 34%),
          linear-gradient(145deg, rgba(23, 37, 60, 0.96) 0%, rgba(12, 22, 39, 0.985) 58%, rgba(8, 15, 27, 0.99) 100%);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.05),
          inset 0 0 0 1px rgba(83, 134, 210, 0.06),
          0 14px 30px rgba(0, 0, 0, 0.26);
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 8px;
        text-align: left;
        color: var(--rr-text);
        overflow: hidden;
      }

      .rrShoutCard::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 30%),
          radial-gradient(circle at 88% 92%, rgba(84, 44, 128, 0.24), transparent 30%);
        pointer-events: none;
      }

      .rrShoutCard > * {
        position: relative;
        z-index: 1;
      }

      .rrShoutCard:hover {
        border-color: rgba(109, 160, 238, 0.28);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.06),
          inset 0 0 0 1px rgba(83, 134, 210, 0.08),
          0 16px 34px rgba(0, 0, 0, 0.30);
      }

      .rrShoutCard--selected {
        border-color: rgba(94, 155, 241, 0.5);
        background:
          radial-gradient(circle at 18% 14%, rgba(76, 133, 226, 0.22), transparent 34%),
          radial-gradient(circle at 88% 90%, rgba(100, 49, 146, 0.28), transparent 30%),
          linear-gradient(145deg, rgba(28, 44, 70, 0.985) 0%, rgba(13, 24, 43, 0.992) 58%, rgba(8, 15, 28, 0.995) 100%);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.08),
          inset 0 0 0 1px rgba(108, 165, 246, 0.10),
          0 0 0 1px rgba(77, 143, 228, 0.18),
          0 18px 36px rgba(0, 0, 0, 0.34);
      }

      .rrShoutCard--pressed:not(:disabled) {
        transform: translateY(1px);
      }

      .rrShoutCard--disabled {
        opacity: 0.56;
      }

      .rrShoutCardTop {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }

      .rrShoutCardBadge {
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
        color: #e8f1ff;
        background: linear-gradient(180deg, rgba(66, 82, 108, 0.66), rgba(31, 43, 61, 0.92));
        border: 1px solid rgba(152, 179, 224, 0.16);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
      }

      .rrShoutCardBadge--featured {
        color: #f3f8ff;
        background: linear-gradient(180deg, rgba(87, 143, 226, 0.32), rgba(34, 67, 121, 0.70));
        border-color: rgba(118, 181, 255, 0.32);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.10),
          0 0 0 1px rgba(77, 143, 228, 0.12);
      }

      .rrShoutCardBadge--popular {
        background: linear-gradient(180deg, rgba(84, 126, 209, 0.34), rgba(36, 62, 112, 0.74));
        border-color: rgba(110, 172, 255, 0.28);
      }

      .rrShoutCardBadge--value {
        color: #fff3d2;
        background: linear-gradient(180deg, rgba(123, 103, 56, 0.42), rgba(64, 51, 17, 0.84));
        border-color: rgba(255, 221, 146, 0.24);
      }

      .rrShoutCardBadge--photo {
        background: linear-gradient(180deg, rgba(74, 120, 201, 0.34), rgba(29, 57, 110, 0.80));
        border-color: rgba(116, 177, 255, 0.28);
      }

      .rrShoutPhotoChip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 0 6px;
        min-height: 22px;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: #e7f1ff;
        background: linear-gradient(180deg, rgba(37, 58, 92, 0.84), rgba(15, 28, 50, 0.96));
        border: 1px solid rgba(100, 161, 239, 0.18);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .rrShoutPhotoIcon {
        width: 16px;
        height: 16px;
        border-radius: 5px;
        border: 1px solid rgba(126, 185, 255, 0.22);
        background: linear-gradient(180deg, rgba(82, 137, 216, 0.34), rgba(26, 54, 105, 0.90));
        display: inline-grid;
        place-items: center;
        font-size: 10px;
        line-height: 1;
        color: #fff;
      }

      .rrShoutCardCopy {
        display: grid;
        gap: 6px;
        align-content: start;
      }

      .rrShoutCardTitle {
        font-size: 14px;
        line-height: 1.05;
        font-weight: 1000;
        letter-spacing: -0.03em;
        color: #f3f6fb;
        text-shadow: 0 1px 0 rgba(0,0,0,0.22);
      }

      .rrShoutCardDesc {
        font-size: 11px;
        line-height: 1.35;
        color: #dbe6f8;
      }

      .rrShoutCardMeta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }

      .rrShoutCardMeta .rrMetaPill {
        min-height: 20px;
        padding: 0 8px;
        font-size: 8px;
        letter-spacing: 0.1em;
        color: #f1f6ff;
        border-color: rgba(135, 176, 233, 0.20);
        background: linear-gradient(180deg, rgba(66, 92, 132, 0.72), rgba(34, 53, 84, 0.96));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
      }

      .rrShoutCardMeta .rrMetaPill--points {
        background: linear-gradient(180deg, rgba(94, 142, 223, 0.92), rgba(54, 94, 168, 0.98));
        border-color: rgba(140, 196, 255, 0.34);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.10),
          0 3px 10px rgba(20, 56, 110, 0.24);
      }

      .rrShoutComposerSummary {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid rgba(125, 156, 206, 0.12);
        background:
          radial-gradient(circle at 18% 14%, rgba(72, 124, 210, 0.14), transparent 34%),
          linear-gradient(180deg, rgba(18, 27, 43, 0.92), rgba(10, 16, 27, 0.96));
      }

      .rrTextarea {
        width: 100%;
        min-height: 110px;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(117, 145, 197, 0.22);
        background: linear-gradient(180deg, rgba(16, 24, 37, 0.96), rgba(9, 15, 24, 0.98));
        color: var(--rr-text);
        padding: 11px 12px;
        outline: none;
        resize: vertical;
        font: inherit;
      }

      .rrTextarea::placeholder {
        color: var(--rr-text-dim);
      }

      .rrTextarea:focus {
        border-color: rgba(105, 182, 255, 0.34);
        box-shadow: 0 0 0 1px rgba(61, 130, 215, 0.12);
      }

      .rrField {
        display: grid;
        gap: 6px;
      }

      .rrFieldLabel {
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #dfe8fb;
      }

      .rrFieldMetaRow {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
      }

      .rrFieldMetaText {
        font-size: 11px;
        color: var(--rr-text-dim);
      }

      .rrUploadBox {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 10px;
        border: 1px dashed rgba(125, 156, 206, 0.26);
        background: rgba(255, 255, 255, 0.03);
      }

      .rrUploadPreview {
        display: grid;
        gap: 8px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0,0,0,0.24);
      }

      .rrUploadPreview img {
        display: block;
        width: 100%;
        max-height: 180px;
        object-fit: contain;
        border-radius: 8px;
        background: #050814;
      }

      .rrCheckRow {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        font-size: 12px;
        line-height: 1.35;
        color: #dfe8fb;
      }

      .rrCheckRow input {
        margin-top: 2px;
      }

      .rrActionStack {
        display: grid;
        gap: 8px;
      }

      .rrFooterBar {
        background:
          radial-gradient(circle at 20% 120%, rgba(85, 142, 224, 0.16), transparent 34%),
          linear-gradient(180deg, rgba(5, 8, 13, 0.02), rgba(5, 8, 13, 0.94));
      }

      .rrFooterInner::before {
        content: "";
        position: absolute;
        inset: -4px 0 auto 0;
        height: 8px;
        background: linear-gradient(90deg, rgba(77, 143, 228, 0), rgba(77, 143, 228, 0.2), rgba(77, 143, 228, 0));
        filter: blur(8px);
        pointer-events: none;
      }

      .rrFooterInner {
        position: relative;
      }

      @media (max-width: 420px) {
        .rrProductGrid {
          gap: 7px;
        }

        .rrShoutCard {
          min-height: 140px;
          padding: 9px;
        }

        .rrShoutCardTitle {
          font-size: 13px;
        }

        .rrShoutCardDesc {
          font-size: 10.5px;
        }
      }
/* === BEGIN ADDS FOR 331 === */

/* === FIX MOBILE INPUT ZOOM (CRITICAL) === */
input,
textarea,
select {
  font-size: 16px !important;
}

.rrOverlay--mobile {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0,0,0,0.5);
}

.rrDrawer--mobile {
  width: 100%;
  max-height: 85dvh;
  border-radius: 18px 18px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rrDrawerBody {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(120px + env(safe-area-inset-bottom));
}

.rrDrawerHead {
  position: sticky;
  top: 0;
  z-index: 2;
  background: inherit;
}

.rrToast--top {
  position: fixed;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 200; /* ABOVE drawer */
}


/* === END ADDS FOR 331 === */
    `}</style>
  );
}


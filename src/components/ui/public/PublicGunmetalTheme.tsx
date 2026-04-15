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

/* === TOAST WRAPPER (POSITIONING) === */
.rrToastWrap {
  position: fixed;
  top: 22%;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 120;
}

/* === TOAST CARD === */
.rrToastCard {
  width: min(86%, 420px);
  pointer-events: auto;

  border-radius: 18px;
  padding: 14px 16px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  color: #fff;
  font-weight: 700;
  font-size: 14px;

  /* 🔵 BLUE BUTTON STYLE */
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.95),
    rgba(37, 99, 235, 0.95)
  );

  border: 1px solid rgba(255,255,255,0.18);

  /* glow + depth */
  box-shadow:
    0 18px 50px rgba(0,0,0,0.5),
    0 0 24px rgba(59,130,246,0.45);

  backdrop-filter: blur(10px);

  /* 🎬 animation */
  animation: rrToastIn 240ms ease;
}

/* === TEXT === */
.rrToastText {
  flex: 1;
}

/* === CLOSE BUTTON === */
.rrToastClose {
  border: none;
  background: rgba(255,255,255,0.12);
  color: white;
  padding: 6px 10px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

/* === ENTRY ANIMATION === */
@keyframes rrToastIn {
  from {
    transform: translateY(12px) scale(0.96);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
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

.rrDrawer--buy {
  width: min(560px, calc(100vw - 12px));
  max-height: min(88dvh, calc(100vh - 12px - env(safe-area-inset-top)));
}

      .rrDrawerHead--buy {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .rrBuyLead {
        margin-bottom: 12px;
        padding: 14px 14px 13px;
        border-radius: 16px;
        border: 1px solid rgba(134, 178, 247, 0.16);
        background:
          radial-gradient(circle at 12% 0%, rgba(92, 146, 245, 0.16), transparent 36%),
          linear-gradient(180deg, rgba(23, 36, 58, 0.96), rgba(12, 20, 33, 0.98));
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.06),
          0 12px 26px rgba(0,0,0,0.18);
      }

      .rrBuyLeadTitle {
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #e8f2ff;
      }

      .rrBuyLeadText {
        margin-top: 6px;
        font-size: 13px;
        color: #c8d8f0;
        line-height: 1.42;
      }

      .rrBuyPackGrid {
        display: grid;
        gap: 12px;
      }

      .rrBuyPackCard {
        position: relative;
        display: grid;
        gap: 10px;
        padding: 14px;
        border-radius: 18px;
        border: 1px solid rgba(134, 171, 232, 0.14);
        background:
          radial-gradient(circle at 14% 0%, rgba(86, 133, 224, 0.10), transparent 34%),
          linear-gradient(180deg, rgba(22, 34, 54, 0.98) 0%, rgba(11, 18, 30, 0.995) 100%);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.05),
          0 14px 28px rgba(0, 0, 0, 0.22);
        overflow: hidden;
      }

      .rrBuyPackCard::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(120deg, transparent 0%, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%, transparent 100%);
        background-size: 220% 100%;
        animation: rrDrawerSheen 7s linear infinite;
        opacity: 0.45;
      }

      .rrBuyPackCard--featured {
        border-color: rgba(99, 163, 255, 0.36);
        background:
          radial-gradient(circle at 12% 0%, rgba(103, 165, 255, 0.18), transparent 34%),
          radial-gradient(circle at 92% 100%, rgba(126, 76, 255, 0.14), transparent 32%),
          linear-gradient(180deg, rgba(28, 42, 68, 0.99) 0%, rgba(12, 20, 34, 1) 100%);
        box-shadow:
          0 0 0 1px rgba(77, 143, 228, 0.14),
          inset 0 1px 0 rgba(255,255,255,0.08),
          0 18px 34px rgba(0, 0, 0, 0.28);
      }
.rrBuyPackValueRow--compact {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.rrBuyPackLeft {
  display: flex;
  align-items: center;
}

.rrBuyPackRight {
  display: grid;
  justify-items: end;
  gap: 2px;
  text-align: right;
}

.rrBuyPackPoints {
  font-size: 20px;
  font-weight: 1000;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.rrBuyPackPrice--compact {
  font-size: 10px;
  font-weight: 1000;
  line-height: 1;
  letter-spacing: -0.01em;
  color: #95a7c2;
}

.rrBuyPackUsage {
  font-size: 11px;
  color: #95a7c2;
}

.rrBuyPackCard {
  padding: 12px; /* slightly tighter */
  gap: 8px;       /* reduce vertical spacing */
}


      .rrBuyPackTop {
        display: grid;
        gap: 6px;
        position: relative;
        z-index: 1;
      }

      .rrBuyPackTitleRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .rrBuyPackTitle {
        font-size: 20px;
        font-weight: 1000;
        line-height: 1;
        letter-spacing: -0.04em;
        color: #ffffff;
      }

      .rrBuyPackSubtitle {
        font-size: 12px;
        color: #c7d7ef;
        line-height: 1.42;
      }

      .rrBuyPackValueRow {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        position: relative;
        z-index: 1;
      }

      .rrBuyPackPoints {
        font-size: 14px;
        font-weight: 1000;
        color: #edf4ff;
      }

      .rrBuyPackUsage {
        margin-top: 3px;
        font-size: 11px;
        color: #95a7c2;
        line-height: 1.35;
      }

      .rrBuyPackPrice {
        font-size: 28px;
        font-weight: 1000;
        line-height: 0.95;
        letter-spacing: -0.05em;
        color: #ffffff;
        text-shadow: 0 1px 0 rgba(0,0,0,0.2);
      }

      .rrBuyPackBadge--featured {
        border-color: rgba(110, 176, 255, 0.34);
        background: linear-gradient(180deg, rgba(77, 143, 228, 0.24), rgba(77, 143, 228, 0.12));
        color: #eef6ff;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.08),
          0 0 0 1px rgba(77, 143, 228, 0.10);
      }

      .rrBtn--featuredPack {
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.24),
          0 14px 26px rgba(37, 99, 235, 0.36),
          0 0 0 1px rgba(77, 143, 228, 0.10);
      }

      @media (max-width: 520px) {
        .rrBuyLead {
          padding: 13px 13px 12px;
          border-radius: 15px;
        }

        .rrBuyPackGrid {
          gap: 10px;
        }

        .rrBuyPackCard {
          padding: 12px;
          gap: 8px;
          border-radius: 16px;
        }

        .rrBuyPackTitle {
          font-size: 18px;
        }

        .rrBuyPackPrice {
          font-size: 24px;
        }

        .rrBuyLeadTitle {
          font-size: 11px;
        }

        .rrBuyLeadText,
        .rrBuyPackSubtitle {
          font-size: 11px;
        }

        .rrBuyPackPoints {
          font-size: 13px;
        }
      }


.rrOverlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-top: max(12px, env(safe-area-inset-top));
  background:
    radial-gradient(circle at 50% 18%, rgba(90, 146, 255, 0.14), transparent 34%),
    rgba(3, 6, 12, 0.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: rrOverlayFadeIn 180ms ease;
}

.rrDrawer {
  width: min(560px, calc(100vw - 12px));
  max-height: min(88dvh, calc(100vh - 12px - env(safe-area-inset-top)));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  border: 1px solid rgba(130, 176, 255, 0.18);
  background:
    radial-gradient(circle at top, rgba(83, 134, 230, 0.16), transparent 32%),
    linear-gradient(180deg, rgba(20, 30, 50, 0.985) 0%, rgba(9, 14, 24, 0.995) 100%);
  box-shadow:
    0 -18px 48px rgba(0, 0, 0, 0.48),
    0 0 0 1px rgba(77, 143, 228, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  overflow: hidden;
  animation: rrDrawerRiseIn 280ms cubic-bezier(.18,.9,.28,1);
  position: relative;
}

      .rrDrawer::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(120deg, transparent 0%, transparent 42%, rgba(255,255,255,0.05) 50%, transparent 58%, transparent 100%);
        background-size: 220% 100%;
        animation: rrDrawerSheen 5.5s linear infinite;
        opacity: 0.65;
      }

      .rrDrawerHead {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 16px 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        background:
          linear-gradient(180deg, rgba(18, 28, 45, 0.98), rgba(18, 28, 45, 0.9) 72%, rgba(18, 28, 45, 0.78) 100%);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .rrDrawerTitle {
        font-size: 18px;
        line-height: 1.02;
        font-weight: 1000;
        letter-spacing: -0.03em;
        text-transform: none;
        color: #ffffff;
      }

      .rrDrawerTitle--small {
        font-size: 13px;
        line-height: 1.1;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #dbe8ff;
      }

      .rrDrawerSub {
        margin-top: 6px;
        color: #d7e5fb;
        font-size: 13px;
        line-height: 1.42;
        max-width: 420px;
      }

.rrDrawerBody {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 20px 16px 16px;
  padding-bottom: calc(126px + env(safe-area-inset-bottom));
}

      .rrCloseBtn {
        min-width: 82px;
        min-height: 38px;
        border-radius: 999px;
        background: linear-gradient(180deg, rgba(52, 67, 92, 0.9), rgba(24, 35, 52, 0.98));
        border: 1px solid rgba(151, 184, 236, 0.16);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.08),
          0 8px 18px rgba(0,0,0,0.18);
      }

      .rrStack {
        display: grid;
        gap: 10px;
      }

      .rrDivider {
        height: 1px;
        margin: 6px 0;
        background: linear-gradient(
          90deg,
          rgba(255,255,255,0),
          rgba(126, 168, 232, 0.3),
          rgba(255,255,255,0)
        );
      }

      .rrHelper {
        font-size: 12px;
        color: #c8d7ef;
        line-height: 1.4;
      }

      .rrInput {
        width: 100%;
        min-height: 52px;
        border-radius: 14px;
        border: 2px solid rgba(15, 23, 42, 0.1);
        background: #ffffff;
        color: #09111f;
        padding: 0 16px;
        outline: none;
        font-size: 16px !important;
        font-weight: 700;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.75),
          0 10px 24px rgba(0,0,0,0.16);
        transition:
          transform 140ms ease,
          border-color 140ms ease,
          box-shadow 180ms ease,
          background 180ms ease;
      }

      .rrInput::placeholder {
        color: #667085;
        font-weight: 600;
      }

      .rrInput:focus {
        border-color: #4d8fe4;
        box-shadow:
          0 0 0 4px rgba(77, 143, 228, 0.22),
          0 12px 26px rgba(0,0,0,0.18);
      }

      .rrBtn,
      .rrBtnGhost,
      .rrVoteBtn {
        appearance: none;
        border-radius: 14px;
        min-height: 50px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 1000;
        letter-spacing: 0.01em;
        transition:
          transform 120ms ease,
          filter 140ms ease,
          box-shadow 160ms ease,
          border-color 160ms ease,
          background 160ms ease;
        transform: translateY(0) scale(1);
      }

      .rrBtn {
        border: 1px solid rgba(151, 199, 255, 0.3);
        background:
          linear-gradient(180deg, #63a4ff 0%, #3b82f6 52%, #2b6dd8 100%);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.25),
          0 14px 28px rgba(37, 99, 235, 0.34),
          0 0 0 1px rgba(77, 143, 228, 0.08);
      }

      .rrBtn:hover {
        filter: brightness(1.03);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.28),
          0 16px 30px rgba(37, 99, 235, 0.38),
          0 0 0 1px rgba(77, 143, 228, 0.12);
      }

      .rrBtnGhost,
      .rrMuteBtn,
      .rrVoteBtnGhost {
        border: 1px solid rgba(132, 166, 223, 0.16);
        background:
          linear-gradient(180deg, rgba(46, 61, 84, 0.9), rgba(20, 31, 48, 0.98));
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.07),
          0 10px 22px rgba(0,0,0,0.16);
      }

      .rrBtn:active,
      .rrBtnGhost:active,
      .rrVoteBtn:active {
        transform: translateY(2px) scale(0.985);
      }

      .rrBtn:disabled,
      .rrBtnGhost:disabled,
      .rrVoteBtn:disabled {
        opacity: 0.52;
        cursor: not-allowed;
        filter: grayscale(0.08);
      }

      .rrCheckRow {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        font-size: 13px;
        line-height: 1.42;
        color: #dfe8fb;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid rgba(130, 166, 222, 0.12);
        background: linear-gradient(180deg, rgba(25, 37, 58, 0.82), rgba(13, 22, 36, 0.9));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
      }

      .rrCheckRow input {
        margin-top: 2px;
        width: 18px;
        height: 18px;
        accent-color: #4d8fe4;
        flex: 0 0 auto;
      }

      .rrInlineForm {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
      }

      .rrVerifyMsg {
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(124, 166, 232, 0.14);
        background:
          linear-gradient(180deg, rgba(30, 44, 68, 0.88), rgba(14, 23, 36, 0.95));
        color: #e4eeff;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.06),
          0 10px 20px rgba(0,0,0,0.16);
        animation: rrSoftPop 200ms ease;
      }

      .rrOverlay--mobile {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        background:
          radial-gradient(circle at 50% 14%, rgba(90, 146, 255, 0.14), transparent 34%),
          rgba(0,0,0,0.56);
        animation: rrOverlayFadeIn 180ms ease;
      }

      .rrDrawer--mobile {
        width: 100%;
        max-height: 88dvh;
        border-radius: 22px 22px 0 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .rrToast--top {
        position: fixed;
        top: 12px;
        left: 12px;
        right: 12px;
        z-index: 200;
      }

      @keyframes rrOverlayFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes rrDrawerRiseIn {
        from {
          transform: translateY(24px) scale(0.985);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      @keyframes rrDrawerSheen {
        0% { background-position: 130% 0; }
        100% { background-position: -120% 0; }
      }

      @keyframes rrSoftPop {
        from {
          transform: translateY(6px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @media (max-width: 520px) {
        .rrDrawerHead {
          padding: 14px 14px 12px;
        }

        .rrDrawerTitle {
          font-size: 17px;
        }

        .rrDrawerSub {
          font-size: 12px;
        }

        .rrDrawerBody {
          padding: 14px;
          padding-bottom: calc(124px + env(safe-area-inset-bottom));
        }

        .rrInput {
          min-height: 50px;
          border-radius: 13px;
          padding: 0 14px;
        }

        .rrBtn,
        .rrBtnGhost,
        .rrVoteBtn {
          min-height: 48px;
          font-size: 13px;
        }

        .rrInlineForm {
          grid-template-columns: 1fr;
        }
      }


      .rrTextarea {
        width: 100%;
        min-height: 132px;
        border-radius: 16px;
        border: 2px solid rgba(15, 23, 42, 0.08);
        background: #ffffff;
        color: #09111f;
        padding: 14px 16px;
        outline: none;
        resize: vertical;
        font: inherit;
        font-size: 17px !important;
        line-height: 1.42;
        font-weight: 600;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.72),
          0 10px 24px rgba(0,0,0,0.14);
        transition:
          border-color 140ms ease,
          box-shadow 180ms ease,
          transform 140ms ease;
      }

      .rrTextarea::placeholder {
        color: #667085;
        font-weight: 500;
      }

      .rrTextarea:focus {
        border-color: #4d8fe4;
        box-shadow:
          0 0 0 4px rgba(77, 143, 228, 0.22),
          0 12px 26px rgba(0,0,0,0.16);
      }

      .rrField {
        display: grid;
        gap: 8px;
      }

      .rrFieldLabel {
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.12em;
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
        font-weight: 700;
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
        border-radius: 14px;
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
        transition:
          transform 140ms ease,
          border-color 160ms ease,
          box-shadow 180ms ease,
          filter 180ms ease;
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
        transform: translateY(-1px);
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
        transform: translateY(1px) scale(0.99);
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

      .rrMetaPill--points {
        background: linear-gradient(180deg, rgba(94, 142, 223, 0.92), rgba(54, 94, 168, 0.98));
        border-color: rgba(140, 196, 255, 0.34);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.10),
          0 3px 10px rgba(20, 56, 110, 0.24);
      }

      .rrShoutComposerSummary {
        display: grid;
        gap: 8px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(125, 156, 206, 0.12);
        background:
          radial-gradient(circle at 18% 14%, rgba(72, 124, 210, 0.14), transparent 34%),
          linear-gradient(180deg, rgba(18, 27, 43, 0.92), rgba(10, 16, 27, 0.96));
      }

      .rrUploadBox {
        display: grid;
        gap: 8px;
        padding: 12px;
        border-radius: 14px;
        border: 1px dashed rgba(125, 156, 206, 0.26);
        background: rgba(255, 255, 255, 0.03);
      }

      .rrUploadPreview {
        display: grid;
        gap: 8px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0,0,0,0.24);
      }

      .rrUploadPreview img {
        display: block;
        width: 100%;
        max-height: 220px;
        object-fit: contain;
        border-radius: 10px;
        background: #050814;
      }

      .rrCheckRow {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        font-size: 13px;
        line-height: 1.42;
        color: #dfe8fb;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid rgba(130, 166, 222, 0.12);
        background: linear-gradient(180deg, rgba(25, 37, 58, 0.82), rgba(13, 22, 36, 0.9));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
      }

      .rrCheckRow input {
        margin-top: 2px;
        width: 18px;
        height: 18px;
        accent-color: #4d8fe4;
        flex: 0 0 auto;
      }

      .rrActionStack {
        display: grid;
        gap: 10px;
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

      input,
      textarea,
      select {
        font-size: 16px !important;
      }

      .rrVerifyMsg {
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(124, 166, 232, 0.14);
        background:
          linear-gradient(180deg, rgba(30, 44, 68, 0.88), rgba(14, 23, 36, 0.95));
        color: #e4eeff;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.06),
          0 10px 20px rgba(0,0,0,0.16);
        animation: rrSoftPop 200ms ease;
      }

      .rrToast--top {
        position: fixed;
        top: 12px;
        left: 12px;
        right: 12px;
        z-index: 200;
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

        .rrTextarea {
          min-height: 120px;
          padding: 13px 14px;
        }
      }

          `}</style>
  );
}


"use client";

export default function PublicGunmetalTheme() {
  return (
    <style jsx global>{`
      :root {
        --rr-bg: #070b14;
        --rr-bg-2: #0a1220;
        --rr-surface: linear-gradient(
          180deg,
          rgba(21, 29, 43, 0.92) 0%,
          rgba(10, 16, 27, 0.96) 100%
        );
        --rr-surface-2: linear-gradient(
          135deg,
          rgba(30, 40, 58, 0.9) 0%,
          rgba(11, 17, 28, 0.96) 100%
        );
        --rr-panel-border: rgba(125, 156, 206, 0.18);
        --rr-panel-border-strong: rgba(125, 156, 206, 0.28);
        --rr-text: #f3f6fb;
        --rr-text-soft: #b2bfd3;
        --rr-text-dim: #7f8aa0;
        --rr-line: rgba(255, 255, 255, 0.08);
        --rr-line-soft: rgba(255, 255, 255, 0.05);
        --rr-blue: #4a95ff;
        --rr-cyan: #19c3d1;
        --rr-magenta: #9f2f7d;
        --rr-red: #b24545;
        --rr-gold: #c89a36;
        --rr-green: #5d8a57;
        --rr-shadow: 0 22px 50px rgba(0, 0, 0, 0.45);
        --rr-radius-lg: 22px;
        --rr-radius: 16px;
        --rr-radius-sm: 12px;
        --rr-max: 1120px;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        background:
          radial-gradient(circle at left center, rgba(16, 89, 103, 0.42), transparent 34%),
          radial-gradient(circle at 78% 22%, rgba(126, 38, 95, 0.34), transparent 28%),
          linear-gradient(180deg, #04070d 0%, #07101b 36%, #040812 100%);
        color: var(--rr-text);
      }

      body {
        margin: 0;
      }

      .rrPublicPage {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
      }

      .rrPublicShell {
        width: min(var(--rr-max), calc(100vw - 24px));
        margin: 0 auto;
        padding: 20px 0 92px;
      }

      .rrPublicTopbar {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 14px;
        align-items: start;
        margin-bottom: 14px;
      }

      .rrBrandBadge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 84px;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 18px;
        border: 1px solid rgba(103, 160, 255, 0.34);
        background:
          linear-gradient(180deg, rgba(28, 41, 62, 0.95), rgba(16, 24, 38, 0.96));
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          0 0 0 1px rgba(55, 92, 160, 0.18),
          0 0 18px rgba(59, 142, 255, 0.18);
        font-weight: 1000;
        font-size: 13px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .rrHero {
        min-width: 0;
        text-align: center;
        padding-top: 6px;
      }

      .rrEyebrow {
        color: var(--rr-text-dim);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .rrTitle {
        margin: 0;
        font-size: clamp(28px, 5vw, 46px);
        line-height: 0.94;
        font-weight: 1000;
        letter-spacing: -0.04em;
        text-transform: uppercase;
      }

      .rrTitleSub {
        margin-top: 8px;
        color: var(--rr-text-soft);
        font-size: 13px;
        line-height: 1.35;
      }

      .rrHudCard {
        min-width: 126px;
        border-radius: 18px;
        border: 1px solid rgba(128, 157, 208, 0.22);
        background: var(--rr-surface);
        box-shadow: var(--rr-shadow);
        padding: 12px;
        text-align: center;
      }

      .rrHudLabel {
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--rr-text-dim);
        margin-bottom: 4px;
      }

      .rrHudValue {
        font-size: 34px;
        line-height: 1;
        font-weight: 1000;
        margin-bottom: 8px;
      }

      .rrBtn,
      .rrBtnGhost,
      .rrBtnWarn,
      .rrBtnDanger {
        appearance: none;
        border: 1px solid rgba(123, 151, 202, 0.26);
        border-radius: 14px;
        color: #fff;
        font-weight: 900;
        letter-spacing: 0.02em;
        min-height: 42px;
        padding: 0 16px;
        cursor: pointer;
        transition:
          transform 0.14s ease,
          border-color 0.14s ease,
          opacity 0.14s ease,
          box-shadow 0.14s ease;
      }

      .rrBtn:disabled,
      .rrBtnGhost:disabled,
      .rrBtnWarn:disabled,
      .rrBtnDanger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .rrBtn:not(:disabled):active,
      .rrBtnGhost:not(:disabled):active,
      .rrBtnWarn:not(:disabled):active,
      .rrBtnDanger:not(:disabled):active {
        transform: translateY(1px);
      }

      .rrBtn {
        background:
          linear-gradient(90deg, rgba(16, 118, 133, 0.96), rgba(116, 37, 96, 0.96));
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.14),
          0 10px 24px rgba(0, 0, 0, 0.22),
          0 0 0 1px rgba(51, 111, 168, 0.16);
      }

      .rrBtnGhost {
        background:
          linear-gradient(180deg, rgba(47, 58, 78, 0.86), rgba(20, 28, 42, 0.92));
      }

      .rrBtnWarn {
        background:
          linear-gradient(180deg, rgba(144, 112, 40, 0.96), rgba(114, 83, 22, 0.98));
        border-color: rgba(255, 214, 120, 0.2);
      }

      .rrBtnDanger {
        background:
          linear-gradient(180deg, rgba(155, 74, 74, 0.96), rgba(120, 40, 40, 0.98));
        border-color: rgba(255, 162, 162, 0.24);
      }

      .rrPanel {
        border-radius: 22px;
        background: var(--rr-surface);
        border: 1px solid var(--rr-panel-border);
        box-shadow: var(--rr-shadow);
        overflow: hidden;
      }

      .rrPanelHead {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 18px 12px;
        border-bottom: 1px solid var(--rr-line-soft);
      }

      .rrPanelTitle {
        font-size: 14px;
        font-weight: 1000;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .rrPanelSub {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 12px;
        line-height: 1.35;
      }

      .rrPanelBody {
        padding: 16px 18px 18px;
      }

      .rrStatusPill,
      .rrTag,
      .rrMetaPill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 22px;
        padding: 0 9px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .rrStatusPill--live {
        background: rgba(31, 86, 132, 0.4);
        border-color: rgba(105, 182, 255, 0.36);
        color: #cfe9ff;
      }

      .rrStatusPill--warn {
        background: rgba(103, 76, 18, 0.4);
        border-color: rgba(255, 214, 122, 0.22);
        color: #ffdf96;
      }

      .rrStatusPill--danger {
        background: rgba(106, 29, 29, 0.44);
        border-color: rgba(255, 155, 155, 0.24);
        color: #ffc7c7;
      }

      .rrTag--request {
        background: rgba(128, 42, 42, 0.4);
        color: #ffd4d4;
        border-color: rgba(255, 149, 149, 0.18);
      }

      .rrTag--boost {
        background: rgba(99, 30, 68, 0.46);
        color: #ffd2f3;
        border-color: rgba(236, 141, 219, 0.18);
      }

      .rrTag--interstitial {
        background: rgba(23, 81, 113, 0.4);
        color: #c7eeff;
        border-color: rgba(105, 201, 255, 0.22);
      }

      .rrTag--hot {
        background: rgba(96, 27, 36, 0.46);
        color: #ffd9df;
        border-color: rgba(255, 164, 182, 0.18);
      }

      .rrTag--queued {
        background: rgba(255, 255, 255, 0.06);
        color: #d7dcea;
        border-color: rgba(255, 255, 255, 0.08);
      }

      .rrMetaPill {
        background: rgba(255, 255, 255, 0.06);
        color: #dbe5fb;
      }

      .rrSearchWrap {
        margin-bottom: 12px;
      }

      .rrSearchInput {
        width: 100%;
        min-height: 46px;
        border: 1px solid rgba(125, 156, 206, 0.18);
        background:
          linear-gradient(180deg, rgba(8, 14, 24, 0.96), rgba(12, 18, 29, 0.98));
        color: var(--rr-text);
        border-radius: 16px;
        padding: 0 16px;
        font-size: 17px;
        outline: none;
      }

      .rrSearchInput::placeholder,
      .rrInput::placeholder,
      .rrTextarea::placeholder {
        color: #738197;
      }

      .rrInput,
      .rrTextarea {
        width: 100%;
        border: 1px solid rgba(125, 156, 206, 0.18);
        background:
          linear-gradient(180deg, rgba(8, 14, 24, 0.96), rgba(12, 18, 29, 0.98));
        color: var(--rr-text);
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 15px;
        outline: none;
      }

      .rrTextarea {
        resize: vertical;
        min-height: 118px;
      }

      .rrChipRow {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }

      .rrChip {
        appearance: none;
        border: 1px solid rgba(125, 156, 206, 0.16);
        background:
          linear-gradient(180deg, rgba(19, 28, 42, 0.88), rgba(12, 18, 29, 0.94));
        color: #f1f6ff;
        min-height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
      }

      .rrChip.is-active {
        background:
          linear-gradient(180deg, rgba(11, 125, 143, 0.92), rgba(17, 72, 124, 0.96));
        border-color: rgba(96, 201, 255, 0.32);
        box-shadow: 0 0 0 1px rgba(89, 188, 255, 0.14);
      }

      .rrRail {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(180px, 1fr);
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 4px;
      }

      .rrRail::-webkit-scrollbar {
        height: 10px;
      }

      .rrRail::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.14);
      }

      .rrMiniCard {
        display: grid;
        grid-template-columns: 40px minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        min-height: 76px;
        padding: 10px;
        border-radius: 16px;
        background:
          linear-gradient(90deg, rgba(31, 43, 63, 0.76), rgba(21, 28, 43, 0.92));
        border: 1px solid rgba(125, 156, 206, 0.14);
      }

      .rrArt,
      .rrArtLarge {
        overflow: hidden;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background:
          linear-gradient(135deg, rgba(46, 56, 74, 0.9), rgba(21, 28, 42, 0.96));
        display: grid;
        place-items: center;
      }

      .rrArt {
        width: 40px;
        height: 40px;
      }

      .rrArtLarge {
        width: 100%;
        aspect-ratio: 1 / 1;
      }

      .rrArt img,
      .rrArtLarge img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .rrArtFallback {
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #cad7ef;
      }

      .rrMiniTitle,
      .rrSongTitle,
      .rrQueueTitle {
        font-weight: 1000;
        letter-spacing: -0.02em;
        line-height: 1.05;
      }

      .rrMiniTitle {
        font-size: 14px;
      }

      .rrSongTitle {
        font-size: 17px;
      }

      .rrQueueTitle {
        font-size: 16px;
      }

      .rrMiniMeta,
      .rrSongMeta,
      .rrQueueMeta {
        color: var(--rr-text-soft);
        font-size: 12px;
        margin-top: 4px;
        line-height: 1.35;
      }

      .rrSongGrid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .rrSongCard {
        display: grid;
        grid-template-rows: auto 1fr auto;
        border-radius: 22px;
        overflow: hidden;
        border: 1px solid rgba(125, 156, 206, 0.16);
        background: var(--rr-surface-2);
        box-shadow: var(--rr-shadow);
      }

      .rrSongBody {
        padding: 12px 12px 10px;
      }

      .rrSongMetaRow {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .rrSongActions {
        display: grid;
        gap: 8px;
        padding: 0 12px 12px;
      }

      .rrQueueSection {
        display: grid;
        gap: 10px;
      }

      .rrQueueRow {
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        border-radius: 16px;
        padding: 10px;
        background:
          linear-gradient(90deg, rgba(29, 39, 57, 0.82), rgba(12, 18, 29, 0.94));
        border: 1px solid rgba(125, 156, 206, 0.12);
      }

      .rrQueueActions {
        display: inline-flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .rrIconBtn {
        min-width: 44px;
        min-height: 44px;
        border-radius: 14px;
        border: 1px solid rgba(125, 156, 206, 0.18);
        background:
          linear-gradient(180deg, rgba(43, 53, 72, 0.9), rgba(19, 28, 42, 0.96));
        color: #fff;
        font-weight: 1000;
        cursor: pointer;
      }

      .rrFooterBar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
        background:
          linear-gradient(180deg, rgba(6, 9, 16, 0.08), rgba(6, 9, 16, 0.92));
        backdrop-filter: blur(14px);
      }

      .rrFooterInner {
        width: min(var(--rr-max), calc(100vw - 24px));
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: center;
      }

      .rrFooterCta {
        width: 100%;
      }

      .rrToast {
        position: fixed;
        left: 50%;
        bottom: 82px;
        transform: translateX(-50%);
        z-index: 60;
        width: min(720px, calc(100vw - 24px));
        border-radius: 18px;
        border: 1px solid rgba(114, 157, 230, 0.24);
        background:
          linear-gradient(180deg, rgba(24, 33, 48, 0.98), rgba(11, 17, 28, 0.99));
        box-shadow: var(--rr-shadow);
        padding: 14px 16px;
      }

      .rrToastRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .rrToastText {
        font-size: 14px;
        font-weight: 800;
        color: #ecf3ff;
      }

      .rrOverlay {
        position: fixed;
        inset: 0;
        z-index: 55;
        background: rgba(3, 6, 11, 0.72);
        backdrop-filter: blur(8px);
        display: grid;
        align-items: end;
      }

      .rrDrawer,
      .rrModal {
        width: min(var(--rr-max), calc(100vw - 24px));
        margin: 0 auto 12px;
        border-radius: 24px;
        border: 1px solid rgba(125, 156, 206, 0.18);
        background:
          linear-gradient(180deg, rgba(18, 26, 40, 0.98), rgba(8, 12, 21, 0.99));
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }

      .rrDrawerHead {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 18px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .rrDrawerBody {
        padding: 16px 18px 18px;
      }

      .rrDrawerTitle {
        font-size: 18px;
        font-weight: 1000;
        line-height: 1.05;
        text-transform: uppercase;
      }

      .rrDrawerSub {
        margin-top: 5px;
        color: var(--rr-text-soft);
        font-size: 13px;
      }

      .rrPackList {
        display: grid;
        gap: 10px;
      }

      .rrPackRow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 12px 12px;
        border-radius: 16px;
        background:
          linear-gradient(90deg, rgba(26, 36, 53, 0.78), rgba(12, 18, 29, 0.94));
        border: 1px solid rgba(125, 156, 206, 0.12);
      }

      .rrPackTitle {
        font-size: 15px;
        font-weight: 1000;
      }

      .rrPackMeta {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 12px;
      }

      .rrProductGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .rrProductCard {
        border-radius: 20px;
        padding: 14px;
        border: 1px solid rgba(125, 156, 206, 0.16);
        background: var(--rr-surface-2);
        box-shadow: var(--rr-shadow);
      }

      .rrProductCard.is-pressed {
        transform: translateY(1px);
      }

      .rrFormStack,
      .rrStack {
        display: grid;
        gap: 12px;
      }

      .rrTwoCol {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .rrHelper {
        color: var(--rr-text-soft);
        font-size: 12px;
        line-height: 1.35;
      }

      .rrChars {
        text-align: right;
        color: var(--rr-text-dim);
        font-size: 12px;
      }

      .rrCloseBtn {
        min-width: 42px;
        min-height: 42px;
      }

      .rrEmpty {
        border-radius: 18px;
        border: 1px dashed rgba(125, 156, 206, 0.22);
        background: rgba(255, 255, 255, 0.03);
        padding: 18px;
        color: var(--rr-text-soft);
        text-align: center;
        font-size: 14px;
      }

      .rrDivider {
        height: 1px;
        background: rgba(255, 255, 255, 0.06);
        margin: 12px 0;
      }

      .rrLinkBtn {
        background: none;
        border: none;
        padding: 0;
        color: #cce4ff;
        font-size: 13px;
        font-weight: 900;
        cursor: pointer;
      }

      @media (max-width: 980px) {
        .rrSongGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        .rrPublicShell {
          width: min(var(--rr-max), calc(100vw - 16px));
          padding-top: 16px;
        }

        .rrPublicTopbar {
          grid-template-columns: 1fr auto;
          align-items: start;
        }

        .rrHudCard {
          min-width: 104px;
          padding: 10px;
        }

        .rrHudValue {
          font-size: 28px;
        }

        .rrSongGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .rrQueueRow {
          grid-template-columns: 52px minmax(0, 1fr);
        }

        .rrQueueActions {
          grid-column: 1 / -1;
        }

        .rrProductGrid,
        .rrTwoCol {
          grid-template-columns: 1fr;
        }

        .rrFooterInner {
          grid-template-columns: 1fr;
        }

        .rrTitle {
          font-size: clamp(24px, 8vw, 34px);
        }

        .rrMiniCard {
          grid-template-columns: 36px minmax(0, 1fr);
        }

        .rrArt {
          width: 36px;
          height: 36px;
        }
      }

      @media (max-width: 520px) {
        .rrSongGrid {
          grid-template-columns: 1fr 1fr;
        }

        .rrPanelHead,
        .rrPanelBody,
        .rrDrawerHead,
        .rrDrawerBody {
          padding-left: 14px;
          padding-right: 14px;
        }

        .rrChip {
          min-height: 32px;
          padding: 0 12px;
          font-size: 12px;
        }

        .rrSearchInput {
          min-height: 44px;
          font-size: 16px;
        }
      }
    `}</style>
  );
}
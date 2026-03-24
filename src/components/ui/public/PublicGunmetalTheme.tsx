"use client";

export default function PublicGunmetalTheme() {
  return (
    <style jsx global>{`
      :root {
        --rr-bg: #05080f;
        --rr-bg-2: #0b111a;
        --rr-surface: linear-gradient(
          180deg,
          rgba(18, 24, 36, 0.94) 0%,
          rgba(8, 13, 22, 0.98) 100%
        );
        --rr-surface-2: linear-gradient(
          135deg,
          rgba(25, 33, 49, 0.9) 0%,
          rgba(9, 14, 23, 0.98) 100%
        );
        --rr-panel-border: rgba(102, 130, 176, 0.18);
        --rr-panel-border-strong: rgba(118, 149, 201, 0.28);
        --rr-text: #f3f6fb;
        --rr-text-soft: #b3bfd2;
        --rr-text-dim: #7c899f;
        --rr-line: rgba(255, 255, 255, 0.08);
        --rr-line-soft: rgba(255, 255, 255, 0.05);
        --rr-blue: #4d8fe4;
        --rr-cyan: #1c8ea2;
        --rr-plum: #6f315f;
        --rr-magenta: #87436f;
        --rr-red: #a64444;
        --rr-gold: #b28a35;
        --rr-green: #5a8254;
        --rr-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
        --rr-radius-xl: 16px;
        --rr-radius-lg: 14px;
        --rr-radius: 12px;
        --rr-radius-sm: 9px;
        --rr-max: 560px;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        background:
          radial-gradient(circle at 20% 0%, rgba(80, 90, 140, 0.15), transparent 40%),
          linear-gradient(180deg, #05070f 0%, #070a14 100%);
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
        width: min(var(--rr-max), calc(100vw - 20px));
        margin: 0 auto;
        padding: 10px 0 88px;
      }

      .rrPublicTopbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: start;
        margin-bottom: 8px;
      }

      .rrBrandLockup {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }

      .rrBrandLogo,
      .rrBrandBadge {
        width: 54px;
        height: 54px;
        border-radius: var(--rr-radius-lg);
        overflow: hidden;
        border: 1px solid rgba(130, 161, 210, 0.18);
        background: linear-gradient(180deg, rgba(26, 35, 51, 0.94), rgba(10, 16, 27, 0.98));
        display: grid;
        place-items: center;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.06),
          0 10px 24px rgba(0, 0, 0, 0.24);
        flex-shrink: 0;
      }

      .rrBrandLogo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .rrBrandBadge {
        font-weight: 1000;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #f3f6fb;
      }

      .rrHero {
        min-width: 0;
        padding-top: 0;
      }

      .rrEyebrow {
        color: #95a4ba;
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.26em;
        text-transform: uppercase;
        margin-bottom: 3px;
      }

      .rrTitle {
        margin: 0;
        font-size: clamp(20px, 6vw, 30px);
        line-height: 0.92;
        font-weight: 1000;
        letter-spacing: -0.04em;
        text-transform: uppercase;
      }

      .rrTitleSub {
        margin-top: 5px;
        color: var(--rr-text-soft);
        font-size: 12px;
        line-height: 1.35;
      }

      .rrHudCard {
        min-width: 112px;
        border-radius: var(--rr-radius-xl);
        border: 1px solid rgba(113, 142, 189, 0.2);
        background: var(--rr-surface);
        box-shadow: var(--rr-shadow);
        padding: 10px;
        text-align: center;
      }

      .rrHudLabel {
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--rr-text-dim);
        margin-bottom: 4px;
      }

      .rrHudValue {
        font-size: 22px;
        line-height: 1;
        font-weight: 1000;
        margin-bottom: 8px;
      }

      .rrBtn,
      .rrBtnGhost,
      .rrBtnWarn,
      .rrBtnDanger {
        appearance: none;
        border: 1px solid rgba(117, 145, 197, 0.24);
        border-radius: var(--rr-radius);
        color: #fff;
        font-weight: 900;
        letter-spacing: 0.01em;
        min-height: 36px;
        padding: 0 14px;
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
        background: linear-gradient(90deg, #2a6f7c, #6a3a6e);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.12),
          0 8px 20px rgba(0, 0, 0, 0.22),
          0 0 0 1px rgba(49, 101, 153, 0.14);
      }

      .rrBtnGhost {
        background: linear-gradient(180deg, rgba(43, 53, 72, 0.84), rgba(18, 26, 39, 0.94));
      }

      .rrBtnWarn {
        background: linear-gradient(180deg, rgba(140, 106, 37, 0.94), rgba(108, 79, 22, 0.98));
        border-color: rgba(255, 214, 120, 0.2);
      }

      .rrBtnDanger {
        background: linear-gradient(180deg, rgba(150, 69, 69, 0.94), rgba(116, 37, 37, 0.98));
        border-color: rgba(255, 162, 162, 0.22);
      }

      .rrPanel {
        border-radius: var(--rr-radius-xl);
        background: var(--rr-surface);
        border: 1px solid var(--rr-panel-border);
        box-shadow: var(--rr-shadow);
        overflow: hidden;
      }

      .rrPanelHead {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 11px 12px 8px;
        border-bottom: 1px solid var(--rr-line-soft);
      }

      .rrPanelTitle {
        font-size: 13px;
        font-weight: 1000;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .rrPanelSub {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 11px;
        line-height: 1.35;
      }

      .rrPanelBody {
        padding: 10px 12px 12px;
      }

      .rrStatusPill,
      .rrTag,
      .rrMetaPill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 21px;
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
        background: rgba(31, 86, 132, 0.34);
        border-color: rgba(105, 182, 255, 0.28);
        color: #cfe9ff;
      }

      .rrStatusPill--warn {
        background: rgba(103, 76, 18, 0.34);
        border-color: rgba(255, 214, 122, 0.2);
        color: #ffdf96;
      }

      .rrStatusPill--danger {
        background: rgba(106, 29, 29, 0.38);
        border-color: rgba(255, 155, 155, 0.22);
        color: #ffc7c7;
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

      .rrTag--hot {
        background: rgba(96, 27, 36, 0.42);
        color: #ffd9df;
        border-color: rgba(255, 164, 182, 0.16);
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
        margin-bottom: 10px;
      }

      .rrSearchInput {
        width: 100%;
        min-height: 40px;
        border: 1px solid rgba(125, 156, 206, 0.16);
        background: linear-gradient(180deg, rgba(8, 14, 24, 0.96), rgba(12, 18, 29, 0.98));
        color: var(--rr-text);
        border-radius: var(--rr-radius);
        padding: 0 14px;
        font-size: 15px;
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
        background: linear-gradient(180deg, rgba(8, 14, 24, 0.96), rgba(12, 18, 29, 0.98));
        color: var(--rr-text);
        border-radius: var(--rr-radius);
        padding: 11px 13px;
        font-size: 14px;
        outline: none;
      }

      .rrTextarea {
        resize: vertical;
        min-height: 118px;
      }

      .rrChipRow {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      .rrChip {
        appearance: none;
        border: 1px solid rgba(125, 156, 206, 0.16);
        background: linear-gradient(180deg, rgba(19, 28, 42, 0.88), rgba(12, 18, 29, 0.94));
        color: #f1f6ff;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 900;
        cursor: pointer;
      }

      .rrChip.is-active {
        background: linear-gradient(180deg, rgba(17, 98, 112, 0.92), rgba(19, 70, 118, 0.96));
        border-color: rgba(96, 201, 255, 0.28);
        box-shadow: 0 0 0 1px rgba(89, 188, 255, 0.12);
      }

      .rrRail {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(170px, 1fr);
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
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        min-height: 70px;
        padding: 9px;
        border-radius: var(--rr-radius-lg);
        background: linear-gradient(90deg, rgba(27, 38, 55, 0.78), rgba(17, 24, 37, 0.94));
        border: 1px solid rgba(125, 156, 206, 0.12);
      }

      .rrArt,
      .rrArtLarge {
        overflow: hidden;
        border-radius: var(--rr-radius-sm);
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(135deg, rgba(46, 56, 74, 0.9), rgba(21, 28, 42, 0.96));
        display: grid;
        place-items: center;
      }

      .rrArt {
        width: 34px;
        height: 34px;
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
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #cad7ef;
      }

      .rrMiniTitle,
      .rrSongTitle,
      .rrQueueTitle {
        font-weight: 1000;
        letter-spacing: -0.02em;
        line-height: 1.03;
      }

      .rrMiniTitle {
        font-size: 13px;
      }

      .rrSongTitle {
        font-size: 13px;
      }

      .rrQueueTitle {
        font-size: 14px;
      }

      .rrMiniMeta,
      .rrSongMeta,
      .rrQueueMeta {
        color: var(--rr-text-soft);
        font-size: 10px;
        margin-top: 4px;
        line-height: 1.3;
      }

      .rrSongGrid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .rrSongCard {
        display: grid;
        grid-template-rows: auto 1fr auto;
        border-radius: var(--rr-radius-xl);
        overflow: hidden;
        border: 1px solid rgba(125, 156, 206, 0.14);
        background: var(--rr-surface-2);
        box-shadow: var(--rr-shadow);
      }

      .rrSongBody {
        padding: 11px 11px 9px;
      }

      .rrSongMetaRow {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .rrSongActions {
        display: grid;
        gap: 7px;
        padding: 0 11px 11px;
      }

      .rrQueueSection {
        display: grid;
        gap: 8px;
      }

      .rrQueueRow {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        border-radius: var(--rr-radius-lg);
        padding: 6px;
        background: linear-gradient(90deg, rgba(24, 34, 49, 0.84), rgba(11, 17, 27, 0.96));
        border: 1px solid rgba(125, 156, 206, 0.11);
      }

      .rrQueueRow--emphasis {
        background: linear-gradient(90deg, rgba(28, 41, 62, 0.96), rgba(15, 23, 37, 0.98), rgba(62, 28, 56, 0.94));
      }

      .rrQueueRank {
        width: 36px;
        height: 36px;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(125, 156, 206, 0.14);
        display: grid;
        place-items: center;
        color: #dbe5fb;
        font-weight: 1000;
        font-size: 14px;
        background: rgba(255, 255, 255, 0.03);
        flex-shrink: 0;
      }

      .rrQueueCopy {
        min-width: 0;
      }

      .rrQueueTagRow {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        align-items: center;
        margin-bottom: 4px;
      }

      .rrQueueScore {
        align-self: center;
      }

      .rrQueueActions {
        display: inline-flex;
        gap: 7px;
        flex-wrap: wrap;
      }

      .rrIconBtn {
        min-width: 40px;
        min-height: 36px;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(125, 156, 206, 0.16);
        background: linear-gradient(180deg, rgba(43, 53, 72, 0.88), rgba(19, 28, 42, 0.96));
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
        padding: 9px 10px calc(9px + env(safe-area-inset-bottom));
        background: linear-gradient(180deg, rgba(5, 8, 13, 0.06), rgba(5, 8, 13, 0.9));
        backdrop-filter: blur(12px);
      }

      .rrFooterInner {
        width: min(var(--rr-max), calc(100vw - 20px));
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
        bottom: 78px;
        transform: translateX(-50%);
        z-index: 60;
        width: min(680px, calc(100vw - 20px));
        border-radius: var(--rr-radius-xl);
        border: 1px solid rgba(114, 157, 230, 0.22);
        background: linear-gradient(180deg, rgba(24, 33, 48, 0.98), rgba(11, 17, 28, 0.99));
        box-shadow: var(--rr-shadow);
        padding: 13px 15px;
      }

      .rrToastRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .rrToastText {
        font-size: 13px;
        font-weight: 800;
        color: #ecf3ff;
      }

      .rrOverlay {
        position: fixed;
        inset: 0;
        z-index: 55;
        background: rgba(3, 6, 11, 0.74);
        backdrop-filter: blur(8px);
        display: grid;
        align-items: end;
      }

      .rrDrawer,
      .rrModal {
        width: min(var(--rr-max), calc(100vw - 20px));
        margin: 0 auto 10px;
        border-radius: var(--rr-radius-xl);
        border: 1px solid rgba(125, 156, 206, 0.16);
        background: linear-gradient(180deg, rgba(18, 26, 40, 0.98), rgba(8, 12, 21, 0.99));
        box-shadow: 0 26px 56px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }

      .rrDrawerHead {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 12px 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .rrDrawerBody {
        padding: 12px;
      }

      .rrDrawerTitle {
        font-size: 17px;
        font-weight: 1000;
        line-height: 1.05;
        text-transform: uppercase;
      }

      .rrDrawerSub {
        margin-top: 5px;
        color: var(--rr-text-soft);
        font-size: 12px;
      }

      .rrPackList {
        display: grid;
        gap: 9px;
      }

      .rrPackRow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 11px;
        border-radius: var(--rr-radius-lg);
        background: linear-gradient(90deg, rgba(26, 36, 53, 0.78), rgba(12, 18, 29, 0.94));
        border: 1px solid rgba(125, 156, 206, 0.11);
      }

      .rrPackTitle {
        font-size: 14px;
        font-weight: 1000;
      }

      .rrPackMeta {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 11px;
      }

      .rrProductGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .rrProductCard {
        border-radius: var(--rr-radius-xl);
        padding: 13px;
        border: 1px solid rgba(125, 156, 206, 0.14);
        background: var(--rr-surface-2);
        box-shadow: var(--rr-shadow);
      }

      .rrProductCard.is-pressed {
        transform: translateY(1px);
      }

      .rrFormStack,
      .rrStack {
        display: grid;
        gap: 11px;
      }

      .rrTwoCol {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 11px;
      }

      .rrHelper {
        color: var(--rr-text-soft);
        font-size: 11px;
        line-height: 1.35;
      }

      .rrChars {
        text-align: right;
        color: var(--rr-text-dim);
        font-size: 11px;
      }

      .rrCloseBtn {
        min-width: 40px;
        min-height: 40px;
      }

      .rrEmpty {
        border-radius: var(--rr-radius-lg);
        border: 1px dashed rgba(125, 156, 206, 0.2);
        background: rgba(255, 255, 255, 0.03);
        padding: 12px;
        color: var(--rr-text-soft);
        text-align: center;
        font-size: 13px;
      }

      .rrDivider {
        height: 1px;
        background: rgba(255, 255, 255, 0.06);
        margin: 10px 0;
      }

      .rrLinkBtn {
        background: none;
        border: none;
        padding: 0;
        color: #cce4ff;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
      }

      .rrQueueShellV2 {
        width: min(560px, calc(100vw - 10px)) !important;
        padding-top: 10px !important;
        padding-bottom: 88px !important;
      }

      .rrTopbarCompact {
        gap: 10px !important;
        align-items: start !important;
      }

      .rrBrandLockupCompact {
        align-items: start !important;
        gap: 10px !important;
      }

      .rrHudCardCompact {
        min-width: 112px;
        padding: 10px;
      }

      .rrHudValueCompact {
        font-size: 22px;
        margin-bottom: 8px;
      }

      .rrBtnFull {
        width: 100%;
      }

      .rrSectionCompact {
        border-radius: var(--rr-radius-xl);
      }

      .rrSectionTight .rrPanelHead {
        padding: 12px 14px 9px;
      }

      .rrSectionTight .rrPanelBody {
        padding: 10px 14px 12px;
      }

      @media (max-width: 980px) {
        .rrSongGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        .rrPublicShell {
          width: min(var(--rr-max), calc(100vw - 14px));
          padding-top: 10px;
        }

        .rrPublicTopbar {
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: start;
        }

        .rrBrandLockup {
          gap: 10px;
        }

        .rrBrandLogo,
        .rrBrandBadge {
          width: 50px;
          height: 50px;
          border-radius: 12px;
        }

        .rrTitle {
          font-size: clamp(20px, 8.5vw, 32px);
        }

        .rrTitleSub {
          font-size: 11px;
          line-height: 1.3;
          margin-top: 6px;
        }

        .rrHudCard {
          min-width: 108px;
          padding: 9px;
          border-radius: var(--rr-radius-xl);
        }

        .rrHudValue {
          font-size: 22px;
        }

        .rrSongGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .rrQueueActions {
          grid-column: 1 / -1;
        }

        .rrProductGrid,
        .rrTwoCol {
          grid-template-columns: 1fr;
        }

        .rrFooterInner {
          grid-template-columns: 1fr auto;
          gap: 8px;
        }

        .rrMiniCard {
          grid-template-columns: 34px minmax(0, 1fr);
        }
      }

      @media (max-width: 520px) {
        .rrPublicShell {
          width: calc(100vw - 10px);
          padding-bottom: 84px;
        }

        .rrQueueShellV2 {
          width: calc(100vw - 8px) !important;
          padding-top: 8px !important;
        }

        .rrPublicTopbar {
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
        }

        .rrBrandLogo,
        .rrBrandBadge {
          width: 44px;
          height: 44px;
          border-radius: 11px;
        }

        .rrEyebrow {
          font-size: 9px;
          margin-bottom: 3px;
        }

        .rrTitle {
          font-size: clamp(18px, 8.8vw, 28px);
          line-height: 0.92;
        }

        .rrTitleSub {
          font-size: 10px;
          margin-top: 5px;
        }

        .rrHudCard {
          min-width: 102px;
          padding: 9px;
        }

        .rrHudValue {
          font-size: 20px;
        }

        .rrPanelTitle {
          font-size: 12px;
        }

        .rrPanelSub,
        .rrMiniMeta,
        .rrSongMeta,
        .rrQueueMeta {
          font-size: 10px;
        }

        .rrQueueTitle,
        .rrSongTitle {
          font-size: 13px;
        }

        .rrSongGrid {
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .rrQueueRow {
          grid-template-columns: 36px 34px minmax(0, 1fr) auto;
          gap: 8px;
          padding: 6px;
          border-radius: var(--rr-radius-lg);
        }

        .rrChip {
          min-height: 28px;
          padding: 0 10px;
          font-size: 11px;
        }

        .rrStatusPill,
        .rrTag,
        .rrMetaPill {
          min-height: 20px;
          padding: 0 8px;
          font-size: 9px;
        }

        .rrBtn,
        .rrBtnGhost,
        .rrBtnWarn,
        .rrBtnDanger,
        .rrIconBtn {
          min-height: 36px;
          border-radius: var(--rr-radius);
          font-size: 12px;
        }

        .rrSearchInput {
          min-height: 40px;
          font-size: 15px;
          border-radius: var(--rr-radius);
        }

        .rrFooterBar {
          padding-left: 8px;
          padding-right: 8px;
        }

        .rrFooterInner {
          width: calc(100vw - 10px);
        }
      }
    `}</style>
  );
}

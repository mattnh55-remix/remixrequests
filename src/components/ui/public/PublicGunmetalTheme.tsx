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
        --rr-panel-border-strong: rgba(118, 149, 201, 0.26);
        --rr-text: #f3f6fb;
        --rr-text-soft: #b3bfd2;
        --rr-text-dim: #7c899f;
        --rr-line: rgba(255, 255, 255, 0.08);
        --rr-line-soft: rgba(255, 255, 255, 0.05);
        --rr-blue: #4d8fe4;
        --rr-blue-2: #2f6fc6;
        --rr-cyan: #2a6f7c;
        --rr-plum: #6a3a6e;
        --rr-magenta: #87436f;
        --rr-red: #a64444;
        --rr-gold: #b28a35;
        --rr-green: #5a8254;
        --rr-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
        --rr-radius-xl: 12px;
        --rr-radius-lg: 10px;
        --rr-radius: 8px;
        --rr-radius-sm: 7px;
        --rr-max: 560px;
      }

      * { box-sizing: border-box; }

      html,
      body {
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
        border-radius: var(--rr-radius-xl);
        border: 1px solid var(--rr-panel-border);
        background: var(--rr-surface-3);
        box-shadow: var(--rr-shadow);
        padding: 10px;
        min-width: 0;
      }

      .rrBrandLogo {
        width: 52px;
        height: 52px;
        border-radius: var(--rr-radius);
        overflow: hidden;
        border: 1px solid rgba(120, 151, 201, 0.16);
        background: linear-gradient(180deg, rgba(25, 34, 49, 0.94), rgba(11, 17, 28, 0.98));
        display: grid;
        place-items: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 24px rgba(0, 0, 0, 0.22);
        flex-shrink: 0;
      }

      .rrBrandLogo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .rrBrandBadge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 72px;
        min-height: 40px;
        padding: 0 14px;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(102, 151, 232, 0.2);
        background: linear-gradient(180deg, rgba(25, 38, 58, 0.95), rgba(12, 20, 32, 0.98));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(47, 80, 130, 0.12);
        font-weight: 1000;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .rrHero {
        min-width: 0;
        padding-top: 1px;
      }

      .rrEyebrow {
        color: #95a4ba;
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.26em;
        text-transform: uppercase;
        margin-bottom: 2px;
      }

      .rrTitle {
        margin: 0;
        font-size: clamp(18px, 8.2vw, 30px);
        line-height: 0.92;
        font-weight: 1000;
        letter-spacing: -0.04em;
        text-transform: uppercase;
      }

      .rrTitleSub {
        margin-top: 5px;
        color: var(--rr-text-soft);
        font-size: 11px;
        line-height: 1.3;
      }

      .rrHeroInlineRow,
      .rrChipRow,
      .rrNoticeActions,
      .rrHudActions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .rrHeroInlineRow { margin-top: 7px; }
      .rrHudActions { margin-top: 8px; }
      .rrNoticeActions { margin-top: 10px; }

      .rrHudCard {
        min-width: 116px;
        border-radius: var(--rr-radius-xl);
        border: 1px solid rgba(113, 142, 189, 0.2);
        background: var(--rr-surface);
        box-shadow: var(--rr-shadow);
        padding: 10px;
        text-align: center;
      }

      .rrHudCard--low {
        border-color: rgba(255, 196, 108, 0.24);
        box-shadow: var(--rr-shadow), 0 0 0 1px rgba(201, 144, 38, 0.08);
      }

      .rrHudLabel {
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--rr-text-dim);
        margin-bottom: 5px;
      }

      .rrHudValue {
        font-size: 24px;
        line-height: 1;
        font-weight: 1000;
      }

      .rrBtn,
      .rrBtnGhost,
      .rrBtnWarn,
      .rrBtnDanger,
      .rrVoteBtn {
        appearance: none;
        border: 1px solid rgba(117, 145, 197, 0.22);
        border-radius: var(--rr-radius);
        color: #fff;
        font-weight: 900;
        font-size: 12px;
        letter-spacing: 0.01em;
        min-height: 36px;
        padding: 0 12px;
        cursor: pointer;
        transition: transform 0.14s ease, border-color 0.14s ease, opacity 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
      }

      .rrBtn:hover,
      .rrBtnGhost:hover,
      .rrBtnWarn:hover,
      .rrBtnDanger:hover,
      .rrVoteBtn:hover { filter: brightness(1.06); }

      .rrBtn:disabled,
      .rrBtnGhost:disabled,
      .rrBtnWarn:disabled,
      .rrBtnDanger:disabled,
      .rrVoteBtn:disabled {
        opacity: 0.48;
        cursor: not-allowed;
      }

      .rrBtn:not(:disabled):active,
      .rrBtnGhost:not(:disabled):active,
      .rrBtnWarn:not(:disabled):active,
      .rrBtnDanger:not(:disabled):active,
      .rrVoteBtn:not(:disabled):active {
        transform: translateY(1px);
      }

      .rrBtn {
        background: linear-gradient(180deg, var(--rr-blue) 0%, var(--rr-blue-2) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 18px rgba(32, 83, 155, 0.28);
      }

      .rrBtnGhost,
      .rrVoteBtnGhost,
      .rrMuteBtn {
        background: linear-gradient(180deg, rgba(43, 53, 72, 0.84), rgba(18, 26, 39, 0.94));
      }

      .rrBtnWarn {
        background: linear-gradient(180deg, rgba(160, 122, 43, 0.96), rgba(126, 92, 25, 0.99));
        border-color: rgba(255, 214, 120, 0.22);
      }

      .rrBtnDanger {
        background: linear-gradient(180deg, rgba(161, 79, 84, 0.96), rgba(125, 46, 51, 0.99));
        border-color: rgba(255, 162, 162, 0.24);
      }

      .rrVoteBtn {
        width: 34px;
        min-width: 34px;
        height: 34px;
        min-height: 34px;
        padding: 0;
        display: grid;
        place-items: center;
        font-size: 16px;
      }

      .rrVoteBtnPrimary {
        background: linear-gradient(180deg, rgba(77, 143, 228, 0.98), rgba(47, 111, 198, 0.99));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 14px rgba(32, 83, 155, 0.24);
      }

      .rrPanel,
      .rrNoticeCard,
      .rrMessage {
        border-radius: var(--rr-radius-xl);
        background: var(--rr-surface);
        border: 1px solid var(--rr-panel-border);
        box-shadow: var(--rr-shadow);
        overflow: hidden;
        margin-bottom: 8px;
      }

      .rrPanelTight { margin-bottom: 8px; }

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

      .rrPanelBodyGrid {
        display: grid;
        gap: 6px;
      }

      .rrStatusPill,
      .rrTag,
      .rrMetaPill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 20px;
        padding: 0 8px;
        border-radius: 999px;
        font-size: 9px;
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
        box-shadow: 0 0 0 1px rgba(61, 130, 215, 0.12);
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

      .rrMetaPill {
        background: rgba(255, 255, 255, 0.06);
        color: #dbe5fb;
      }

      .rrArt {
        width: 40px;
        height: 40px;
        overflow: hidden;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(135deg, rgba(46, 56, 74, 0.9), rgba(21, 28, 42, 0.96));
        display: grid;
        place-items: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .rrArt img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .rrArtFallback {
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #cad7ef;
      }

      .rrQueueTitle {
        font-size: 14px;
        font-weight: 1000;
        letter-spacing: -0.03em;
        line-height: 1.02;
      }

      .rrQueueMeta {
        color: var(--rr-text-soft);
        font-size: 10px;
        margin-top: 3px;
        line-height: 1.28;
      }

      .rrQueueRow {
        display: grid;
        grid-template-columns: 34px 40px minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        border-radius: var(--rr-radius-lg);
        padding: 7px;
        background: linear-gradient(90deg, rgba(18, 27, 43, 0.96) 0%, rgba(10, 17, 28, 0.98) 70%, rgba(11, 16, 28, 0.98) 100%);
        border: 1px solid rgba(125, 156, 206, 0.12);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      }

      .rrQueueRow--emphasis {
        background: linear-gradient(90deg, rgba(27, 40, 62, 0.98) 0%, rgba(12, 20, 33, 0.98) 64%, rgba(58, 28, 58, 0.95) 100%);
        border-color: rgba(136, 169, 227, 0.18);
      }

      .rrQueueRank {
        width: 34px;
        height: 34px;
        border-radius: var(--rr-radius);
        border: 1px solid rgba(125, 156, 206, 0.16);
        display: grid;
        place-items: center;
        color: #dbe5fb;
        font-weight: 1000;
        font-size: 13px;
        background: linear-gradient(180deg, rgba(25, 35, 52, 0.94), rgba(12, 19, 31, 0.98));
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

      .rrQueueRight {
        display: grid;
        justify-items: end;
        gap: 5px;
      }

      .rrQueueScore { align-self: center; }

      .rrQueueNote {
        color: var(--rr-text-dim);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .rrVoteRail {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .rrSectionStack,
      .rrSectionIntro {
        display: grid;
        gap: 8px;
      }

      .rrNoticeCard {
        padding: 10px 11px;
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
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }

      .rrInput::placeholder {
        color: var(--rr-text-dim);
      }

      .rrInput:focus {
        border-color: rgba(105, 182, 255, 0.34);
        box-shadow: 0 0 0 1px rgba(61, 130, 215, 0.12), inset 0 1px 0 rgba(255,255,255,0.03);
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

      .rrFooterCta {
        width: 100%;
      }

      @media (max-width: 520px) {
        .rrPublicShell,
        .rrFooterInner {
          width: calc(100vw - 10px);
        }

        .rrPublicTopbar {
          grid-template-columns: 1fr;
        }

        .rrHudCard {
          min-width: 0;
        }

        .rrInlineForm {
          grid-template-columns: 1fr;
        }

        .rrQueueRow {
          grid-template-columns: 30px 40px minmax(0, 1fr);
          align-items: start;
        }

        .rrQueueRight {
          grid-column: 2 / span 2;
          justify-items: start;
          padding-left: 2px;
        }
      }
    `}</style>
  );
}
"use client";

export default function PublicGunmetalTheme() {
  return (
    <style jsx global>{`
      :root {
        --rr-bg: #04070d;
        --rr-bg-2: #07101a;
        --rr-bg-3: #0b1625;
        --rr-panel-top: rgba(20, 29, 45, 0.92);
        --rr-panel-bottom: rgba(8, 13, 22, 0.98);
        --rr-surface: linear-gradient(180deg, var(--rr-panel-top) 0%, var(--rr-panel-bottom) 100%);
        --rr-surface-2: linear-gradient(135deg, rgba(24, 35, 52, 0.96) 0%, rgba(10, 16, 27, 0.99) 100%);
        --rr-surface-3: linear-gradient(
          90deg,
          rgba(16, 25, 39, 0.98) 0%,
          rgba(11, 18, 30, 0.98) 52%,
          rgba(20, 14, 31, 0.98) 100%
        );
        --rr-panel-border: rgba(94, 120, 166, 0.2);
        --rr-panel-border-strong: rgba(124, 158, 214, 0.3);
        --rr-line: rgba(255, 255, 255, 0.08);
        --rr-line-soft: rgba(255, 255, 255, 0.05);
        --rr-text: #f3f6fb;
        --rr-text-soft: #b7c4d9;
        --rr-text-dim: #8493ab;
        --rr-blue: #4f91ea;
        --rr-blue-soft: #75b3ff;
        --rr-cyan: #2c7d8f;
        --rr-violet: #6d468d;
        --rr-magenta: #8f476f;
        --rr-red: #a84f55;
        --rr-gold: #b99038;
        --rr-green: #4f8660;
        --rr-shadow-lg: 0 22px 50px rgba(0, 0, 0, 0.42);
        --rr-shadow-md: 0 12px 28px rgba(0, 0, 0, 0.3);
        --rr-radius-xl: 16px;
        --rr-radius-lg: 13px;
        --rr-radius: 10px;
        --rr-radius-sm: 8px;
        --rr-max: 620px;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        min-height: 100%;
        background:
          radial-gradient(circle at top left, rgba(69, 104, 172, 0.16), transparent 28%),
          radial-gradient(circle at top right, rgba(110, 54, 106, 0.12), transparent 26%),
          linear-gradient(180deg, #04070d 0%, #050913 35%, #07101c 100%);
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
        overflow-x: clip;
      }

      .rrPublicPage::before,
      .rrPublicPage::after {
        content: "";
        position: fixed;
        pointer-events: none;
        inset: auto;
        z-index: 0;
      }

      .rrPublicPage::before {
        top: 72px;
        left: -120px;
        width: 260px;
        height: 260px;
        background: radial-gradient(circle, rgba(78, 121, 206, 0.16), transparent 70%);
        filter: blur(18px);
      }

      .rrPublicPage::after {
        right: -110px;
        top: 220px;
        width: 240px;
        height: 240px;
        background: radial-gradient(circle, rgba(109, 70, 141, 0.14), transparent 70%);
        filter: blur(22px);
      }

      .rrPublicShell {
        width: min(var(--rr-max), calc(100vw - 14px));
        margin: 0 auto;
        padding: 8px 0 94px;
        position: relative;
        z-index: 1;
      }

      .rrTopRail {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 8px;
      }

      .rrMiniStat {
        border-radius: var(--rr-radius);
        border: 1px solid rgba(120, 150, 200, 0.16);
        background: linear-gradient(180deg, rgba(17, 24, 37, 0.95), rgba(10, 16, 26, 0.98));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        padding: 8px 9px;
        min-height: 58px;
      }

      .rrMiniStatLabel {
        color: var(--rr-text-dim);
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        margin-bottom: 6px;
      }

      .rrMiniStatValue {
        font-size: 18px;
        line-height: 1;
        font-weight: 1000;
        letter-spacing: -0.03em;
      }

      .rrMiniStatSub {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 10px;
        line-height: 1.2;
      }

      .rrPublicTopbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: stretch;
        margin-bottom: 8px;
      }

      .rrBrandLockup {
        min-width: 0;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        border-radius: var(--rr-radius-xl);
        border: 1px solid var(--rr-panel-border);
        background: linear-gradient(
          90deg,
          rgba(18, 27, 42, 0.96) 0%,
          rgba(13, 20, 33, 0.98) 55%,
          rgba(8, 14, 23, 0.98) 100%
        );
        box-shadow: var(--rr-shadow-lg);
        padding: 12px;
        position: relative;
        overflow: hidden;
      }

      .rrBrandLockup::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          rgba(91, 134, 210, 0.08),
          transparent 42%,
          rgba(120, 55, 112, 0.1)
        );
        pointer-events: none;
      }

      .rrBrandLogo {
        width: 56px;
        height: 56px;
        border-radius: 11px;
        overflow: hidden;
        border: 1px solid rgba(122, 156, 210, 0.18);
        background: linear-gradient(180deg, rgba(25, 34, 49, 0.94), rgba(11, 17, 28, 0.98));
        display: grid;
        place-items: center;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.05),
          0 10px 24px rgba(0, 0, 0, 0.24);
      }

      .rrBrandLogo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .rrBrandBadge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 11px;
        border: 1px solid rgba(102, 151, 232, 0.22);
        background: linear-gradient(180deg, rgba(25, 38, 58, 0.95), rgba(12, 20, 32, 0.98));
        font-weight: 1000;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .rrHero {
        min-width: 0;
        position: relative;
        z-index: 1;
      }

      .rrEyebrow {
        color: #95a4ba;
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.26em;
        text-transform: uppercase;
        margin-bottom: 3px;
      }

      .rrTitle {
        margin: 0;
        font-size: clamp(20px, 8vw, 34px);
        line-height: 0.92;
        font-weight: 1000;
        letter-spacing: -0.05em;
        text-transform: uppercase;
      }

      .rrTitleSub {
        margin-top: 6px;
        color: var(--rr-text-soft);
        font-size: 11px;
        line-height: 1.35;
      }

      .rrHeroInlineRow {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .rrHudCard {
        min-width: 120px;
        border-radius: var(--rr-radius-xl);
        border: 1px solid rgba(113, 142, 189, 0.2);
        background: var(--rr-surface);
        box-shadow: var(--rr-shadow-lg);
        padding: 10px;
        text-align: center;
      }

      .rrHudLabel {
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--rr-text-dim);
        margin-bottom: 5px;
      }

      .rrHudValue {
        font-size: 24px;
        line-height: 1;
        font-weight: 1000;
        margin-bottom: 8px;
      }

      .rrBtn,
      .rrBtnGhost,
      .rrBtnWarn,
      .rrBtnDanger {
        appearance: none;
        border: 1px solid rgba(117, 145, 197, 0.22);
        border-radius: 10px;
        color: #fff;
        font-weight: 900;
        font-size: 12px;
        letter-spacing: 0.01em;
        min-height: 38px;
        padding: 0 14px;
        cursor: pointer;
        transition:
          transform 0.14s ease,
          border-color 0.14s ease,
          opacity 0.14s ease,
          box-shadow 0.14s ease,
          filter 0.14s ease;
      }

      .rrBtn:hover,
      .rrBtnGhost:hover,
      .rrBtnWarn:hover,
      .rrBtnDanger:hover {
        filter: brightness(1.06);
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
        background: linear-gradient(180deg, #4d8fe4 0%, #2f6fc6 100%);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.16),
          0 8px 18px rgba(32, 83, 155, 0.28);
      }

      .rrBtnGhost {
        background: linear-gradient(180deg, rgba(43, 53, 72, 0.84), rgba(18, 26, 39, 0.94));
      }

      .rrBtnWarn {
        background: linear-gradient(180deg, rgba(160, 122, 43, 0.96), rgba(126, 92, 25, 0.99));
        border-color: rgba(255, 214, 120, 0.22);
      }

      .rrBtnDanger {
        background: linear-gradient(180deg, rgba(161, 79, 84, 0.96), rgba(125, 46, 51, 0.99));
        border-color: rgba(255, 162, 162, 0.24);
      }

      .rrPanel {
        border-radius: var(--rr-radius-xl);
        background: var(--rr-surface);
        border: 1px solid var(--rr-panel-border);
        box-shadow: var(--rr-shadow-lg);
        overflow: hidden;
        margin-bottom: 8px;
      }

      .rrPanelHead {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 11px 12px 8px;
        border-bottom: 1px solid var(--rr-line-soft);
        background: linear-gradient(180deg, rgba(15, 24, 38, 0.5), rgba(15, 24, 38, 0));
      }

      .rrPanelTitle {
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .rrPanelSub {
        margin-top: 4px;
        color: var(--rr-text-soft);
        font-size: 10px;
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
        padding: 0 8px;
        border-radius: 999px;
        font-size: 9px;
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
        box-shadow: 0 0 0 1px rgba(61, 130, 215, 0.12);
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

      .rrTag--queued {
        background: rgba(255, 255, 255, 0.06);
        color: #d7dcea;
        border-color: rgba(255, 255, 255, 0.08);
      }

      .rrMetaPill {
        background: rgba(255, 255, 255, 0.06);
        color: #dbe5fb;
      }

      .rrChipRow {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }

      .rrArt {
        width: 42px;
        height: 42px;
        overflow: hidden;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(135deg, rgba(46, 56, 74, 0.9), rgba(21, 28, 42, 0.96));
        display: grid;
        place-items: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .rrArt img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .rrArtFallback {
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #cad7ef;
      }

      .rrQueueTitle {
        font-size: 14px;
        font-weight: 1000;
        letter-spacing: -0.03em;
        line-height: 1.02;
      }

      .rrQueueMeta {
        color: var(--rr-text-soft);
        font-size: 10px;
        margin-top: 3px;
        line-height: 1.28;
      }

      .rrQueueRow {
        display: grid;
        grid-template-columns: 38px 42px minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        border-radius: 12px;
        padding: 7px;
        background: linear-gradient(
          90deg,
          rgba(18, 27, 43, 0.96) 0%,
          rgba(10, 17, 28, 0.98) 70%,
          rgba(11, 16, 28, 0.98) 100%
        );
        border: 1px solid rgba(125, 156, 206, 0.12);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      }

      .rrQueueRow--emphasis {
        background: linear-gradient(
          90deg,
          rgba(27, 40, 62, 0.98) 0%,
          rgba(12, 20, 33, 0.98) 64%,
          rgba(58, 28, 58, 0.95) 100%
        );
        border-color: rgba(136, 169, 227, 0.18);
      }

      .rrQueueRank {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        border: 1px solid rgba(125, 156, 206, 0.16);
        display: grid;
        place-items: center;
        color: #dbe5fb;
        font-weight: 1000;
        font-size: 14px;
        background: linear-gradient(180deg, rgba(25, 35, 52, 0.94), rgba(12, 19, 31, 0.98));
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

      .rrQueueRight {
        display: grid;
        justify-items: end;
        gap: 6px;
      }

      .rrQueueScore {
        align-self: center;
      }

      .rrQueueNote {
        color: var(--rr-text-dim);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .rrSectionStack {
        display: grid;
        gap: 8px;
      }

      .rrSectionIntro {
        display: grid;
        gap: 8px;
      }

      .rrNoticeCard {
        border-radius: 12px;
        border: 1px solid rgba(122, 155, 210, 0.16);
        background: linear-gradient(180deg, rgba(17, 27, 43, 0.9), rgba(10, 16, 27, 0.96));
        padding: 10px 11px;
      }

      .rrNoticeTitle {
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--rr-text-dim);
        margin-bottom: 6px;
      }

      .rrNoticeText {
        color: var(--rr-text-soft);
        font-size: 12px;
        line-height: 1.35;
      }

      .rrEmpty {
        border-radius: 12px;
        border: 1px dashed rgba(125, 156, 206, 0.2);
        background: rgba(255, 255, 255, 0.03);
        padding: 14px;
        color: var(--rr-text-soft);
        text-align: center;
        font-size: 13px;
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
        width: min(var(--rr-max), calc(100vw - 14px));
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
      }

      .rrFooterCta {
        width: 100%;
      }

      @media (max-width: 520px) {
        .rrPublicShell {
          width: calc(100vw - 14px);
          padding-bottom: 82px;
        }

        .rrBrandLogo,
        .rrBrandBadge {
          width: 50px;
          height: 50px;
        }

        .rrHudCard {
          min-width: 110px;
          padding: 9px;
        }

        .rrHudValue {
          font-size: 22px;
        }

        .rrFooterInner {
          width: calc(100vw - 14px);
        }
      }
    `}</style>
  );
}
"use client";

export default function PublicGunmetalTheme() {
  return (
    <style jsx global>{`
      :root {
        --rr-bg: #05070f;
        --rr-bg-2: #0a111d;
        --rr-surface: linear-gradient(
          180deg,
          rgba(17, 24, 37, 0.94) 0%,
          rgba(8, 13, 22, 0.98) 100%
        );
        --rr-surface-2: linear-gradient(
          135deg,
          rgba(23, 32, 48, 0.92) 0%,
          rgba(9, 14, 23, 0.98) 100%
        );
        --rr-panel-border: rgba(108, 137, 186, 0.18);
        --rr-panel-border-strong: rgba(118, 149, 201, 0.26);
        --rr-text: #f3f6fb;
        --rr-text-soft: #b3bfd2;
        --rr-text-dim: #7c899f;
        --rr-line: rgba(255, 255, 255, 0.08);
        --rr-line-soft: rgba(255, 255, 255, 0.05);
        --rr-blue: #4d8fe4;
        --rr-cyan: #2a6f7c;
        --rr-plum: #6a3a6e;
        --rr-magenta: #87436f;
        --rr-red: #a64444;
        --rr-gold: #b28a35;
        --rr-green: #5a8254;
        --rr-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);

        --rr-radius-xl: 14px;
        --rr-radius-lg: 12px;
        --rr-radius: 10px;
        --rr-radius-sm: 8px;

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
        width: min(var(--rr-max), calc(100vw - 10px));
        margin: 0 auto;
        padding: 10px 0 84px;
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

      .rrBrandLogo {
        width: 52px;
        height: 52px;
        border-radius: var(--rr-radius);
        overflow: hidden;
        border: 1px solid rgba(120, 151, 201, 0.16);
        background: linear-gradient(180deg, rgba(25, 34, 49, 0.94), rgba(11, 17, 28, 0.98));
        display: grid;
        place-items: center;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.05),
          0 10px 24px rgba(0, 0, 0, 0.22);
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
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.06),
          0 0 0 1px rgba(47, 80, 130, 0.12);
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

      .rrHudCard {
        min-width: 112px;
        border-radius: var(--rr-radius-xl);
        border: 1px solid rgba(113, 142, 189, 0.18);
        background: var(--rr-surface);
        box-shadow: var(--rr-shadow);
        padding: 10px;
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
        border: 1px solid rgba(117, 145, 197, 0.22);
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
          0 0 0 1px rgba(49, 101, 153, 0.12);
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
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.02em;
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

      .rrChipRow {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }

      .rrArt {
        width: 34px;
        height: 34px;
        overflow: hidden;
        border-radius: var(--rr-radius-sm);
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
        font-size: 9px;
        font-weight: 1000;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #cad7ef;
      }

      .rrQueueTitle {
        font-size: 13px;
        font-weight: 1000;
        letter-spacing: -0.02em;
        line-height: 1.03;
      }

      .rrQueueMeta {
        color: var(--rr-text-soft);
        font-size: 10px;
        margin-top: 2px;
        line-height: 1.25;
      }

      .rrQueueRow {
        display: grid;
        grid-template-columns: 36px 34px minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        border-radius: var(--rr-radius-lg);
        padding: 6px;
        background: linear-gradient(180deg, rgba(17, 26, 40, 0.92), rgba(8, 14, 24, 0.98));
        border: 1px solid rgba(125, 156, 206, 0.11);
      }

      .rrQueueRow--emphasis {
        background: linear-gradient(
          90deg,
          rgba(28, 41, 62, 0.96),
          rgba(15, 23, 37, 0.98),
          rgba(62, 28, 56, 0.94)
        );
      }

      .rrQueueRank {
        width: 36px;
        height: 36px;
        border-radius: var(--rr-radius-sm);
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

      .rrEmpty {
        border-radius: var(--rr-radius-lg);
        border: 1px dashed rgba(125, 156, 206, 0.2);
        background: rgba(255, 255, 255, 0.03);
        padding: 12px;
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
        .rrPublicShell {
          width: calc(100vw - 10px);
          padding-bottom: 82px;
        }

        .rrBrandLogo {
          width: 46px;
          height: 46px;
        }

        .rrHudCard {
          min-width: 108px;
          padding: 9px;
        }

        .rrHudValue {
          font-size: 20px;
        }

        .rrFooterInner {
          width: calc(100vw - 10px);
        }
      }
    `}</style>
  );
}

"use client";

export default function AdminGunmetalTheme() {
  return (
    <style jsx global>{`
      :root {
        --adm-bg: #05070f;
        --adm-bg-2: #0a111d;
        --adm-surface: linear-gradient(180deg, rgba(17, 24, 37, 0.94) 0%, rgba(8, 13, 22, 0.98) 100%);
        --adm-surface-2: linear-gradient(135deg, rgba(23, 32, 48, 0.92) 0%, rgba(9, 14, 23, 0.98) 100%);
        --adm-surface-3: linear-gradient(90deg, rgba(18, 27, 42, 0.96) 0%, rgba(13, 20, 33, 0.98) 55%, rgba(8, 14, 23, 0.98) 100%);
        --adm-border: rgba(108, 137, 186, 0.18);
        --adm-border-strong: rgba(112, 152, 224, 0.34);
        --adm-line: rgba(255, 255, 255, 0.06);
        --adm-text: #f3f6fb;
        --adm-text-soft: #b3bfd2;
        --adm-text-dim: #7c899f;
        --adm-blue: #4d8fe4;
        --adm-blue-2: #2f6fc6;
        --adm-gold: #d2ac59;
        --adm-danger: #b16478;
        --adm-shadow: 0 18px 40px rgba(0, 0, 0, 0.42);
        --adm-radius-xl: 18px;
        --adm-radius-lg: 14px;
        --adm-radius: 10px;
      }

      * { box-sizing: border-box; }
      html, body {
        min-height: 100%;
        background:
          radial-gradient(circle at 20% 0%, rgba(80, 90, 140, 0.15), transparent 40%),
          linear-gradient(180deg, #05070f 0%, #070a14 100%);
        color: var(--adm-text);
      }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .admPage {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
      }
      .admShell {
        width: min(1440px, calc(100vw - 24px));
        margin: 0 auto;
        padding: 12px 0 28px;
      }
      .admLoginWrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 20px;
      }
      .admLoginCard,
      .admHero,
      .admPanel,
      .admSubPanel,
      .admNotice,
      .admModalCard {
        border-radius: var(--adm-radius-xl);
        border: 1px solid var(--adm-border);
        background: var(--adm-surface);
        box-shadow: var(--adm-shadow);
      }
      .admLoginCard {
        width: min(560px, 100%);
        padding: 18px;
        display: grid;
        gap: 12px;
        text-align: center;
      }
      .admLoginLogo {
        width: 120px;
        height: 120px;
        object-fit: contain;
        border-radius: 16px;
        margin: 0 auto 2px;
        background: linear-gradient(180deg, rgba(25,34,49,0.94), rgba(11,17,28,0.98));
        padding: 12px;
        border: 1px solid rgba(102, 151, 232, 0.2);
      }
      .admHero {
        padding: 12px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        margin-bottom: 10px;
        background: var(--adm-surface-3);
      }
      .admHeroMain {
        min-width: 0;
        display: grid;
        grid-template-columns: 62px minmax(0, 1fr);
        gap: 12px;
        align-items: center;
      }
      .admHeroLogoWrap {
        width: 62px;
        height: 62px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, rgba(25,34,49,0.94), rgba(11,17,28,0.98));
        border: 1px solid rgba(102, 151, 232, 0.2);
      }
      .admHeroLogo {
        width: 46px;
        height: 46px;
        object-fit: contain;
      }
      .admKicker {
        font-size: 10px;
        line-height: 1;
        font-weight: 1000;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--adm-text-dim);
      }
      .admTitle {
        margin-top: 5px;
        font-size: clamp(22px, 3.2vw, 30px);
        line-height: 0.95;
        font-weight: 1000;
        letter-spacing: -0.04em;
        text-transform: uppercase;
      }
      .admSubTitle {
        margin-top: 6px;
        color: var(--adm-text-soft);
        font-size: 12px;
        line-height: 1.35;
      }
      .admHeroStats {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .admPill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 24px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.05);
        color: #d8e2f5;
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .admPill--live { background: rgba(31,86,132,0.34); border-color: rgba(105,182,255,0.3); color: #cfe9ff; }
      .admPill--warn { background: rgba(103,76,18,0.34); border-color: rgba(255,214,122,0.22); color: #ffdf96; }
      .admPill--danger { background: rgba(95,38,52,0.35); border-color: rgba(220,144,170,0.18); color: #ffd7e2; }
      .admTabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 2px;
        margin-bottom: 10px;
      }
      .admTabs::-webkit-scrollbar { display: none; }
.admTab {
  appearance: none;
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(117, 145, 197, 0.22);
  background: linear-gradient(180deg, rgba(43, 53, 72, 0.84), rgba(18, 26, 39, 0.94));
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}
      .admTab.is-active {
        background: linear-gradient(180deg, rgba(77, 143, 228, 0.98), rgba(47, 111, 198, 0.99));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 18px rgba(32, 83, 155, 0.18);
      }
      .admNotice {
        padding: 12px 14px;
        margin-bottom: 10px;
      }
      .admGrid2,
      .admGridMain,
      .admGridSettings,
      .admSectionStack,
      .admFieldStack,
      .admActionRow,
      .admStatRail,
      .admRows {
        display: grid;
        gap: 12px;
      }
      .admGrid2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .admGridMain { grid-template-columns: 1fr 1fr; }
      .admGridSettings { grid-template-columns: 1.05fr 0.95fr; }
      .admPanel {
        overflow: hidden;
      }
      .admPanelHead {
        padding: 12px 14px 10px;
        border-bottom: 1px solid var(--adm-line);
        background: linear-gradient(180deg, rgba(15,24,38,0.5), rgba(15,24,38,0));
      }
      .admPanelHead--center { text-align: center; }
      .admPanelTitle {
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .admPanelSub {
        margin-top: 4px;
        color: var(--adm-text-soft);
        font-size: 12px;
        line-height: 1.35;
      }
      .admPanelBody { padding: 12px 14px 14px; }
      .admSubPanel {
        padding: 12px;
        background: var(--adm-surface-2);
      }
      .admSubTitleRow {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
      }
      .admSubTitleText {
        font-size: 11px;
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .admSubCopy {
        font-size: 12px;
        color: var(--adm-text-soft);
        line-height: 1.35;
      }
      .admRows { gap: 10px; }
      .admRow,
      .admRowCard,
      .admMetricCard {
        border-radius: 14px;
        border: 1px solid rgba(125, 156, 206, 0.12);
        background: linear-gradient(90deg, rgba(18, 27, 43, 0.96) 0%, rgba(10, 17, 28, 0.98) 70%, rgba(11, 16, 28, 0.98) 100%);
      }
      .admRow {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        padding: 12px;
      }
      .admRowCard {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        padding: 12px;
      }
      .admMetricGrid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .admMetricCard {
        padding: 12px;
        min-width: 0;
      }
      .admMetricLabel {
        font-size: 10px;
        color: var(--adm-text-dim);
        font-weight: 1000;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .admMetricValue {
        margin-top: 6px;
        font-size: 24px;
        line-height: 1;
        font-weight: 1000;
      }
      .admMetricSub {
        margin-top: 6px;
        font-size: 12px;
        color: var(--adm-text-soft);
      }
      .admLabel {
        font-size: 11px;
        color: var(--adm-text-soft);
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .admField {
        display: grid;
        gap: 6px;
      }
      .admFieldHelp {
        font-size: 11px;
        color: var(--adm-text-dim);
      }
      .admInput,
      .admTextarea,
      .admSelect {
        width: 100%;
        min-height: 42px;
        border-radius: 12px;
        border: 1px solid rgba(117,145,197,0.22);
        background: linear-gradient(180deg, rgba(16,24,37,0.96), rgba(9,15,24,0.98));
        color: var(--adm-text);
        padding: 0 12px;
        outline: none;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
      }
      .admTextarea {
        min-height: 112px;
        padding: 11px 12px;
        resize: vertical;
        font: inherit;
      }
.admTabLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.admTab,
.admTabLink {
  min-height: 40px;
  line-height: 1;
}
.admTabs {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
      .admInput:focus,
      .admTextarea:focus,
      .admSelect:focus {
        border-color: rgba(105,182,255,0.34);
        box-shadow: 0 0 0 1px rgba(61,130,215,0.12);
      }
      .admInput::placeholder,
      .admTextarea::placeholder { color: var(--adm-text-dim); }
      .admBtn,
      .admBtnGhost,
      .admBtnDanger {
        appearance: none;
        border-radius: 12px;
        min-height: 36px;
        padding: 0 12px;
        border: 1px solid rgba(117,145,197,0.22);
        color: #fff;
        font-weight: 900;
        font-size: 12px;
        cursor: pointer;
      }
      .admBtn { background: linear-gradient(180deg, var(--adm-blue) 0%, var(--adm-blue-2) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 18px rgba(32, 83, 155, 0.28); }
      .admBtnGhost { background: linear-gradient(180deg, rgba(43,53,72,0.84), rgba(18,26,39,0.94)); }
      .admBtnDanger { background: linear-gradient(180deg, rgba(101, 51, 67, 0.92), rgba(69, 28, 42, 0.96)); border-color: rgba(220,144,170,0.2); }
      .admBtn:disabled,
      .admBtnGhost:disabled,
      .admBtnDanger:disabled { opacity: 0.48; cursor: not-allowed; }
      .admBtn--full { width: 100%; }
      .admActionRow {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .admSplitActions {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .admMuted { color: var(--adm-text-soft); }
      .admDim { color: var(--adm-text-dim); }
      .admHr {
        height: 1px;
        background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(120,130,255,0.38), rgba(255,255,255,0.04));
      }

      .admUserHistoryRow {
        width: 100%;
        text-align: left;
        cursor: pointer;
      }
      .admUserHistoryRow:hover {
        border-color: var(--adm-border-strong);
        box-shadow: 0 0 0 1px rgba(77, 143, 228, 0.12);
      }
      .admUserModal {
        width: min(1120px, 100%);
      }
      .admUserModalGrid {
        grid-template-columns: 320px minmax(0, 1fr);
        align-items: start;
      }
      .admUserLedgerList {
        display: grid;
        gap: 8px;
        max-height: 50vh;
        overflow: auto;
      }
      .admUserLedgerRow {
        border-radius: 12px;
        border: 1px solid rgba(125, 156, 206, 0.12);
        background: linear-gradient(90deg, rgba(18, 27, 43, 0.96) 0%, rgba(10, 17, 28, 0.98) 70%, rgba(11, 16, 28, 0.98) 100%);
        padding: 10px;
      }
      .admOverlay {
        position: fixed;
        inset: 0;
        z-index: 300;
        background: rgba(2,5,10,0.74);
        backdrop-filter: blur(8px);
        display: grid;
        place-items: center;
        padding: 18px;
      }
      .admModalCard {
        width: min(920px, 100%);
        max-height: 84vh;
        overflow: auto;
        padding: 16px;
      }
      .admLoginBody {
        display: grid;
        gap: 10px;
      }
      .admStickySave {
        position: sticky;
        bottom: 0;
        margin-top: 8px;
        padding-top: 10px;
        background: linear-gradient(180deg, rgba(5,7,15,0), rgba(5,7,15,0.96) 38%);
      }
      .admFileInput { color: #fff; width: 100%; }
      .admMono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .admTextWrap { min-width: 0; }
      .admTextWrap b { color: #fff; }
      .admBoostBand {
        border-radius: 14px;
        padding: 10px 12px;
        border: 1px solid rgba(136,169,227,0.18);
        background: linear-gradient(90deg, rgba(27,40,62,0.98) 0%, rgba(12,20,33,0.98) 64%, rgba(58,28,58,0.95) 100%);
        font-size: 12px;
        font-weight: 1000;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .admRequestType--boost { background: rgba(99,30,68,0.4); color: #ffd2f3; border-color: rgba(236,141,219,0.16); }
      .admRequestType--request { background: rgba(128,42,42,0.38); color: #ffd4d4; border-color: rgba(255,149,149,0.16); }
      @media (max-width: 1120px) {
        .admGridMain,
        .admGridSettings,
        .admGrid2 { grid-template-columns: 1fr; }
        .admMetricGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .admHero { grid-template-columns: 1fr; }
        .admHeroStats { justify-content: flex-start; }
      }
      @media (max-width: 700px) {
        .admShell { width: calc(100vw - 12px); padding-top: 6px; }
        .admHeroMain { grid-template-columns: 54px minmax(0, 1fr); gap: 10px; }
        .admHeroLogoWrap { width: 54px; height: 54px; }
        .admHeroLogo { width: 40px; height: 40px; }
        .admMetricGrid { grid-template-columns: 1fr 1fr; }
        .admRow,
        .admRowCard,
        .admSplitActions { flex-direction: column; align-items: stretch; }
      }
    `}</style>
  );
}

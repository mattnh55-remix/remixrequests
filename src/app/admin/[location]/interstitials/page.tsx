import { prisma } from "@/lib/prisma";
import { InterstitialAssetForm } from "@/components/admin/interstitials/interstitial-asset-form";
import { InterstitialAssetsTable } from "@/components/admin/interstitials/interstitial-assets-table";

const CATEGORY_OPTIONS = [
  "REQUEST_SINGLE",
  "REQUEST_BLOCK",
  "BRANDING",
  "RULES",
  "GAME",
  "BIRTHDAY",
  "SAFETY",
  "MANUAL_ONLY",
] as const;

const SCHEDULE_OPTIONS = [
  "NONE",
  "INTERVAL_MINUTES",
  "TOP_OF_HOUR_WINDOW",
  "ONCE_PER_SESSION",
  "MANUAL_ONLY",
] as const;

const PROFILE_OPTIONS = [
  "FAMILY",
  "ADULT",
  "BIRTHDAY",
  "SCHOOL",
  "PRIVATE_EVENT",
  "GENERAL",
] as const;

export default async function AdminInterstitialsPage({
  params,
}: {
  params: { location: string };
}) {
  const locationId = params.location;

  const assets = await prisma.interstitialAsset.findMany({
    where: { locationId },
    orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="rrAdminInterstitials">
      <div className="rrAdminInterstitials__shell">
        <header className="rrAdminTopbar rrAdminPanel">
          <div>
            <div className="rrEyebrow">REMIXREQUESTS • ADMIN</div>
            <h1 className="rrTitle">INTERSTITIAL CONTROL</h1>
            <p className="rrSub">
              Manage drops, intros, promos, and rule-driven inserts for{" "}
              <span className="rrAccentText">{locationId}</span>.
            </p>
          </div>

          <div className="rrAdminStatBoxes">
            <div className="rrAdminStatBox">
              <span>TOTAL</span>
              <strong>{assets.length}</strong>
            </div>
            <div className="rrAdminStatBox">
              <span>ACTIVE</span>
              <strong>{assets.filter((asset) => asset.active).length}</strong>
            </div>
            <div className="rrAdminStatBox">
              <span>INACTIVE</span>
              <strong>{assets.filter((asset) => !asset.active).length}</strong>
            </div>
          </div>
        </header>

        <section className="rrAdminPanel rrAdminPanel--form">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Create New Interstitial</div>
              <div className="rrPanelSub">
                Use the exact booth-local MP3 filename. The booth player will
                resolve it from its configured interstitial folder later.
              </div>
            </div>
            <span className="rrStatusPill rrStatusPill--gold">
              LOCAL FILE MODE
            </span>
          </div>

          <InterstitialAssetForm
            locationId={locationId}
            categoryOptions={[...CATEGORY_OPTIONS]}
            scheduleOptions={[...SCHEDULE_OPTIONS]}
            profileOptions={[...PROFILE_OPTIONS]}
          />
        </section>

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Existing Assets</div>
              <div className="rrPanelSub">
                Activate, edit, and organize backend-driven inserts. These stay
                outside the draggable song queue and materialize only when rules
                say they should.
              </div>
            </div>
            <span className="rrStatusPill rrStatusPill--cyan">
              {assets.length} ASSETS
            </span>
          </div>

          <InterstitialAssetsTable
            locationId={locationId}
            assets={assets}
            categoryOptions={[...CATEGORY_OPTIONS]}
            scheduleOptions={[...SCHEDULE_OPTIONS]}
            profileOptions={[...PROFILE_OPTIONS]}
          />
        </section>
      </div>

      <style>{`
        .rrAdminInterstitials {
          min-height: 100vh;
          padding: 10px;
          background:
            radial-gradient(circle at 10% 12%, rgba(0, 180, 214, 0.16), transparent 20%),
            radial-gradient(circle at 72% 18%, rgba(164, 50, 186, 0.14), transparent 22%),
            linear-gradient(90deg, #07111c 0%, #0a1625 52%, #120c1d 100%);
          color: #f2f5fb;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .rrAdminInterstitials__shell {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          gap: 10px;
        }

        .rrAdminPanel,
        .rrAdminTopbar {
          min-width: 0;
          border-radius: 6px;
          border: 1px solid rgba(77, 107, 143, 0.28);
          background: linear-gradient(
            180deg,
            rgba(21, 27, 41, 0.95),
            rgba(8, 13, 23, 0.94)
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.35),
            0 12px 26px rgba(0, 0, 0, 0.24);
          padding: 12px;
        }

        .rrAdminTopbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .rrEyebrow {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2.2px;
          opacity: 0.72;
        }

        .rrTitle {
          margin: 6px 0 5px;
          font-size: 30px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -1px;
        }

        .rrSub {
          color: rgba(235, 241, 255, 0.72);
          font-size: 12px;
          line-height: 1.45;
          max-width: 760px;
        }

        .rrAccentText {
          color: #f7fbff;
          font-weight: 800;
        }

        .rrAdminStatBoxes {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .rrAdminStatBox {
          min-width: 108px;
          padding: 10px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
            linear-gradient(180deg, rgba(19, 24, 37, 0.92), rgba(11, 16, 27, 0.92));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.28);
        }

        .rrAdminStatBox span {
          display: block;
          margin-bottom: 5px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.8px;
          opacity: 0.7;
        }

        .rrAdminStatBox strong {
          font-size: 13px;
          font-weight: 1000;
        }

        .rrPanelHead {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .rrPanelTitle {
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .rrPanelSub {
          margin-top: 3px;
          color: rgba(235, 241, 255, 0.72);
          font-size: 12px;
          line-height: 1.4;
          max-width: 860px;
        }

        .rrStatusPill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: #f2f5fb;
          white-space: nowrap;
        }

        .rrStatusPill--gold {
          border-color: rgba(230, 170, 52, 0.34);
        }

        .rrStatusPill--cyan {
          border-color: rgba(46, 193, 234, 0.36);
          box-shadow: 0 0 12px rgba(46, 193, 234, 0.14);
        }

        .rrControlLabel {
          display: block;
          margin-bottom: 6px;
          font-size: 10px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: rgba(224, 233, 248, 0.78);
        }

        .rrFieldHint {
          margin-top: 6px;
          color: rgba(199, 214, 239, 0.62);
          font-size: 11px;
          line-height: 1.35;
        }

        .rrSectionEyebrow {
          font-size: 10px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: 1.7px;
          text-transform: uppercase;
          color: rgba(230, 238, 251, 0.84);
        }

        .rrFormSection {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 5px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
            linear-gradient(180deg, rgba(18, 24, 38, 0.94), rgba(10, 15, 26, 0.94));
          padding: 10px;
        }

        .rrFormSectionHeader {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .rrFormSectionSub {
          margin-top: 3px;
          color: rgba(199, 214, 239, 0.66);
          font-size: 11px;
          line-height: 1.35;
        }

        .rrFormGrid {
          display: grid;
          gap: 10px;
        }

        .rrFormGrid--triple {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .rrFormGrid--double {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rrFormGrid--five {
          grid-template-columns: 1.2fr 0.9fr 0.9fr 0.7fr 0.7fr;
        }

        .gunmetalInput,
        .gunmetalSelect {
          width: 100%;
          min-height: 34px;
          padding: 0 11px;
          border-radius: 4px;
          border: 1px solid rgba(123, 156, 196, 0.32);
          background: linear-gradient(
            180deg,
            rgba(8, 16, 30, 0.94),
            rgba(7, 13, 24, 0.98)
          );
          color: #f4f7fd;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 0 0 1px rgba(12, 26, 48, 0.34);
        }

        .gunmetalInput::placeholder {
          color: rgba(197, 211, 235, 0.46);
          font-weight: 600;
        }

        .gunmetalInput:focus,
        .gunmetalSelect:focus {
          border-color: rgba(111, 167, 255, 0.54);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 0 0 1px rgba(71, 118, 210, 0.46),
            0 0 14px rgba(71, 118, 210, 0.16);
        }

        .gunmetalCheckboxRow {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          color: #eef4ff;
          font-size: 12px;
          font-weight: 800;
        }

        .gunmetalCheckbox {
          width: 16px;
          height: 16px;
          accent-color: #4ea1ff;
        }

        .gunmetalBtn {
          appearance: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          color: #f1f5fb;
          text-transform: none;
          background: linear-gradient(
            180deg,
            #4a5467 0%,
            #2d3441 52%,
            #232935 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -1px 0 rgba(0, 0, 0, 0.46),
            0 1px 2px rgba(0, 0, 0, 0.32);
        }

        .gunmetalBtn:hover {
          filter: brightness(1.06);
        }

        .gunmetalBtn--primary {
          background: linear-gradient(
            180deg,
            #3d7ec0 0%,
            #245694 52%,
            #1c4479 100%
          );
        }

        .gunmetalBtn--danger {
          background: linear-gradient(
            180deg,
            #8d4450 0%,
            #713341 52%,
            #5b2834 100%
          );
        }

        .gunmetalBtn--warn {
          background: linear-gradient(
            180deg,
            #8a6a1d 0%,
            #735515 52%,
            #5a430f 100%
          );
        }

        .rrAssetList {
          display: grid;
          gap: 8px;
        }

        .rrAssetCard {
          position: relative;
          border-radius: 5px;
          border: 1px solid rgba(255, 255, 255, 0.085);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
            linear-gradient(180deg, rgba(25, 31, 44, 0.92), rgba(14, 19, 31, 0.92));
          padding: 10px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.03),
            inset 0 -1px 0 rgba(0, 0, 0, 0.25);
        }

        .rrAssetCard--inactive {
          opacity: 0.84;
        }

        .rrAssetHeader {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: start;
        }

        .rrAssetTitleLine {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
          min-width: 0;
        }

        .rrAssetTitle {
          font-size: 15px;
          font-weight: 1000;
          line-height: 1.1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rrChip {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          white-space: nowrap;
        }

        .rrChip--active {
          border-color: rgba(46, 193, 234, 0.36);
          color: #d9f7ff;
        }

        .rrChip--inactive {
          border-color: rgba(255, 255, 255, 0.16);
          color: rgba(235, 241, 255, 0.72);
        }

        .rrChip--category {
          border-color: rgba(212, 104, 255, 0.28);
          color: #f1ddff;
        }

        .rrChip--schedule {
          border-color: rgba(230, 170, 52, 0.34);
          color: #ffe4aa;
        }

        .rrAssetSub {
          margin-top: 5px;
          color: rgba(213, 224, 244, 0.76);
          font-size: 12px;
          line-height: 1.35;
        }

        .rrAssetMetaGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          margin-top: 10px;
        }

        .rrAssetMetaCell {
          padding: 7px 9px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .rrAssetMetaCell:last-child {
          border-right: none;
        }

        .rrAssetMetaCell span {
          display: block;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          opacity: 0.66;
          margin-bottom: 4px;
        }

        .rrAssetMetaCell strong {
          display: block;
          font-size: 12px;
          font-weight: 1000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rrAssetProfiles {
          margin-top: 9px;
          color: rgba(216, 227, 246, 0.72);
          font-size: 11px;
          line-height: 1.4;
        }

        .rrAssetProfiles strong {
          color: rgba(245, 249, 255, 0.92);
        }

        .rrAssetActions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .rrEditWrap {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .rrEmptyBox {
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 12px;
          color: rgba(235, 241, 255, 0.7);
          background: rgba(255, 255, 255, 0.015);
          font-size: 12px;
        }

        @media (max-width: 1120px) {
          .rrPanelHead {
            grid-template-columns: 1fr;
          }

          .rrAdminStatBoxes,
          .rrAssetActions {
            justify-content: flex-start;
          }

          .rrFormGrid--triple,
          .rrFormGrid--double,
          .rrFormGrid--five,
          .rrAssetMetaGrid {
            grid-template-columns: 1fr 1fr;
          }

          .rrAssetMetaCell:nth-child(2n) {
            border-right: none;
          }
        }

        @media (max-width: 760px) {
          .rrTitle {
            font-size: 24px;
          }

          .rrAdminTopbar,
          .rrAssetHeader {
            grid-template-columns: 1fr;
          }

          .rrFormGrid--triple,
          .rrFormGrid--double,
          .rrFormGrid--five,
          .rrAssetMetaGrid {
            grid-template-columns: 1fr;
          }

          .rrAssetMetaCell {
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .rrAssetMetaCell:last-child {
            border-bottom: none;
          }
        }
      `}</style>
    </div>
  );
}
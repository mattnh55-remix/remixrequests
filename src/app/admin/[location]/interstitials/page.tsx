import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  deleteInterstitialSchedule,
  saveBoothNote,
  saveInterstitialSchedule,
  toggleInterstitialSchedule,
} from "./actions";
import { InterstitialAssetForm } from "@/components/admin/interstitials/interstitial-asset-form";
import { InterstitialAssetsTable } from "@/components/admin/interstitials/interstitial-assets-table";

const CATEGORY_OPTIONS = [
  "WELCOME_RULES",
  "REQUEST_DROP",
  "BLOCK_OF_SONGS",
  "REMIX_RADIO",
  "END_ANNOUNCE",
  "BRANDING",
  "RULES",
  "GAME",
  "BIRTHDAY",
  "SAFETY",
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

function niceCategory(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function AdminInterstitialsPage({
  params,
}: {
  params: { location: string };
}) {
  const locationSlug = params.location;

  const location = await prisma.location.findUnique({
    where: { slug: locationSlug },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!location) {
    notFound();
  }

  const locationId = location.id;

const [assets, scheduleWindows, boothNote] = await Promise.all([
    prisma.interstitialAsset.findMany({
      where: { locationId },
      orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.interstitialSchedule.findMany({
      where: { locationId },
      orderBy: [{ active: "desc" }, { startMinute: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.boothNote.findUnique({
      where: { locationId },
    }),
  ]);

  return (
    <div className="rrAdminInterstitials">
      <div className="rrAdminInterstitials__shell">
        <header className="rrAdminTopbar rrAdminPanel">
          <div>
            <div className="rrEyebrow">REMIXREQUESTS • ADMIN</div>
            <h1 className="rrTitle">INTERSTITIAL CONTROL</h1>
            <p className="rrSub">
              Reworked for session-driven category windows. Assets are now the
              selectable library, while schedule windows decide when a category
              is due for <span className="rrAccentText">{location.slug}</span>.
            </p>
          </div>

          <div className="rrAdminStatBoxes">
            <div className="rrAdminStatBox">
              <span>ASSETS</span>
              <strong>{assets.length}</strong>
            </div>
            <div className="rrAdminStatBox">
              <span>ACTIVE ASSETS</span>
              <strong>{assets.filter((asset) => asset.active).length}</strong>
            </div>
            <div className="rrAdminStatBox">
              <span>WINDOWS</span>
<strong>{scheduleWindows.length}</strong>
            </div>
            <div className="rrAdminStatBox">
              <span>ACTIVE WINDOWS</span>
<strong>{scheduleWindows.filter((schedule) => schedule.active).length}</strong>
            </div>
          </div>
        </header>

        <div className="rrAdminGrid2">
          <section className="rrAdminPanel rrAdminPanel--form">
            <div className="rrPanelHead">
              <div>
                <div className="rrPanelTitle">Create New Asset</div>
                <div className="rrPanelSub">
                  These are the bridge-playable choices DJs will see inside tabs
                  and timed modals.
                </div>
              </div>
              <span className="rrStatusPill rrStatusPill--gold">
                ASSET LIBRARY
              </span>
            </div>

            <InterstitialAssetForm
              locationId={locationId}
              categoryOptions={[...CATEGORY_OPTIONS]}
              profileOptions={[...PROFILE_OPTIONS]}
            />
          </section>

          <section className="rrAdminPanel rrAdminPanel--form">
            <div className="rrPanelHead">
              <div>
                <div className="rrPanelTitle">Create Session Window</div>
                <div className="rrPanelSub">
                  These windows drive the booth modal. When a session enters the
                  minute range below, the DJ will be prompted to choose one asset
                  from that category.
                </div>
              </div>
              <span className="rrStatusPill rrStatusPill--cyan">
                TIMING ENGINE
              </span>
            </div>

            <form action={saveInterstitialSchedule} className="rrFormGrid">
              <input type="hidden" name="locationId" value={locationId} />

              <div className="rrFormGrid rrFormGrid--triple">
                <div>
                  <label className="rrControlLabel" htmlFor="window-category">
                    Category
                  </label>
                  <select
                    id="window-category"
                    name="category"
                    defaultValue={CATEGORY_OPTIONS[0]}
                    className="gunmetalSelect"
                    required
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {niceCategory(option)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="rrControlLabel" htmlFor="window-label">
                    Window Label
                  </label>
                  <input
                    id="window-label"
                    name="label"
                    className="gunmetalInput"
                    placeholder="Opening rules block"
                  />
                </div>

                <div>
                  <label className="rrControlLabel" htmlFor="window-title">
                    Prompt Title
                  </label>
                  <input
                    id="window-title"
                    name="promptTitle"
                    className="gunmetalInput"
                    placeholder="Time to play Welcome & Rules"
                  />
                </div>
              </div>

              <div>
                <label className="rrControlLabel" htmlFor="window-body">
                  Prompt Body
                </label>
                <input
                  id="window-body"
                  name="promptBody"
                  className="gunmetalInput"
                  placeholder="Choose one to fire through the bridge."
                />
              </div>

              <div className="rrFormGrid rrFormGrid--five">
                <div>
                  <label className="rrControlLabel" htmlFor="window-start">
                    Start Min
                  </label>
                  <input
                    id="window-start"
                    type="number"
                    name="startMinute"
                    defaultValue={0}
                    min={0}
                    className="gunmetalInput"
                    required
                  />
                </div>

                <div>
                  <label className="rrControlLabel" htmlFor="window-end">
                    End Min
                  </label>
                  <input
                    id="window-end"
                    type="number"
                    name="endMinute"
                    defaultValue={10}
                    min={0}
                    className="gunmetalInput"
                    required
                  />
                </div>

                <div>
                  <label className="rrControlLabel" htmlFor="window-sort">
                    Sort Order
                  </label>
                  <input
                    id="window-sort"
                    type="number"
                    name="sortOrder"
                    defaultValue={0}
                    className="gunmetalInput"
                  />
                </div>

                <div>
                  <label className="rrControlLabel" htmlFor="window-cooldown">
                    Cooldown Min
                  </label>
                  <input
                    id="window-cooldown"
                    type="number"
                    name="cooldownMinutes"
                    className="gunmetalInput"
                    placeholder="Optional"
                    min={0}
                  />
                </div>

                <div className="rrFormGrid" style={{ gap: 8 }}>
                  <label className="gunmetalCheckboxRow">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked
                      className="gunmetalCheckbox"
                    />
                    Active
                  </label>

                  <label className="gunmetalCheckboxRow">
                    <input
                      type="checkbox"
                      name="required"
                      defaultChecked
                      className="gunmetalCheckbox"
                    />
                    Required
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
                  Save Window
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Booth Notes</div>
              <div className="rrPanelSub">
                Shared note space for DJs. This matches the simple save-on-edit
                note box planned for the booth surface.
              </div>
            </div>
            <span className="rrStatusPill">SHARED</span>
          </div>

          <form action={saveBoothNote} className="rrFormGrid">
            <input type="hidden" name="locationId" value={locationId} />
            <textarea
              name="body"
              defaultValue={boothNote?.body ?? ""}
              className="gunmetalInput"
              rows={5}
              placeholder="Leave notes for the next DJ here."
              style={{ minHeight: 120, paddingTop: 12, resize: "vertical" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
                Save Notes
              </button>
            </div>
          </form>
        </section>

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Existing Windows</div>
              <div className="rrPanelSub">
                Windows decide the required category; assets are just the
                selectable choices inside that category.
              </div>
            </div>
            <span className="rrStatusPill rrStatusPill--cyan">
{scheduleWindows.length} WINDOWS
            </span>
          </div>

{!scheduleWindows.length ? (
  <div className="rrEmptyBox">No schedule windows yet.</div>
) : (
  <div className="rrAssetList">
    {scheduleWindows.map((schedule) => (
<div key={schedule.id} className="rrAssetCard">
                  <div className="rrAssetHeader">
                    <div>
                      <div className="rrAssetTitleLine">
<div className="rrAssetTitle">
  {schedule.label?.trim() || niceCategory(schedule.category)}
</div>

                        <span
                          className={`rrChip ${
                            schedule.active ? "rrChip--active" : "rrChip--inactive"
                          }`}
                        >
                          {schedule.active ? "ACTIVE" : "INACTIVE"}
                        </span>

                        <span className="rrChip rrChip--category">
                          {niceCategory(schedule.category)}
                        </span>

                        {schedule.required ? (
                          <span className="rrChip rrChip--schedule">
                            REQUIRED
                          </span>
                        ) : null}
                      </div>

                      <div className="rrAssetSub">
                        {schedule.promptTitle?.trim() || "No prompt title"}
                      </div>
                    </div>

                    <div className="rrAssetActions">
                      <form action={toggleInterstitialSchedule}>
                        <input type="hidden" name="id" value={schedule.id} />
                        <input type="hidden" name="locationId" value={locationId} />
                        <input
                          type="hidden"
                          name="nextActive"
                          value={schedule.active ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="gunmetalBtn gunmetalBtn--warn"
                        >
                          {schedule.active ? "Deactivate" : "Activate"}
                        </button>
                      </form>

<form action={deleteInterstitialSchedule}>
  <input type="hidden" name="id" value={schedule.id} />
  <input type="hidden" name="locationId" value={locationId} />
  <button
    type="submit"
    className="gunmetalBtn gunmetalBtn--danger"
  >
    Delete
  </button>
</form>
                    </div>
                  </div>

                  <div className="rrAssetMetaGrid">
                    <div className="rrAssetMetaCell">
                      <span>Start</span>
                      <strong>{schedule.startMinute} min</strong>
                    </div>
                    <div className="rrAssetMetaCell">
                      <span>End</span>
                      <strong>{schedule.endMinute} min</strong>
                    </div>
                    <div className="rrAssetMetaCell">
                      <span>Sort</span>
                      <strong>{schedule.sortOrder}</strong>
                    </div>
                    <div className="rrAssetMetaCell">
                      <span>Cooldown</span>
                      <strong>
                        {schedule.cooldownMinutes != null
                          ? `${schedule.cooldownMinutes} min`
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  {schedule.promptBody?.trim() ? (
                    <div className="rrAssetProfiles" style={{ marginTop: 8 }}>
                      <strong>Prompt:</strong> {schedule.promptBody}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Existing Assets</div>
              <div className="rrPanelSub">
                These are the selectable interstitial choices available inside a
                category.
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

        .rrAdminGrid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
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
          grid-template-columns: 0.9fr 0.9fr 0.9fr 1fr 1.2fr;
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
          background: linear-gradient(
            180deg,
            #4a5467 0%,
            #2d3441 52%,
            #232935 100%
          );
        }

        .gunmetalBtn--primary {
          background: linear-gradient(
            180deg,
            #3d7ec0 0%,
            #245694 52%,
            #1c4479 100%
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

        .gunmetalBtn--danger {
          background: linear-gradient(
            180deg,
            #8d4450 0%,
            #713341 52%,
            #5b2834 100%
          );
        }

        .rrAssetList {
          display: grid;
          gap: 8px;
        }

        .rrAssetCard {
          border-radius: 5px;
          border: 1px solid rgba(255, 255, 255, 0.085);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
            linear-gradient(180deg, rgba(25, 31, 44, 0.92), rgba(14, 19, 31, 0.92));
          padding: 10px;
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

        .rrEmptyBox {
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 12px;
          color: rgba(235, 241, 255, 0.7);
          background: rgba(255, 255, 255, 0.015);
          font-size: 12px;
        }

        @media (max-width: 1120px) {
          .rrAdminGrid2 {
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
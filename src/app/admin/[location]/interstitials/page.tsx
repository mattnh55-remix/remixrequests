import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveBoothNote } from "./actions";
import { InterstitialAssetForm } from "@/components/admin/interstitials/interstitial-asset-form";
import { InterstitialAssetsTable } from "@/components/admin/interstitials/interstitial-assets-table";
import { InterstitialScheduleForm } from "@/components/admin/interstitials/interstitial-schedule-form";
import { InterstitialSchedulesTable } from "@/components/admin/interstitials/interstitial-schedules-table";

const CATEGORY_OPTIONS = [
  "ANNOUNCEMENTS",
  "SONG_INTROS",
  "GAMES_DANCES",
  "REMIX_PROMOS",
] as const;

function AlertBanner({
  tone = "info",
  title,
  message,
}: {
  tone?: "success" | "error" | "info";
  title: string;
  message?: string | null;
}) {
  return (
    <div className={`rrInlineAlert rrInlineAlert--${tone}`}>
      <div className="rrInlineAlert__title">{title}</div>
      {message ? <div className="rrInlineAlert__body">{message}</div> : null}
    </div>
  );
}

export default async function AdminInterstitialsPage({
  params,
  searchParams,
}: {
  params: { location: string };
  searchParams?: {
    editSchedule?: string;
    scheduleStatus?: string;
    scheduleMessage?: string;
    assetStatus?: string;
    assetMessage?: string;
    noteStatus?: string;
    noteMessage?: string;
  };
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
  const editingScheduleId = searchParams?.editSchedule?.trim() || null;

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

  const editingSchedule =
    editingScheduleId != null
      ? scheduleWindows.find((schedule) => schedule.id === editingScheduleId) ?? null
      : null;

  const isEditingMissing = !!editingScheduleId && !editingSchedule;

  return (
    <div className="rrAdminInterstitials">
      <div className="rrAdminInterstitials__shell">
        <header className="rrAdminTopbar rrAdminPanel">
          <div>
            <div className="rrEyebrow">REMIXREQUESTS • ADMIN</div>
            <h1 className="rrTitle">INTERSTITIAL CONTROL</h1>
            <p className="rrSub">
              Category system is now simplified into four live booth buckets:
              announcements, song intros, games & dances, and Remix promos for{" "}
              <span className="rrAccentText">{location.slug}</span>.
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

        <nav className="rrAdminNav rrAdminPanel" aria-label="Admin sections">
          <a href={`/admin/${location.slug}`} className="rrAdminNav__link">
            Dashboard
          </a>
          <a href={`/admin/${location.slug}?tab=songs`} className="rrAdminNav__link">
            Songs
          </a>
          <a href={`/admin/${location.slug}?tab=requestSettings`} className="rrAdminNav__link">
            Request Settings
          </a>
          <a href={`/admin/${location.slug}?tab=top10`} className="rrAdminNav__link">
            Top 10
          </a>
          <a href={`/admin/${location.slug}?tab=users`} className="rrAdminNav__link">
            Users & Points
          </a>
          <a href={`/admin/${location.slug}?tab=shoutoutSettings`} className="rrAdminNav__link">
            Shoutout Settings
          </a>
          <a href={`/booth/${location.slug}`} className="rrAdminNav__link">
            DJ Booth
          </a>
          <a
            href={`/admin/${location.slug}/interstitials`}
            className="rrAdminNav__link rrAdminNav__link--active"
            aria-current="page"
          >
            Interstitials
          </a>
        </nav>


        {searchParams?.scheduleStatus === "saved" ? (
          <AlertBanner
            tone="success"
            title="Schedule saved"
            message={searchParams?.scheduleMessage ?? "Window saved successfully."}
          />
        ) : null}

        {searchParams?.scheduleStatus === "error" ? (
          <AlertBanner
            tone="error"
            title="Schedule not saved"
            message={
              searchParams?.scheduleMessage ??
              "There was a problem saving this schedule window."
            }
          />
        ) : null}

        {searchParams?.assetStatus === "saved" ? (
          <AlertBanner
            tone="success"
            title="Asset updated"
            message={searchParams?.assetMessage ?? "Asset change saved."}
          />
        ) : null}

        {searchParams?.noteStatus === "saved" ? (
          <AlertBanner
            tone="success"
            title="Booth notes saved"
            message={searchParams?.noteMessage ?? "Shared booth note updated."}
          />
        ) : null}

        {isEditingMissing ? (
          <AlertBanner
            tone="error"
            title="Edit target not found"
            message="That schedule window no longer exists. Showing create mode instead."
          />
        ) : null}

        <div className="rrAdminGrid2">
          <section className="rrAdminPanel rrAdminPanel--form">
            <div className="rrPanelHead">
              <div>
                <div className="rrPanelTitle">Create New Asset</div>
                <div className="rrPanelSub">
                  These are the booth-playable choices DJs will see inside the
                  folder tabs and the timed prompt modal.
                </div>
              </div>
              <span className="rrStatusPill rrStatusPill--gold">
                ASSET LIBRARY
              </span>
            </div>

            <InterstitialAssetForm
              locationId={locationId}
              categoryOptions={[...CATEGORY_OPTIONS]}
            />
          </section>

          <section className="rrAdminPanel rrAdminPanel--form">
            <div className="rrPanelHead">
              <div>
                <div className="rrPanelTitle">
                  {editingSchedule ? "Edit Session Window" : "Create Session Window"}
                </div>
                <div className="rrPanelSub">
                  These windows decide when the booth should prompt the DJ to
                  choose one interstitial from the matching category.
                </div>
              </div>

              <span className="rrStatusPill rrStatusPill--cyan">
                {editingSchedule ? "EDIT WINDOW" : "TIMING ENGINE"}
              </span>
            </div>

            <InterstitialScheduleForm
              locationId={locationId}
              locationSlug={location.slug}
              categoryOptions={[...CATEGORY_OPTIONS]}
              initialValues={editingSchedule ?? undefined}
              submitLabel={editingSchedule ? "Update Window" : "Save Window"}
              mode={editingSchedule ? "edit" : "create"}
            />
          </section>
        </div>

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Booth Visuals</div>
              <div className="rrPanelSub">
                This is where the shared booth-level “now playing” interstitial
                overlay GIF should be assigned next. It is not wired yet in the
                current pack, but this is the right home for it.
              </div>
            </div>
            <span className="rrStatusPill">NEXT</span>
          </div>

          <div className="rrEmptyBox">
            Planned field: <strong>Now Playing Overlay GIF URL</strong>
            <br />
            This should be one shared location-level visual used whenever any
            interstitial is actively playing in the booth.
          </div>
        </section>

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
                Windows now resolve into just four booth-facing categories for a
                tighter tab experience and faster DJ decision-making.
              </div>
            </div>
            <span className="rrStatusPill rrStatusPill--cyan">
              {scheduleWindows.length} WINDOWS
            </span>
          </div>

          <InterstitialSchedulesTable
            locationId={locationId}
            locationSlug={location.slug}
            schedules={scheduleWindows}
            editingScheduleId={editingScheduleId}
          />
        </section>

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Existing Assets</div>
              <div className="rrPanelSub">
                These are the selectable interstitial choices available inside a
                booth category.
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


        .rrAdminNav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          padding-top: 10px;
          padding-bottom: 10px;
        }

        .rrAdminNav__link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(118, 150, 194, 0.28);
          background:
            linear-gradient(180deg, rgba(29, 40, 60, 0.94), rgba(14, 20, 33, 0.96));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 8px 18px rgba(0, 0, 0, 0.18);
          color: #f2f6ff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.2px;
          white-space: nowrap;
          transition: border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
        }

        .rrAdminNav__link:hover {
          border-color: rgba(140, 178, 230, 0.44);
          transform: translateY(-1px);
        }

        .rrAdminNav__link--active {
          border-color: rgba(88, 170, 255, 0.58);
          background:
            linear-gradient(180deg, rgba(74, 134, 214, 0.95), rgba(37, 79, 143, 0.98));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 0 0 1px rgba(84, 157, 255, 0.18),
            0 10px 22px rgba(20, 49, 92, 0.36);
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

        .rrInlineAlert {
          border-radius: 6px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .rrInlineAlert--success {
          border-color: rgba(70, 205, 145, 0.35);
          background: linear-gradient(
            180deg,
            rgba(52, 135, 99, 0.20),
            rgba(20, 35, 29, 0.42)
          );
        }

        .rrInlineAlert--error {
          border-color: rgba(224, 99, 116, 0.34);
          background: linear-gradient(
            180deg,
            rgba(110, 31, 46, 0.26),
            rgba(35, 17, 22, 0.45)
          );
        }

        .rrInlineAlert--info {
          border-color: rgba(89, 165, 255, 0.30);
          background: linear-gradient(
            180deg,
            rgba(27, 65, 112, 0.24),
            rgba(16, 22, 35, 0.42)
          );
        }

        .rrInlineAlert__title {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .rrInlineAlert__body {
          font-size: 12px;
          color: rgba(235, 241, 255, 0.82);
          line-height: 1.45;
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

        .gunmetalBtn,
        .gunmetalBtn--ghostLink {
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
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
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

        .gunmetalBtn--ghostLink {
          background: linear-gradient(
            180deg,
            #5e687b 0%,
            #353d4c 52%,
            #28303d 100%
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

        .rrAssetCard--editing {
          border-color: rgba(77, 186, 255, 0.42);
          box-shadow: 0 0 0 1px rgba(77, 186, 255, 0.14);
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
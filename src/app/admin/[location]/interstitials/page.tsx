import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  archiveInterstitialLogs,
  restoreArchivedInterstitialLogs,
  saveBoothNote,
} from "./actions";
import { InterstitialAssetForm } from "@/components/admin/interstitials/interstitial-asset-form";
import { InterstitialAssetsTable } from "@/components/admin/interstitials/interstitial-assets-table";
import { InterstitialScheduleForm } from "@/components/admin/interstitials/interstitial-schedule-form";
import { InterstitialSchedulesTable } from "@/components/admin/interstitials/interstitial-schedules-table";
import type {
  InterstitialCategory,
  InterstitialEventStatus,
} from "@prisma/client";

const CATEGORY_OPTIONS = [
  "ANNOUNCEMENTS",
  "SONG_INTROS",
  "GAMES_DANCES",
  "REMIX_PROMOS",
] as const;

const STATUS_OPTIONS = ["PLAYED", "SKIPPED", "CANCELED", "PLANNED"] as const;

function isCategory(value?: string | null): value is InterstitialCategory {
  if (!value) return false;

  return (
    value === "ANNOUNCEMENTS" ||
    value === "SONG_INTROS" ||
    value === "GAMES_DANCES" ||
    value === "REMIX_PROMOS"
  );
}

function isStatus(value?: string | null): value is InterstitialEventStatus {
  return !!value && STATUS_OPTIONS.includes(value as InterstitialEventStatus);
}

function categoryLabel(value?: string | null) {
  switch (value) {
    case "ANNOUNCEMENTS":
      return "Announcements";
    case "SONG_INTROS":
      return "Song Intros";
    case "GAMES_DANCES":
      return "Games & Dances";
    case "REMIX_PROMOS":
      return "Remix Promos";
    default:
      return value || "—";
  }
}

function eventTime(event: {
  skippedAt?: Date | null;
  playedAt?: Date | null;
  canceledAt?: Date | null;
  plannedAt?: Date | null;
}) {
  return event.skippedAt ?? event.playedAt ?? event.canceledAt ?? event.plannedAt ?? null;
}

function formatVenueDateTime(value: Date | null, timeZone: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function formatVenueTime(value: Date | null, timeZone: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rrAdminStatBox">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GuideCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rrGuideCard">
      <div className="rrGuideStep">{step}</div>
      <div className="rrGuideTitle">{title}</div>
      <div className="rrGuideBody">{body}</div>
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
    logStatus?: string;
    logMessage?: string;
    status?: string;
    category?: string;
    showArchived?: string;
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
  const selectedStatus = isStatus(searchParams?.status) ? searchParams?.status : "";
  const selectedCategory = isCategory(searchParams?.category) ? searchParams?.category : "";
  const showArchived = searchParams?.showArchived === "1";

  const activeLogsWhere: any = {
    locationId,
    archivedAt: null,
  };

  if (selectedStatus) activeLogsWhere.status = selectedStatus;
  if (selectedCategory) activeLogsWhere.category = selectedCategory;

  const [assets, scheduleWindows, boothNote, rules, recentEvents, archivedEvents] =
    await Promise.all([
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
      prisma.ruleset.findUnique({
        where: { locationId },
        select: { top10Timezone: true },
      }),
      prisma.interstitialEvent.findMany({
        where: activeLogsWhere,
        orderBy: [
          { skippedAt: "desc" },
          { playedAt: "desc" },
          { plannedAt: "desc" },
          { canceledAt: "desc" },
        ],
        take: 200,
      }),
      showArchived
        ? prisma.interstitialEvent.findMany({
            where: {
              locationId,
              archivedAt: { not: null },
            },
            orderBy: [
              { archivedAt: "desc" },
              { skippedAt: "desc" },
              { playedAt: "desc" },
              { plannedAt: "desc" },
            ],
            take: 200,
          })
        : Promise.resolve([]),
    ]);

  const editingSchedule =
    editingScheduleId != null
      ? scheduleWindows.find((schedule) => schedule.id === editingScheduleId) ?? null
      : null;

  const isEditingMissing = !!editingScheduleId && !editingSchedule;
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const scheduleById = new Map(scheduleWindows.map((schedule) => [schedule.id, schedule]));
  const venueTimeZone = rules?.top10Timezone || "America/New_York";

  return (
    <div className="rrAdminInterstitials">
      <div className="rrAdminInterstitials__shell">
        <header className="rrHero rrAdminPanel">
          <div>
            <div className="rrEyebrow">REMIXREQUESTS • ADMIN • INTERSTITIAL STUDIO</div>
            <h1 className="rrTitle">Program the booth without the clutter.</h1>
            <p className="rrSub">
              Build booth-playable assets, program timed windows, and keep operator tools
              available without crowding the main workflow.
            </p>

            <div className="rrHeroCallout">
              <div className="rrHeroCallout__title">Best workflow</div>
              <div className="rrHeroCallout__body">
                Treat this page like a studio. Assets are the content layer. Windows are the
                timing layer. Notes, visuals, and logs support the booth without competing with
                the main setup experience.
              </div>
            </div>
          </div>

          <div className="rrHeroStats">
            <StatCard label="Assets" value={assets.length} />
            <StatCard label="Active Assets" value={assets.filter((asset) => asset.active).length} />
            <StatCard label="Manual Only" value={assets.filter((asset) => asset.manualOnly).length} />
            <StatCard label="Windows" value={scheduleWindows.length} />
            <StatCard
              label="Active Windows"
              value={scheduleWindows.filter((schedule) => schedule.active).length}
            />
            <StatCard
              label="Required Windows"
              value={scheduleWindows.filter((schedule) => schedule.required).length}
            />
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

        {searchParams?.logStatus === "saved" ? (
          <AlertBanner
            tone="success"
            title="Log update complete"
            message={searchParams?.logMessage ?? "Interstitial logs updated."}
          />
        ) : null}

        {isEditingMissing ? (
          <AlertBanner
            tone="error"
            title="Edit target not found"
            message="That schedule window no longer exists. Showing create mode instead."
          />
        ) : null}

        <section className="rrGuideGrid">
          <GuideCard
            step="01"
            title="Build assets"
            body="Create the booth-playable files here first: intros, promos, games, and announcements."
          />
          <GuideCard
            step="02"
            title="Program windows"
            body="Set the timing layer here: minute range, sort order, cooldown, and required behavior."
          />
          <GuideCard
            step="03"
            title="Support operators"
            body="Keep notes, logs, and visual settings present but secondary so the core workflow stays clean."
          />
        </section>

        <section className="rrStudioGrid">
          <div className="rrStudioMain">
            <section className="rrAdminPanel rrAdminPanel--form">
              <div className="rrPanelHead">
                <div>
                  <div className="rrKicker">Content layer</div>
                  <div className="rrPanelTitle">Asset Library Builder</div>
                  <div className="rrPanelSub">
                    Create the actual booth-playable interstitial choices DJs can use in the live pad
                    and timed prompt flow.
                  </div>
                </div>
                <span className="rrStatusPill rrStatusPill--cyan">ASSET LIBRARY</span>
              </div>

              <InterstitialAssetForm
                locationId={locationId}
                categoryOptions={[...CATEGORY_OPTIONS]}
              />
            </section>

            <section className="rrAdminPanel rrAdminPanel--form">
              <div className="rrPanelHead">
                <div>
                  <div className="rrKicker">Timing layer</div>
                  <div className="rrPanelTitle">
                    {editingSchedule ? "Edit Session Window" : "Program Session Window"}
                  </div>
                  <div className="rrPanelSub">
                    Set the timing brain of the system here. When eligible asset assignment is fully
                    wired, it should live inside this form below the timing and prompt fields.
                  </div>
                </div>

                <span className="rrStatusPill rrStatusPill--gold">
                  {editingSchedule ? "EDIT WINDOW" : "TIMING ENGINE"}
                </span>
              </div>

<InterstitialScheduleForm
  locationId={locationId}
  locationSlug={location.slug}
  categoryOptions={[...CATEGORY_OPTIONS]}
  assets={assets}
  initialValues={editingSchedule ?? undefined}
  submitLabel={editingSchedule ? "Update Window" : "Save Window"}
  mode={editingSchedule ? "edit" : "create"}
/>
            </section>
          </div>

          <aside className="rrStudioSide">
            <section className="rrAdminPanel">
              <div className="rrPanelHead">
                <div>
                  <div className="rrKicker">Operator layer</div>
                  <div className="rrPanelTitle">Booth Notes</div>
                  <div className="rrPanelSub">
                    Keep this compact and visible for DJs without letting it interrupt the main build flow.
                  </div>
                </div>
                <span className="rrStatusPill">SHARED</span>
              </div>

              <form action={saveBoothNote} className="rrFormGrid">
                <input type="hidden" name="locationId" value={locationId} />
                <textarea
                  name="body"
                  defaultValue={boothNote?.body ?? ""}
                  className="gunmetalInput rrNotesArea"
                  rows={7}
                  placeholder="Leave notes for the next DJ here."
                />
                <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
                  Save Notes
                </button>
              </form>
            </section>

            <section className="rrAdminPanel">
              <div className="rrPanelHead">
                <div>
                  <div className="rrKicker">Visual layer</div>
                  <div className="rrPanelTitle">Booth Visuals</div>
                  <div className="rrPanelSub">
                    Future shared interstitial visuals belong here as a support tool, not as a primary builder.
                  </div>
                </div>
                <span className="rrStatusPill">NEXT</span>
              </div>

              <div className="rrEmptyBox">
                Planned field: <strong>Now Playing Overlay GIF URL</strong>
                <br />
                One shared location-level visual used whenever any interstitial is actively playing in the booth.
              </div>
            </section>

            <section className="rrAdminPanel">
              <div className="rrPanelHead">
                <div>
                  <div className="rrKicker">Recommendation</div>
                  <div className="rrPanelTitle">Next window form order</div>
                  <div className="rrPanelSub">
                    When you wire explicit eligible-asset assignment, the clean form order should be:
                  </div>
                </div>
              </div>

              <div className="rrEmptyBox">
                <strong>Category → Timing → Prompt copy → Eligible assets → Active / Required → Save</strong>
              </div>
            </section>
          </aside>
        </section>

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrKicker">Programming overview</div>
              <div className="rrPanelTitle">Existing Windows</div>
              <div className="rrPanelSub">
                Keep this directly under the window builder so save-and-review feels fast and natural.
              </div>
            </div>
            <span className="rrStatusPill rrStatusPill--gold">
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
              <div className="rrKicker">Content inventory</div>
              <div className="rrPanelTitle">Existing Assets</div>
              <div className="rrPanelSub">
                Keep the asset inventory right after windows so it is easy to bounce between what can
                play and when it should be prompted.
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

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrKicker">Operations</div>
              <div className="rrPanelTitle">Interstitial Logs</div>
              <div className="rrPanelSub">
                Logs are still important, but they belong lower on the page as a review and troubleshooting tool.
              </div>
            </div>
            <span className="rrStatusPill">{recentEvents.length} ACTIVE</span>
          </div>

          <div className="rrPanelSub" style={{ marginBottom: 10 }}>
            Venue time zone: <strong>{venueTimeZone}</strong>
          </div>

          <form method="GET" className="rrLogToolbar">
            <select
              name="status"
              defaultValue={selectedStatus}
              className="gunmetalSelect"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              name="category"
              defaultValue={selectedCategory}
              className="gunmetalSelect"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>

            {showArchived ? <input type="hidden" name="showArchived" value="1" /> : null}

            <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
              Apply Filters
            </button>

            <a
              href={
                showArchived
                  ? `/admin/${location.slug}/interstitials`
                  : `/admin/${location.slug}/interstitials?showArchived=1`
              }
              className="gunmetalBtn gunmetalBtn--ghostLink"
            >
              {showArchived ? "Hide Archive" : "Owner Archive"}
            </a>
          </form>

          <div className="rrToolbarActions">
            <form action={archiveInterstitialLogs}>
              <input type="hidden" name="locationId" value={locationId} />
              <input type="hidden" name="status" value={selectedStatus} />
              <input type="hidden" name="category" value={selectedCategory} />
              <input type="hidden" name="showArchived" value={showArchived ? "1" : "0"} />
              <button type="submit" className="gunmetalBtn gunmetalBtn--warn">
                Clear Visible Logs
              </button>
            </form>

            {showArchived ? (
              <form action={restoreArchivedInterstitialLogs}>
                <input type="hidden" name="locationId" value={locationId} />
                <button type="submit" className="gunmetalBtn">
                  Restore Archived Logs
                </button>
              </form>
            ) : null}
          </div>

          {recentEvents.length === 0 ? (
            <div className="rrEmptyBox">No interstitial activity yet.</div>
          ) : (
            <div className="rrTable">
              <div className="rrTableHead">
                <div>Time</div>
                <div>Category</div>
                <div>Status</div>
                <div>Asset</div>
                <div>Reason</div>
              </div>

              {recentEvents.map((event) => {
                const at = eventTime(event);
                const asset = event.assetId ? assetById.get(event.assetId) : null;
                const schedule = event.scheduleId ? scheduleById.get(event.scheduleId) : null;
                const category =
                  event.category ?? asset?.category ?? schedule?.category ?? null;

                const eventTitle =
                  asset?.name ||
                  schedule?.label ||
                  event.assetId ||
                  event.scheduleId ||
                  "—";

                return (
                  <div
                    key={event.id}
                    className={`rrTableRow ${
                      event.status === "SKIPPED"
                        ? "rrTableRow--skipped"
                        : event.status === "PLAYED"
                        ? "rrTableRow--played"
                        : "rrTableRow--neutral"
                    }`}
                  >
                    <div>{formatVenueTime(at, venueTimeZone)}</div>
                    <div>{categoryLabel(category)}</div>
                    <div>
                      <span
                        className={`rrChip ${
                          event.status === "PLAYED"
                            ? "rrChip--played"
                            : event.status === "SKIPPED"
                            ? "rrChip--skipped"
                            : event.status === "CANCELED"
                            ? "rrChip--canceled"
                            : ""
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <div>{eventTitle}</div>
                    <div>{event.status === "SKIPPED" ? event.operatorNote || "—" : "—"}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {showArchived ? (
          <section className="rrAdminPanel">
            <div className="rrPanelHead">
              <div>
                <div className="rrKicker">Owner review</div>
                <div className="rrPanelTitle">Archived Interstitial Logs</div>
                <div className="rrPanelSub">
                  Quiet archive for owner review. These entries were cleared from the visible working log.
                </div>
              </div>
              <span className="rrStatusPill">{archivedEvents.length} ARCHIVED</span>
            </div>

            {archivedEvents.length === 0 ? (
              <div className="rrEmptyBox">No archived logs yet.</div>
            ) : (
              <div className="rrArchiveList">
                {archivedEvents.map((event) => {
                  const at = eventTime(event);
                  const asset = event.assetId ? assetById.get(event.assetId) : null;
                  const schedule = event.scheduleId ? scheduleById.get(event.scheduleId) : null;
                  const category =
                    event.category ?? asset?.category ?? schedule?.category ?? null;

                  return (
                    <div key={event.id} className="rrArchiveRow">
                      <div className="rrArchiveTopLine">
                        <div className="rrEventTitle">
                          {asset?.name || schedule?.label || event.assetId || event.scheduleId || "—"}
                        </div>
                        <span className="rrChip">{event.status}</span>
                        <span className="rrChip rrChip--category">
                          {categoryLabel(category)}
                        </span>
                      </div>

                      <div className="rrEventMeta">
                        <span>
                          <strong>Event time:</strong> {formatVenueDateTime(at, venueTimeZone)}
                        </span>
                        <span>
                          <strong>Archived:</strong> {formatVenueDateTime(event.archivedAt ?? null, venueTimeZone)}
                        </span>
                        <span>
                          <strong>Prompt minute:</strong> {event.promptMinute ?? "—"}
                        </span>
                        <span>
                          <strong>Session:</strong> {event.sessionId ? event.sessionId.slice(-8) : "—"}
                        </span>
                      </div>

                      {event.operatorNote ? (
                        <div className="rrEventNote">
                          <strong>Operator note:</strong> {event.operatorNote}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <style>{`
        .rrAdminInterstitials {
          min-height: 100vh;
          padding: 14px;
          background:
            radial-gradient(circle at 8% 12%, rgba(0, 180, 214, 0.16), transparent 22%),
            radial-gradient(circle at 82% 16%, rgba(179, 76, 240, 0.12), transparent 24%),
            linear-gradient(135deg, #06101b 0%, #091526 48%, #120c1d 100%);
          color: #f2f5fb;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .rrAdminInterstitials__shell {
          max-width: 1480px;
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .rrAdminPanel,
        .rrHero {
          min-width: 0;
          border-radius: 14px;
          border: 1px solid rgba(77, 107, 143, 0.24);
          background: linear-gradient(
            180deg,
            rgba(20, 27, 42, 0.96),
            rgba(7, 12, 22, 0.95)
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.35),
            0 18px 40px rgba(0, 0, 0, 0.28);
          padding: 16px;
        }

        .rrHero {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 18px;
          align-items: start;
        }

        .rrEyebrow {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2.4px;
          opacity: 0.72;
        }

        .rrTitle {
          margin: 8px 0;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 0.96;
          font-weight: 1000;
          letter-spacing: -1.4px;
          max-width: 780px;
        }

        .rrSub {
          color: rgba(235, 241, 255, 0.74);
          font-size: 13px;
          line-height: 1.55;
          max-width: 840px;
        }

        .rrHeroCallout {
          margin-top: 14px;
          max-width: 640px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(88, 170, 255, 0.22);
          background: linear-gradient(
            180deg,
            rgba(21, 46, 82, 0.32),
            rgba(12, 19, 33, 0.52)
          );
        }

        .rrHeroCallout__title {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 1.1px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .rrHeroCallout__body {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(236, 242, 255, 0.82);
        }

        .rrHeroStats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .rrAdminStatBox {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
            linear-gradient(180deg, rgba(19, 24, 37, 0.92), rgba(11, 16, 27, 0.92));
        }

        .rrAdminStatBox span {
          display: block;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.7px;
          opacity: 0.72;
          text-transform: uppercase;
        }

        .rrAdminStatBox strong {
          font-size: 18px;
          font-weight: 1000;
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
          min-height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(118, 150, 194, 0.26);
          background:
            linear-gradient(180deg, rgba(29, 40, 60, 0.94), rgba(14, 20, 33, 0.96));
          color: #f2f6ff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
        }

        .rrAdminNav__link--active {
          border-color: rgba(88, 170, 255, 0.54);
          background:
            linear-gradient(180deg, rgba(74, 134, 214, 0.95), rgba(37, 79, 143, 0.98));
        }

        .rrInlineAlert {
          border-radius: 12px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
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

        .rrInlineAlert__title {
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.7px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .rrInlineAlert__body {
          font-size: 12px;
          color: rgba(235, 241, 255, 0.82);
          line-height: 1.45;
        }

        .rrGuideGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .rrGuideCard {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
            linear-gradient(180deg, rgba(17, 24, 37, 0.92), rgba(10, 16, 28, 0.92));
        }

        .rrGuideStep {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          opacity: 0.7;
          margin-bottom: 8px;
        }

        .rrGuideTitle {
          font-size: 16px;
          font-weight: 1000;
          margin-bottom: 6px;
        }

        .rrGuideBody {
          font-size: 12px;
          line-height: 1.5;
          color: rgba(231, 238, 251, 0.75);
        }

        .rrStudioGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.8fr);
          gap: 12px;
          align-items: start;
        }

        .rrStudioMain,
        .rrStudioSide {
          display: grid;
          gap: 12px;
        }

        .rrPanelHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .rrKicker {
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          color: rgba(170, 191, 230, 0.66);
          margin-bottom: 5px;
        }

        .rrPanelTitle {
          font-size: 15px;
          font-weight: 1000;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .rrPanelSub {
          margin-top: 4px;
          color: rgba(235, 241, 255, 0.72);
          font-size: 12px;
          line-height: 1.5;
        }

        .rrStatusPill {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          white-space: nowrap;
        }

        .rrStatusPill--gold {
          border-color: rgba(230, 170, 52, 0.34);
        }

        .rrStatusPill--cyan {
          border-color: rgba(46, 193, 234, 0.36);
        }

        .rrFormGrid {
          display: grid;
          gap: 10px;
        }

        .rrNotesArea {
          min-height: 156px !important;
          padding-top: 12px !important;
          resize: vertical;
        }

        .gunmetalInput,
        .gunmetalSelect {
          width: 100%;
          min-height: 38px;
          padding: 0 11px;
          border-radius: 10px;
          border: 1px solid rgba(123, 156, 196, 0.28);
          background: linear-gradient(
            180deg,
            rgba(8, 16, 30, 0.94),
            rgba(7, 13, 24, 0.98)
          );
          color: #f4f7fd;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        .gunmetalSelect option {
          background-color: #0b1220;
          color: #f4f7fd;
        }

        .gunmetalBtn,
        .gunmetalBtn--ghostLink {
          appearance: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 1000;
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

        .gunmetalBtn--ghostLink {
          background: linear-gradient(
            180deg,
            #5e687b 0%,
            #353d4c 52%,
            #28303d 100%
          );
        }

        .rrEmptyBox {
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 14px;
          color: rgba(235, 241, 255, 0.7);
          background: rgba(255, 255, 255, 0.015);
          font-size: 12px;
          line-height: 1.55;
        }

        .rrLogToolbar {
          display: grid;
          grid-template-columns: 220px 220px auto auto;
          gap: 8px;
          margin-bottom: 10px;
        }

        .rrToolbarActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .rrChip {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 1px;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          white-space: nowrap;
        }

        .rrChip--played {
          border-color: rgba(70, 205, 145, 0.35);
          color: #dff9ec;
        }

        .rrChip--skipped {
          border-color: rgba(230, 170, 52, 0.34);
          color: #ffe4aa;
        }

        .rrChip--canceled {
          border-color: rgba(224, 99, 116, 0.34);
          color: #ffd7dd;
        }

        .rrChip--category {
          border-color: rgba(212, 104, 255, 0.28);
          color: #f1ddff;
        }

        .rrTable {
          display: grid;
          gap: 6px;
        }

        .rrTableHead,
        .rrTableRow {
          display: grid;
          grid-template-columns: 120px 1fr 120px 1.2fr 1.2fr;
          gap: 8px;
          align-items: center;
        }

        .rrTableHead {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          opacity: 0.65;
          padding: 4px 6px;
          text-transform: uppercase;
        }

        .rrTableRow {
          padding: 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01)),
            linear-gradient(180deg, rgba(25, 31, 44, 0.9), rgba(14, 19, 31, 0.9));
          font-size: 12px;
        }

        .rrTableRow--played {
          border-left: 3px solid rgba(70, 205, 145, 0.6);
        }

        .rrTableRow--skipped {
          border-left: 3px solid rgba(224, 99, 116, 0.7);
        }

        .rrTableRow--neutral {
          border-left: 3px solid rgba(125, 156, 206, 0.45);
        }

        .rrArchiveList {
          display: grid;
          gap: 8px;
        }

        .rrArchiveRow {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.085);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
            linear-gradient(180deg, rgba(25, 31, 44, 0.92), rgba(14, 19, 31, 0.92));
          padding: 12px;
        }

        .rrArchiveTopLine {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }

        .rrEventTitle {
          font-size: 14px;
          font-weight: 1000;
          line-height: 1.15;
        }

        .rrEventMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
          color: rgba(213, 224, 244, 0.76);
          font-size: 12px;
          line-height: 1.35;
        }

        .rrEventNote {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(230, 237, 249, 0.86);
          font-size: 12px;
          line-height: 1.45;
        }

        @media (max-width: 1220px) {
          .rrHero,
          .rrGuideGrid,
          .rrStudioGrid {
            grid-template-columns: 1fr;
          }

          .rrLogToolbar {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 820px) {
          .rrHeroStats,
          .rrGuideGrid,
          .rrLogToolbar {
            grid-template-columns: 1fr;
          }

          .rrPanelHead {
            flex-direction: column;
            align-items: flex-start;
          }

          .rrTableHead {
            display: none;
          }

          .rrTableRow {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}

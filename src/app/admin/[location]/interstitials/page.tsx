import { prisma } from "@/lib/prisma";
import {
  deleteInterstitialAsset,
  deleteInterstitialSchedule,
  saveBoothNote,
  saveInterstitialAsset,
  saveInterstitialSchedule,
  toggleInterstitialAsset,
  toggleInterstitialSchedule,
} from "./actions";

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

function friendlyCategory(value: string) {
  const map: Record<string, string> = {
    WELCOME_RULES: "Welcome & Rules",
    REQUEST_DROP: "Request Drop",
    BLOCK_OF_SONGS: "Block of Songs",
    REMIX_RADIO: "Remix Radio",
    END_ANNOUNCE: "End Announce",
    MANUAL_ONLY: "Manual Only",
  };

  return map[value] || value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function joinList(values: string[]) {
  return values.join(", ");
}

export default async function AdminInterstitialsPage({
  params,
}: {
  params: { location: string };
}) {
  const locationId = params.location;

  const [assets, schedules, boothNote] = await Promise.all([
    prisma.interstitialAsset.findMany({
      where: { locationId },
      orderBy: [
        { active: "desc" },
        { category: "asc" },
        { priority: "desc" },
        { createdAt: "asc" },
      ],
    }),
    prisma.interstitialSchedule.findMany({
      where: { locationId },
      orderBy: [{ active: "desc" }, { startMinute: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.boothNote.findUnique({ where: { locationId } }),
  ]);

  const activeAssets = assets.filter((asset) => asset.active).length;
  const activeSchedules = schedules.filter((schedule) => schedule.active).length;

  return (
    <div className="rrAdminInterstitials">
      <div className="rrAdminInterstitials__shell">
        <header className="rrAdminTopbar rrAdminPanel">
          <div>
            <div className="rrEyebrow">REMIXREQUESTS • ADMIN</div>
            <h1 className="rrTitle">INTERSTITIAL CONTROL</h1>
            <p className="rrSub">
              Reworked for session-driven category windows. Assets are now the selectable library,
              while schedule windows decide when a category is due for <span className="rrAccentText">{locationId}</span>.
            </p>
          </div>

          <div className="rrAdminStatBoxes">
            <div className="rrAdminStatBox">
              <span>ASSETS</span>
              <strong>{assets.length}</strong>
            </div>
            <div className="rrAdminStatBox">
              <span>ACTIVE ASSETS</span>
              <strong>{activeAssets}</strong>
            </div>
            <div className="rrAdminStatBox">
              <span>WINDOWS</span>
              <strong>{schedules.length}</strong>
            </div>
            <div className="rrAdminStatBox">
              <span>ACTIVE WINDOWS</span>
              <strong>{activeSchedules}</strong>
            </div>
          </div>
        </header>

        <section className="rrAdminGrid rrAdminGrid--top">
          <section className="rrAdminPanel rrAdminPanel--form">
            <div className="rrPanelHead">
              <div>
                <div className="rrPanelTitle">Create New Asset</div>
                <div className="rrPanelSub">
                  These are the bridge-playable choices DJs will see inside tabs and timed modals.
                </div>
              </div>
              <span className="rrStatusPill rrStatusPill--gold">ASSET LIBRARY</span>
            </div>

            <form action={saveInterstitialAsset} className="rrFormStack">
              <input type="hidden" name="locationId" value={locationId} />

              <div className="rrFormGrid rrFormGrid--triple">
                <label>
                  <span className="rrControlLabel">Asset Name</span>
                  <input className="gunmetalInput" name="name" placeholder="Reverse Call [Begin]" required />
                </label>
                <label>
                  <span className="rrControlLabel">Local File Name</span>
                  <input className="gunmetalInput" name="fileUrl" placeholder="reverse-begin.mp3" required />
                </label>
                <label>
                  <span className="rrControlLabel">Category</span>
                  <select className="gunmetalSelect" name="category" defaultValue="REQUEST_DROP">
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {friendlyCategory(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rrFormGrid rrFormGrid--four">
                <label>
                  <span className="rrControlLabel">Preview GIF URL</span>
                  <input className="gunmetalInput" name="previewGifUrl" placeholder="/interstitials/reverse-begin.gif" />
                </label>
                <label>
                  <span className="rrControlLabel">Tile Label</span>
                  <input className="gunmetalInput" name="iconLabel" placeholder="Reverse Call" />
                </label>
                <label>
                  <span className="rrControlLabel">Duration (Sec)</span>
                  <input className="gunmetalInput" name="durationSec" type="number" min="0" defaultValue="5" />
                </label>
                <label>
                  <span className="rrControlLabel">Priority / Weight</span>
                  <div className="rrMiniPair">
                    <input className="gunmetalInput" name="priority" type="number" defaultValue="0" />
                    <input className="gunmetalInput" name="randomWeight" type="number" defaultValue="100" />
                  </div>
                </label>
              </div>

              <div className="rrFormGrid rrFormGrid--double">
                <label>
                  <span className="rrControlLabel">Allowed Profiles</span>
                  <input
                    className="gunmetalInput"
                    name="allowedProfiles"
                    placeholder={joinList([...PROFILE_OPTIONS])}
                  />
                </label>
                <label>
                  <span className="rrControlLabel">Blocked Profiles</span>
                  <input className="gunmetalInput" name="blockedProfiles" placeholder="ADULT" />
                </label>
              </div>

              <label>
                <span className="rrControlLabel">Notes</span>
                <textarea className="gunmetalTextarea" name="notes" rows={3} placeholder="Optional operator note for this asset." />
              </label>

              <div className="rrCheckboxGrid">
                <label className="gunmetalCheckboxRow">
                  <input className="gunmetalCheckbox" name="active" type="checkbox" defaultChecked />
                  Active and available in booth tabs
                </label>
                <label className="gunmetalCheckboxRow">
                  <input className="gunmetalCheckbox" name="manualOnly" type="checkbox" />
                  Manual only (visible in tabs, but excluded from auto prompt selection)
                </label>
              </div>

              <div className="rrActionRow">
                <button className="gunmetalBtn gunmetalBtn--primary" type="submit">
                  Save Asset
                </button>
              </div>
            </form>
          </section>

          <section className="rrAdminPanel rrAdminPanel--form">
            <div className="rrPanelHead">
              <div>
                <div className="rrPanelTitle">Create Session Window</div>
                <div className="rrPanelSub">
                  These windows drive the future booth modal: at the scheduled minute range, the system asks the DJ to choose one asset from that category.
                </div>
              </div>
              <span className="rrStatusPill rrStatusPill--cyan">TIMING ENGINE</span>
            </div>

            <form action={saveInterstitialSchedule} className="rrFormStack">
              <input type="hidden" name="locationId" value={locationId} />

              <div className="rrFormGrid rrFormGrid--triple">
                <label>
                  <span className="rrControlLabel">Category</span>
                  <select className="gunmetalSelect" name="category" defaultValue="WELCOME_RULES">
                    {CATEGORY_OPTIONS.filter((option) => option !== "MANUAL_ONLY").map((option) => (
                      <option key={option} value={option}>
                        {friendlyCategory(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="rrControlLabel">Window Label</span>
                  <input className="gunmetalInput" name="label" placeholder="Opening rules block" />
                </label>
                <label>
                  <span className="rrControlLabel">Prompt Title</span>
                  <input className="gunmetalInput" name="promptTitle" placeholder="Time to play Welcome & Rules" />
                </label>
              </div>

              <label>
                <span className="rrControlLabel">Prompt Body</span>
                <input className="gunmetalInput" name="promptBody" placeholder="Choose one to fire through the bridge." />
              </label>

              <div className="rrFormGrid rrFormGrid--five">
                <label>
                  <span className="rrControlLabel">Start Min</span>
                  <input className="gunmetalInput" name="startMinute" type="number" min="0" defaultValue="0" />
                </label>
                <label>
                  <span className="rrControlLabel">End Min</span>
                  <input className="gunmetalInput" name="endMinute" type="number" min="0" defaultValue="10" />
                </label>
                <label>
                  <span className="rrControlLabel">Sort Order</span>
                  <input className="gunmetalInput" name="sortOrder" type="number" min="0" defaultValue="0" />
                </label>
                <label>
                  <span className="rrControlLabel">Cooldown Min</span>
                  <input className="gunmetalInput" name="cooldownMinutes" type="number" min="0" placeholder="Optional" />
                </label>
                <div className="rrCheckboxCol">
                  <label className="gunmetalCheckboxRow">
                    <input className="gunmetalCheckbox" name="active" type="checkbox" defaultChecked />
                    Active
                  </label>
                  <label className="gunmetalCheckboxRow">
                    <input className="gunmetalCheckbox" name="required" type="checkbox" defaultChecked />
                    Required
                  </label>
                </div>
              </div>

              <div className="rrActionRow">
                <button className="gunmetalBtn gunmetalBtn--primary" type="submit">
                  Save Window
                </button>
              </div>
            </form>
          </section>
        </section>

        <section className="rrAdminPanel rrAdminPanel--notes">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Booth Notes</div>
              <div className="rrPanelSub">Shared note space for DJs. This matches the simple save-on-edit note box planned for the booth surface.</div>
            </div>
            <span className="rrStatusPill">SHARED</span>
          </div>

          <form action={saveBoothNote} className="rrFormStack">
            <input type="hidden" name="locationId" value={locationId} />
            <textarea
              className="gunmetalTextarea gunmetalTextarea--notes"
              name="body"
              defaultValue={boothNote?.body || ""}
              rows={4}
              placeholder="Leave notes for the next DJ here."
            />
            <div className="rrActionRow">
              <button className="gunmetalBtn gunmetalBtn--primary" type="submit">
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
                Backend-first hierarchy: windows decide the required category; assets are just the selectable choices inside that category.
              </div>
            </div>
            <span className="rrStatusPill rrStatusPill--cyan">{schedules.length} WINDOWS</span>
          </div>

          <div className="rrAssetList">
            {schedules.length === 0 ? (
              <div className="rrEmptyBox">No windows created yet.</div>
            ) : (
              schedules.map((schedule) => (
                <div className={`rrAssetCard ${schedule.active ? "" : "rrAssetCard--inactive"}`} key={schedule.id}>
                  <form action={saveInterstitialSchedule} className="rrFormStack">
                    <input type="hidden" name="id" value={schedule.id} />
                    <input type="hidden" name="locationId" value={locationId} />

                    <div className="rrAssetHeader">
                      <div>
                        <div className="rrAssetTitleLine">
                          <div className="rrAssetTitle">{friendlyCategory(schedule.category)}</div>
                          <span className={`rrChip ${schedule.active ? "rrChip--active" : "rrChip--inactive"}`}>
                            {schedule.active ? "ACTIVE" : "INACTIVE"}
                          </span>
                          <span className="rrChip rrChip--schedule">
                            {schedule.startMinute}–{schedule.endMinute} MIN
                          </span>
                        </div>
                        <div className="rrAssetSub">{schedule.label || schedule.promptTitle || "No custom window label yet."}</div>
                      </div>

                      <div className="rrAssetActions">
                        <button className="gunmetalBtn gunmetalBtn--primary" type="submit">Save</button>
                      </div>
                    </div>

                    <div className="rrFormGrid rrFormGrid--five rrFormGrid--tight">
                      <label>
                        <span className="rrControlLabel">Start</span>
                        <input className="gunmetalInput" name="startMinute" type="number" defaultValue={schedule.startMinute} />
                      </label>
                      <label>
                        <span className="rrControlLabel">End</span>
                        <input className="gunmetalInput" name="endMinute" type="number" defaultValue={schedule.endMinute} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Sort</span>
                        <input className="gunmetalInput" name="sortOrder" type="number" defaultValue={schedule.sortOrder} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Cooldown</span>
                        <input className="gunmetalInput" name="cooldownMinutes" type="number" defaultValue={schedule.cooldownMinutes ?? ""} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Category</span>
                        <select className="gunmetalSelect" name="category" defaultValue={schedule.category}>
                          {CATEGORY_OPTIONS.filter((option) => option !== "MANUAL_ONLY").map((option) => (
                            <option key={option} value={option}>
                              {friendlyCategory(option)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="rrFormGrid rrFormGrid--double">
                      <label>
                        <span className="rrControlLabel">Window Label</span>
                        <input className="gunmetalInput" name="label" defaultValue={schedule.label ?? ""} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Prompt Title</span>
                        <input className="gunmetalInput" name="promptTitle" defaultValue={schedule.promptTitle ?? ""} />
                      </label>
                    </div>

                    <label>
                      <span className="rrControlLabel">Prompt Body</span>
                      <input className="gunmetalInput" name="promptBody" defaultValue={schedule.promptBody ?? ""} />
                    </label>

                    <div className="rrCheckboxGrid">
                      <label className="gunmetalCheckboxRow">
                        <input className="gunmetalCheckbox" name="active" type="checkbox" defaultChecked={schedule.active} />
                        Active window
                      </label>
                      <label className="gunmetalCheckboxRow">
                        <input className="gunmetalCheckbox" name="required" type="checkbox" defaultChecked={schedule.required} />
                        Required prompt
                      </label>
                    </div>
                  </form>

                  <div className="rrDangerRow">
                    <form action={toggleInterstitialSchedule}>
                      <input type="hidden" name="id" value={schedule.id} />
                      <input type="hidden" name="locationId" value={locationId} />
                      <input type="hidden" name="nextActive" value={schedule.active ? "false" : "true"} />
                      <button className={`gunmetalBtn ${schedule.active ? "gunmetalBtn--warn" : "gunmetalBtn--primary"}`} type="submit">
                        {schedule.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <form action={deleteInterstitialSchedule}>
                      <input type="hidden" name="id" value={schedule.id} />
                      <input type="hidden" name="locationId" value={locationId} />
                      <button className="gunmetalBtn gunmetalBtn--danger" type="submit">Delete</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rrAdminPanel">
          <div className="rrPanelHead">
            <div>
              <div className="rrPanelTitle">Existing Assets</div>
              <div className="rrPanelSub">
                Assets can later render as the tabbed GIF tiles and the timer-forced queue modal choices.
              </div>
            </div>
            <span className="rrStatusPill rrStatusPill--cyan">{assets.length} ASSETS</span>
          </div>

          <div className="rrAssetList">
            {assets.length === 0 ? (
              <div className="rrEmptyBox">No assets created yet.</div>
            ) : (
              assets.map((asset) => (
                <div className={`rrAssetCard ${asset.active ? "" : "rrAssetCard--inactive"}`} key={asset.id}>
                  <form action={saveInterstitialAsset} className="rrFormStack">
                    <input type="hidden" name="id" value={asset.id} />
                    <input type="hidden" name="locationId" value={locationId} />

                    <div className="rrAssetHeader">
                      <div>
                        <div className="rrAssetTitleLine">
                          <div className="rrAssetTitle">{asset.name}</div>
                          <span className={`rrChip ${asset.active ? "rrChip--active" : "rrChip--inactive"}`}>
                            {asset.active ? "ACTIVE" : "INACTIVE"}
                          </span>
                          <span className="rrChip rrChip--category">{friendlyCategory(asset.category)}</span>
                          {asset.manualOnly ? <span className="rrChip rrChip--schedule">MANUAL ONLY</span> : null}
                        </div>
                        <div className="rrAssetSub">Local file: {asset.fileUrl}</div>
                      </div>

                      <div className="rrAssetActions">
                        <button className="gunmetalBtn gunmetalBtn--primary" type="submit">Save</button>
                      </div>
                    </div>

                    <div className="rrFormGrid rrFormGrid--triple">
                      <label>
                        <span className="rrControlLabel">Name</span>
                        <input className="gunmetalInput" name="name" defaultValue={asset.name} />
                      </label>
                      <label>
                        <span className="rrControlLabel">File</span>
                        <input className="gunmetalInput" name="fileUrl" defaultValue={asset.fileUrl} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Category</span>
                        <select className="gunmetalSelect" name="category" defaultValue={asset.category}>
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {friendlyCategory(option)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="rrFormGrid rrFormGrid--four">
                      <label>
                        <span className="rrControlLabel">GIF URL</span>
                        <input className="gunmetalInput" name="previewGifUrl" defaultValue={asset.previewGifUrl ?? ""} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Tile Label</span>
                        <input className="gunmetalInput" name="iconLabel" defaultValue={asset.iconLabel ?? ""} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Duration</span>
                        <input className="gunmetalInput" name="durationSec" type="number" defaultValue={asset.durationSec ?? ""} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Priority / Weight</span>
                        <div className="rrMiniPair">
                          <input className="gunmetalInput" name="priority" type="number" defaultValue={asset.priority} />
                          <input className="gunmetalInput" name="randomWeight" type="number" defaultValue={asset.randomWeight} />
                        </div>
                      </label>
                    </div>

                    <div className="rrFormGrid rrFormGrid--double">
                      <label>
                        <span className="rrControlLabel">Allowed Profiles</span>
                        <input className="gunmetalInput" name="allowedProfiles" defaultValue={joinList(asset.allowedProfiles)} />
                      </label>
                      <label>
                        <span className="rrControlLabel">Blocked Profiles</span>
                        <input className="gunmetalInput" name="blockedProfiles" defaultValue={joinList(asset.blockedProfiles)} />
                      </label>
                    </div>

                    <label>
                      <span className="rrControlLabel">Notes</span>
                      <textarea className="gunmetalTextarea" name="notes" rows={3} defaultValue={asset.notes ?? ""} />
                    </label>

                    <div className="rrCheckboxGrid">
                      <label className="gunmetalCheckboxRow">
                        <input className="gunmetalCheckbox" name="active" type="checkbox" defaultChecked={asset.active} />
                        Active asset
                      </label>
                      <label className="gunmetalCheckboxRow">
                        <input className="gunmetalCheckbox" name="manualOnly" type="checkbox" defaultChecked={asset.manualOnly} />
                        Manual only
                      </label>
                    </div>
                  </form>

                  <div className="rrDangerRow">
                    <form action={toggleInterstitialAsset}>
                      <input type="hidden" name="id" value={asset.id} />
                      <input type="hidden" name="locationId" value={locationId} />
                      <input type="hidden" name="nextActive" value={asset.active ? "false" : "true"} />
                      <button className={`gunmetalBtn ${asset.active ? "gunmetalBtn--warn" : "gunmetalBtn--primary"}`} type="submit">
                        {asset.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <form action={deleteInterstitialAsset}>
                      <input type="hidden" name="id" value={asset.id} />
                      <input type="hidden" name="locationId" value={locationId} />
                      <button className="gunmetalBtn gunmetalBtn--danger" type="submit">Delete</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
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
          max-width: 1520px;
          margin: 0 auto;
          display: grid;
          gap: 10px;
        }

        .rrAdminGrid {
          display: grid;
          gap: 10px;
        }

        .rrAdminGrid--top {
          grid-template-columns: 1.2fr 1fr;
        }

        .rrAdminPanel,
        .rrAdminTopbar {
          min-width: 0;
          border-radius: 6px;
          border: 1px solid rgba(77, 107, 143, 0.28);
          background: linear-gradient(180deg, rgba(21, 27, 41, 0.95), rgba(8, 13, 23, 0.94));
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
          max-width: 840px;
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

        .rrFormStack {
          display: grid;
          gap: 10px;
        }

        .rrFormGrid {
          display: grid;
          gap: 10px;
        }

        .rrFormGrid--double {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rrFormGrid--triple {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .rrFormGrid--four {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .rrFormGrid--five {
          grid-template-columns: 0.7fr 0.7fr 0.7fr 0.8fr 1.2fr;
        }

        .rrFormGrid--tight {
          margin-top: 10px;
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

        .gunmetalInput,
        .gunmetalSelect,
        .gunmetalTextarea {
          width: 100%;
          min-height: 34px;
          padding: 0 11px;
          border-radius: 4px;
          border: 1px solid rgba(123, 156, 196, 0.32);
          background: linear-gradient(180deg, rgba(8, 16, 30, 0.94), rgba(7, 13, 24, 0.98));
          color: #f4f7fd;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 0 0 1px rgba(12, 26, 48, 0.34);
        }

        .gunmetalTextarea {
          min-height: 88px;
          padding: 10px 11px;
          resize: vertical;
        }

        .gunmetalTextarea--notes {
          min-height: 100px;
        }

        .gunmetalInput::placeholder,
        .gunmetalTextarea::placeholder {
          color: rgba(197, 211, 235, 0.46);
          font-weight: 600;
        }

        .gunmetalInput:focus,
        .gunmetalSelect:focus,
        .gunmetalTextarea:focus {
          border-color: rgba(111, 167, 255, 0.54);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 0 0 1px rgba(71, 118, 210, 0.46),
            0 0 14px rgba(71, 118, 210, 0.16);
        }

        .rrMiniPair {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .rrCheckboxGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .rrCheckboxCol {
          display: grid;
          gap: 8px;
          align-content: end;
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

        .rrActionRow,
        .rrDangerRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .rrDangerRow {
          margin-top: 10px;
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
          background: linear-gradient(180deg, #4a5467 0%, #2d3441 52%, #232935 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 -1px 0 rgba(0, 0, 0, 0.46), 0 1px 2px rgba(0, 0, 0, 0.32);
        }

        .gunmetalBtn:hover {
          filter: brightness(1.06);
        }

        .gunmetalBtn--primary {
          background: linear-gradient(180deg, #3d7ec0 0%, #245694 52%, #1c4479 100%);
        }

        .gunmetalBtn--danger {
          background: linear-gradient(180deg, #8d4450 0%, #713341 52%, #5b2834 100%);
        }

        .gunmetalBtn--warn {
          background: linear-gradient(180deg, #8a6a1d 0%, #735515 52%, #5a430f 100%);
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
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03), inset 0 -1px 0 rgba(0, 0, 0, 0.25);
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

        .rrAssetSub {
          margin-top: 5px;
          color: rgba(213, 224, 244, 0.76);
          font-size: 12px;
          line-height: 1.35;
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

        .rrEmptyBox {
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 12px;
          color: rgba(235, 241, 255, 0.7);
          background: rgba(255, 255, 255, 0.015);
          font-size: 12px;
        }

        @media (max-width: 1180px) {
          .rrAdminGrid--top {
            grid-template-columns: 1fr;
          }

          .rrFormGrid--four,
          .rrFormGrid--five {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .rrTitle {
            font-size: 24px;
          }

          .rrAdminTopbar,
          .rrAssetHeader,
          .rrFormGrid--double,
          .rrFormGrid--triple,
          .rrFormGrid--four,
          .rrFormGrid--five,
          .rrCheckboxGrid {
            grid-template-columns: 1fr;
          }

          .rrAdminStatBoxes,
          .rrActionRow,
          .rrDangerRow,
          .rrAssetActions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

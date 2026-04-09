"use client";

import { saveInterstitialAsset } from "@/app/admin/[location]/interstitials/actions";

type InterstitialAssetFormProps = {
  locationId: string;
  categoryOptions: string[];
  scheduleOptions?: string[];
  initialValues?: {
    id?: string;
    name?: string;
    category?: string;
    fileUrl?: string;
    previewGifUrl?: string | null;
    iconLabel?: string | null;
    durationSec?: number | null;
    notes?: string | null;
    active?: boolean;
    manualOnly?: boolean;
    priority?: number;
    randomWeight?: number;
  };
  submitLabel?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  ANNOUNCEMENTS: "Announcements",
  SONG_INTROS: "Song Intros",
  GAMES_DANCES: "Games & Dances",
  REMIX_PROMOS: "Remix & Promos",
};

function getCategoryLabel(value: string) {
  return CATEGORY_LABELS[value] ?? value;
}

export function InterstitialAssetForm({
  locationId,
  categoryOptions,
  initialValues,
  submitLabel = "Save Asset",
}: InterstitialAssetFormProps) {
  return (
    <form action={saveInterstitialAsset} className="rrFormGrid">
      <input type="hidden" name="id" defaultValue={initialValues?.id ?? ""} />
      <input type="hidden" name="locationId" value={locationId} />

      <section className="rrFormSection">
        <div className="rrFormSectionHeader">
          <div>
            <div className="rrSectionEyebrow">Asset Identity</div>
            <div className="rrFormSectionSub">
              These are the booth-playable interstitial choices DJs will see in
              the folder tabs and scheduled prompt modal.
            </div>
          </div>
          <span className="rrStatusPill rrStatusPill--gold">ASSET LIBRARY</span>
        </div>

        <div className="rrFormGrid rrFormGrid--triple">
          <div>
            <label className="rrControlLabel" htmlFor="asset-name">
              Asset Name
            </label>
            <input
              id="asset-name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              className="gunmetalInput"
              placeholder="Reverse Skate Intro"
              required
            />
          </div>

          <div>
            <label className="rrControlLabel" htmlFor="asset-file">
              Local File Name
            </label>
            <input
              id="asset-file"
              name="fileUrl"
              defaultValue={initialValues?.fileUrl ?? ""}
              className="gunmetalInput"
              placeholder="reverse-skate-intro.mp3"
              required
            />
          </div>

          <div>
            <label className="rrControlLabel" htmlFor="asset-category">
              Category
            </label>
            <select
              id="asset-category"
              name="category"
              defaultValue={initialValues?.category ?? categoryOptions[0] ?? ""}
              className="gunmetalSelect"
              required
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {getCategoryLabel(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rrFormGrid rrFormGrid--five" style={{ marginTop: 10 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label className="rrControlLabel" htmlFor="asset-preview-gif">
              Preview GIF URL
            </label>
            <input
              id="asset-preview-gif"
              name="previewGifUrl"
              defaultValue={initialValues?.previewGifUrl ?? ""}
              className="gunmetalInput"
              placeholder="/interstitials/reverse-skate-intro.gif"
            />
          </div>

          <div>
            <label className="rrControlLabel" htmlFor="asset-icon-label">
              Tile Label
            </label>
            <input
              id="asset-icon-label"
              name="iconLabel"
              defaultValue={initialValues?.iconLabel ?? ""}
              className="gunmetalInput"
              placeholder="Reverse Intro"
            />
          </div>

          <div>
            <label className="rrControlLabel" htmlFor="asset-duration">
              Duration (sec)
            </label>
            <input
              id="asset-duration"
              type="number"
              name="durationSec"
              defaultValue={initialValues?.durationSec ?? ""}
              className="gunmetalInput"
              min={0}
              placeholder="7"
            />
          </div>

          <div className="rrFormGrid rrFormGrid--double" style={{ gap: 8 }}>
            <div>
              <label className="rrControlLabel" htmlFor="asset-priority">
                Priority
              </label>
              <input
                id="asset-priority"
                type="number"
                name="priority"
                defaultValue={initialValues?.priority ?? 0}
                className="gunmetalInput"
                placeholder="0"
              />
            </div>

            <div>
              <label className="rrControlLabel" htmlFor="asset-weight">
                Weight
              </label>
              <input
                id="asset-weight"
                type="number"
                name="randomWeight"
                defaultValue={initialValues?.randomWeight ?? 100}
                className="gunmetalInput"
                placeholder="100"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rrFormSection">
        <div className="rrFormSectionHeader">
          <div>
            <div className="rrSectionEyebrow">Operator Notes</div>
            <div className="rrFormSectionSub">
              Optional context for DJs and admins.
            </div>
          </div>
        </div>

        <div>
          <label className="rrControlLabel" htmlFor="asset-notes">
            Notes
          </label>
          <textarea
            id="asset-notes"
            name="notes"
            defaultValue={initialValues?.notes ?? ""}
            className="gunmetalInput"
            placeholder="Optional operator note for this asset."
            rows={4}
            style={{ minHeight: 120, paddingTop: 10, resize: "vertical" }}
          />
        </div>
      </section>

      <div className="rrFormGrid rrFormGrid--double" style={{ alignItems: "stretch" }}>
        <label className="gunmetalCheckboxRow">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initialValues?.active ?? true}
            className="gunmetalCheckbox"
          />
          Active and visible in booth tabs
        </label>

        <label className="gunmetalCheckboxRow">
          <input
            type="checkbox"
            name="manualOnly"
            defaultChecked={initialValues?.manualOnly ?? false}
            className="gunmetalCheckbox"
          />
          Manual only (visible in tabs, excluded from scheduled prompt selection)
        </label>
      </div>

      <div className="rrFormActions">
        <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
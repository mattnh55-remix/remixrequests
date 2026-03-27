"use client";

import { saveInterstitialAsset } from "@/app/admin/[location]/interstitials/actions";

type InterstitialAssetFormProps = {
  locationId: string;
  categoryOptions: string[];
  profileOptions: string[];
  scheduleOptions?: string[]; // kept optional so older callers do not break
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
    allowedProfiles?: string[];
    blockedProfiles?: string[];
  };
  submitLabel?: string;
};

function normalizeCsv(values?: string[]) {
  return (values ?? []).join(", ");
}

export function InterstitialAssetForm({
  locationId,
  categoryOptions,
  profileOptions,
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
              These are the bridge-playable choices DJs will see inside tabs and
              timed modal prompts.
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
              placeholder="Reverse Call [Begin]"
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
              placeholder="reverse-begin.mp3"
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
                  {option
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (m) => m.toUpperCase())}
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
              placeholder="/interstitials/reverse-call.gif"
            />
          </div>

          <div style={{ gridColumn: "span 1" }}>
            <label className="rrControlLabel" htmlFor="asset-icon-label">
              Tile Label
            </label>
            <input
              id="asset-icon-label"
              name="iconLabel"
              defaultValue={initialValues?.iconLabel ?? ""}
              className="gunmetalInput"
              placeholder="Reverse Call"
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
              placeholder="5"
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
            <div className="rrSectionEyebrow">Audience Targeting</div>
            <div className="rrFormSectionSub">
              Limit visibility by session profile. Leave allowed blank to make
              the asset broadly available.
            </div>
          </div>
        </div>

        <div className="rrFormGrid rrFormGrid--double">
          <div>
            <label className="rrControlLabel" htmlFor="asset-allowed">
              Allowed Profiles
            </label>
            <input
              id="asset-allowed"
              name="allowedProfiles"
              defaultValue={normalizeCsv(initialValues?.allowedProfiles)}
              className="gunmetalInput"
              placeholder={profileOptions.join(", ")}
            />
          </div>

          <div>
            <label className="rrControlLabel" htmlFor="asset-blocked">
              Blocked Profiles
            </label>
            <input
              id="asset-blocked"
              name="blockedProfiles"
              defaultValue={normalizeCsv(initialValues?.blockedProfiles)}
              className="gunmetalInput"
              placeholder={profileOptions.join(", ")}
            />
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
          Active and available in booth tabs
        </label>

        <label className="gunmetalCheckboxRow">
          <input
            type="checkbox"
            name="manualOnly"
            defaultChecked={initialValues?.manualOnly ?? false}
            className="gunmetalCheckbox"
          />
          Manual only (visible in tabs, excluded from auto prompt selection)
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
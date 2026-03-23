"use client";

import { saveInterstitialAsset } from "@/app/admin/[location]/interstitials/actions";

type InterstitialAssetFormProps = {
  locationId: string;
  categoryOptions: string[];
  scheduleOptions: string[];
  profileOptions: string[];
  initialValues?: {
    id?: string;
    name?: string;
    category?: string;
    fileUrl?: string;
    durationSec?: number | null;
    active?: boolean;
    priority?: number;
    randomWeight?: number;
    scheduleMode?: string;
    intervalMinutes?: number | null;
    allowedProfiles?: string[];
    blockedProfiles?: string[];
  };
  submitLabel?: string;
};

export function InterstitialAssetForm({
  locationId,
  categoryOptions,
  scheduleOptions,
  profileOptions,
  initialValues,
  submitLabel = "Save Interstitial",
}: InterstitialAssetFormProps) {
  return (
    <form action={saveInterstitialAsset} className="rrFormGrid">
      <input type="hidden" name="id" defaultValue={initialValues?.id ?? ""} />
      <input type="hidden" name="locationId" value={locationId} />

      <section className="rrFormSection">
        <div className="rrFormSectionHeader">
          <div>
            <div className="rrSectionEyebrow">Identity</div>
            <div className="rrFormSectionSub">
              Define the label operators see and the exact booth-local MP3
              filename.
            </div>
          </div>
          <span className="rrStatusPill rrStatusPill--gold">LOCAL FILE</span>
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
              placeholder="Request Block Intro"
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
              placeholder="request-block-intro.mp3"
              required
            />
            <div className="rrFieldHint">
              Store the filename only. The booth machine will combine it with
              its configured local interstitial folder.
            </div>
          </div>

          <div>
            <label className="rrControlLabel" htmlFor="asset-category">
              Category
            </label>
            <select
              id="asset-category"
              name="category"
              defaultValue={initialValues?.category ?? "BRANDING"}
              className="gunmetalSelect"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rrFormSection">
        <div className="rrFormSectionHeader">
          <div>
            <div className="rrSectionEyebrow">Behavior</div>
            <div className="rrFormSectionSub">
              Set playback length, cadence, and selection weight so runtime
              rules can materialize cleanly.
            </div>
          </div>
        </div>

        <div className="rrFormGrid rrFormGrid--five">
          <div>
            <label className="rrControlLabel" htmlFor="asset-schedule">
              Schedule Mode
            </label>
            <select
              id="asset-schedule"
              name="scheduleMode"
              defaultValue={initialValues?.scheduleMode ?? "NONE"}
              className="gunmetalSelect"
            >
              {scheduleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
              placeholder="12"
            />
          </div>

          <div>
            <label className="rrControlLabel" htmlFor="asset-interval">
              Interval Minutes
            </label>
            <input
              id="asset-interval"
              type="number"
              name="intervalMinutes"
              defaultValue={initialValues?.intervalMinutes ?? ""}
              className="gunmetalInput"
              min={0}
              placeholder="60"
            />
          </div>

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
              Random Weight
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
      </section>

      <section className="rrFormSection">
        <div className="rrFormSectionHeader">
          <div>
            <div className="rrSectionEyebrow">Audience Targeting</div>
            <div className="rrFormSectionSub">
              Optional profile filters. Leave blank to allow broad use.
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
              defaultValue={(initialValues?.allowedProfiles ?? []).join(", ")}
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
              defaultValue={(initialValues?.blockedProfiles ?? []).join(", ")}
              className="gunmetalInput"
              placeholder={profileOptions.join(", ")}
            />
          </div>
        </div>
      </section>

      <div
        className="rrFormGrid rrFormGrid--double"
        style={{ alignItems: "center" }}
      >
        <label className="gunmetalCheckboxRow">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initialValues?.active ?? true}
            className="gunmetalCheckbox"
          />
          Active and eligible for runtime materialization
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
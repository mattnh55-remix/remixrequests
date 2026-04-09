"use client";

import Link from "next/link";
import { saveInterstitialSchedule } from "@/app/admin/[location]/interstitials/actions";

type Asset = {
  id: string;
  name: string;
  category: string;
  active: boolean;
};

type InterstitialScheduleFormProps = {
  locationId: string;
  locationSlug: string;
  categoryOptions: string[];
  assets: Asset[];
  initialValues?: {
    id?: string;
    category?: string;
    label?: string | null;
    promptTitle?: string | null;
    promptBody?: string | null;
    startMinute?: number;
    endMinute?: number;
    sortOrder?: number;
    cooldownMinutes?: number | null;
    active?: boolean;
    required?: boolean;
    eligibleAssetIds?: string[];
  };
  submitLabel?: string;
  mode?: "create" | "edit";
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

export function InterstitialScheduleForm({
  locationId,
  locationSlug,
  categoryOptions,
  assets,
  initialValues,
  submitLabel = "Save Window",
  mode = "create",
}: InterstitialScheduleFormProps) {
  const cancelHref = `/admin/${locationSlug}/interstitials`;

  const groupedAssets = categoryOptions.map((category) => ({
    category,
    items: assets.filter((a) => a.category === category && a.active),
  }));

  return (
    <form action={saveInterstitialSchedule} className="rrFormGrid">
      <input type="hidden" name="id" defaultValue={initialValues?.id ?? ""} />
      <input type="hidden" name="locationId" value={locationId} />

      <section className="rrFormSection">
        <div className="rrFormSectionHeader">
          <div>
            <div className="rrSectionEyebrow">Window Identity</div>
            <div className="rrFormSectionSub">
              Define the category and operator-facing prompt copy for this session window.
            </div>
          </div>
          <span className="rrStatusPill rrStatusPill--gold">WINDOW SETUP</span>
        </div>

        <div className="rrFormGrid rrFormGrid--triple">
          <div>
            <label className="rrControlLabel">Category</label>
            <select
              name="category"
              defaultValue={initialValues?.category ?? categoryOptions[0]}
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

          <div>
            <label className="rrControlLabel">Window Label</label>
            <input
              name="label"
              defaultValue={initialValues?.label ?? ""}
              className="gunmetalInput"
              placeholder="Welcome Rules"
            />
          </div>

          <div>
            <label className="rrControlLabel">Prompt Title</label>
            <input
              name="promptTitle"
              defaultValue={initialValues?.promptTitle ?? ""}
              className="gunmetalInput"
              placeholder="Time to play rules"
            />
          </div>
        </div>

        <div>
          <label className="rrControlLabel">Prompt Body</label>
          <input
            name="promptBody"
            defaultValue={initialValues?.promptBody ?? ""}
            className="gunmetalInput"
            placeholder="Choose one rules segment to play"
          />
        </div>
      </section>

      <section className="rrFormSection">
        <div className="rrFormSectionHeader">
          <div>
            <div className="rrSectionEyebrow">Timing + Rules</div>
            <div className="rrFormSectionSub">
              Define when this window becomes due and how strongly it behaves.
            </div>
          </div>
        </div>

        <div className="rrFormGrid rrFormGrid--five">
          <div>
            <label className="rrControlLabel">Start Minute</label>
            <input
              type="number"
              name="startMinute"
              defaultValue={initialValues?.startMinute ?? 0}
              className="gunmetalInput"
            />
          </div>

          <div>
            <label className="rrControlLabel">End Minute</label>
            <input
              type="number"
              name="endMinute"
              defaultValue={initialValues?.endMinute ?? 10}
              className="gunmetalInput"
            />
          </div>

          <div>
            <label className="rrControlLabel">Sort Order</label>
            <input
              type="number"
              name="sortOrder"
              defaultValue={initialValues?.sortOrder ?? 0}
              className="gunmetalInput"
            />
          </div>

          <div>
            <label className="rrControlLabel">Cooldown Minutes</label>
            <input
              type="number"
              name="cooldownMinutes"
              defaultValue={initialValues?.cooldownMinutes ?? ""}
              className="gunmetalInput"
              placeholder="Optional"
            />
          </div>

          <div className="rrScheduleChecks">
            <label className="gunmetalCheckboxRow">
              <input
                type="checkbox"
                name="active"
                defaultChecked={initialValues?.active ?? true}
                className="gunmetalCheckbox"
              />
              Active
            </label>

            <label className="gunmetalCheckboxRow">
              <input
                type="checkbox"
                name="required"
                defaultChecked={initialValues?.required ?? true}
                className="gunmetalCheckbox"
              />
              Required
            </label>
          </div>
        </div>
      </section>

      <section className="rrFormSection">
        <div className="rrFormSectionHeader">
          <div>
            <div className="rrSectionEyebrow">Eligible Assets</div>
            <div className="rrFormSectionSub">
              Pick which active assets can satisfy this window.
            </div>
          </div>
        </div>

        <div className="rrAssetSelectorGrid">
          {groupedAssets.map((group) => (
            <div key={group.category} className="rrAssetGroup">
              <div className="rrAssetGroupTitle">{getCategoryLabel(group.category)}</div>

              {group.items.length === 0 ? (
                <div className="rrAssetEmpty">No active assets in this category</div>
              ) : (
                <div className="rrAssetOptionList">
                  {group.items.map((asset) => (
                    <label key={asset.id} className="rrAssetOption">
                      <input
                        type="checkbox"
                        name="eligibleAssetIds"
                        value={asset.id}
                        defaultChecked={initialValues?.eligibleAssetIds?.includes(asset.id)}
                        className="gunmetalCheckbox"
                      />
                      <span>{asset.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="rrFormActions">
        {mode === "edit" && (
          <Link href={cancelHref} className="gunmetalBtn gunmetalBtn--ghostLink">
            Cancel
          </Link>
        )}

        <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
          {submitLabel}
        </button>
      </div>

      <style jsx>{`
        .rrScheduleChecks {
          display: grid;
          gap: 8px;
          align-content: start;
        }

        .rrAssetSelectorGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .rrAssetGroup {
          min-width: 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.015);
        }

        .rrAssetGroupTitle {
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 8px;
          opacity: 0.82;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .rrAssetOptionList {
          display: grid;
          gap: 6px;
        }

        .rrAssetOption {
          display: flex;
          gap: 8px;
          align-items: center;
          min-height: 34px;
          padding: 6px 0;
          font-size: 12px;
          line-height: 1.35;
        }

        .rrAssetEmpty {
          font-size: 11px;
          opacity: 0.58;
        }

        @media (max-width: 820px) {
          .rrAssetSelectorGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
}
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
  assets: Asset[]; // ✅ NEW
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
    eligibleAssetIds?: string[]; // ✅ NEW
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

      {/* =========================
         BASIC INFO
      ========================== */}
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
          />
        </div>

        <div>
          <label className="rrControlLabel">Prompt Title</label>
          <input
            name="promptTitle"
            defaultValue={initialValues?.promptTitle ?? ""}
            className="gunmetalInput"
          />
        </div>
      </div>

      <div>
        <label className="rrControlLabel">Prompt Body</label>
        <input
          name="promptBody"
          defaultValue={initialValues?.promptBody ?? ""}
          className="gunmetalInput"
        />
      </div>

      {/* =========================
         TIMING
      ========================== */}
      <div className="rrFormGrid rrFormGrid--five">
        <input type="number" name="startMinute" defaultValue={initialValues?.startMinute ?? 0} className="gunmetalInput" />
        <input type="number" name="endMinute" defaultValue={initialValues?.endMinute ?? 10} className="gunmetalInput" />
        <input type="number" name="sortOrder" defaultValue={initialValues?.sortOrder ?? 0} className="gunmetalInput" />
        <input type="number" name="cooldownMinutes" defaultValue={initialValues?.cooldownMinutes ?? ""} className="gunmetalInput" />

        <div>
          <label className="gunmetalCheckboxRow">
            <input type="checkbox" name="active" defaultChecked={initialValues?.active ?? true} />
            Active
          </label>
          <label className="gunmetalCheckboxRow">
            <input type="checkbox" name="required" defaultChecked={initialValues?.required ?? true} />
            Required
          </label>
        </div>
      </div>

      {/* =========================
         🔥 NEW: ELIGIBLE ASSETS
      ========================== */}
      <div className="rrAssetSelector">
        <div className="rrControlLabel">Eligible Assets</div>

        <div className="rrAssetSelectorGrid">
          {groupedAssets.map((group) => (
            <div key={group.category} className="rrAssetGroup">
              <div className="rrAssetGroupTitle">
                {getCategoryLabel(group.category)}
              </div>

              {group.items.length === 0 ? (
                <div className="rrAssetEmpty">No assets</div>
              ) : (
                group.items.map((asset) => (
                  <label key={asset.id} className="rrAssetOption">
                    <input
                      type="checkbox"
                      name="eligibleAssetIds"
                      value={asset.id}
                      defaultChecked={initialValues?.eligibleAssetIds?.includes(asset.id)}
                    />
                    <span>{asset.name}</span>
                  </label>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {/* =========================
         ACTIONS
      ========================== */}
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
        .rrAssetSelector {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 12px;
        }

        .rrAssetSelectorGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          max-height: 260px;
          overflow-y: auto;
        }

        .rrAssetGroup {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 8px;
        }

        .rrAssetGroupTitle {
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 6px;
          opacity: 0.8;
        }

        .rrAssetOption {
          display: flex;
          gap: 6px;
          align-items: center;
          font-size: 12px;
          padding: 4px 0;
        }

        .rrAssetEmpty {
          font-size: 11px;
          opacity: 0.5;
        }
      `}</style>
    </form>
  );
}
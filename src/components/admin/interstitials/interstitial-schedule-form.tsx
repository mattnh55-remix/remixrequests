"use client";

import Link from "next/link";
import { saveInterstitialSchedule } from "@/app/admin/[location]/interstitials/actions";

type InterstitialScheduleFormProps = {
  locationId: string;
  locationSlug: string;
  categoryOptions: string[];
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
  initialValues,
  submitLabel = "Save Window",
  mode = "create",
}: InterstitialScheduleFormProps) {
  const cancelHref = `/admin/${locationSlug}/interstitials`;

  return (
    <form action={saveInterstitialSchedule} className="rrFormGrid">
      <input type="hidden" name="id" defaultValue={initialValues?.id ?? ""} />
      <input type="hidden" name="locationId" value={locationId} />

      <div className="rrFormGrid rrFormGrid--triple">
        <div>
          <label className="rrControlLabel" htmlFor="window-category">
            Category
          </label>
          <select
            id="window-category"
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

        <div>
          <label className="rrControlLabel" htmlFor="window-label">
            Window Label
          </label>
          <input
            id="window-label"
            name="label"
            defaultValue={initialValues?.label ?? ""}
            className="gunmetalInput"
            placeholder="Main announcement window"
          />
        </div>

        <div>
          <label className="rrControlLabel" htmlFor="window-title">
            Prompt Title
          </label>
          <input
            id="window-title"
            name="promptTitle"
            defaultValue={initialValues?.promptTitle ?? ""}
            className="gunmetalInput"
            placeholder="Time to play Announcements"
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
          defaultValue={initialValues?.promptBody ?? ""}
          className="gunmetalInput"
          placeholder="Choose one interstitial to play now."
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
            defaultValue={initialValues?.startMinute ?? 0}
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
            defaultValue={initialValues?.endMinute ?? 10}
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
            defaultValue={initialValues?.sortOrder ?? 0}
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
            defaultValue={initialValues?.cooldownMinutes ?? ""}
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

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {mode === "edit" ? (
          <Link href={cancelHref} className="gunmetalBtn gunmetalBtn--ghostLink">
            Cancel Edit
          </Link>
        ) : null}

        <button type="submit" className="gunmetalBtn gunmetalBtn--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
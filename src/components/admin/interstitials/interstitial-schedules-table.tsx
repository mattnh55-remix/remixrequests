"use client";

import Link from "next/link";
import {
  deleteInterstitialSchedule,
  toggleInterstitialSchedule,
} from "@/app/admin/[location]/interstitials/actions";

type ScheduleRow = {
  id: string;
  category: string;
  label: string | null;
  promptTitle: string | null;
  promptBody: string | null;
  startMinute: number;
  endMinute: number;
  sortOrder: number;
  cooldownMinutes: number | null;
  active: boolean;
  required: boolean;
};

type InterstitialSchedulesTableProps = {
  locationId: string;
  locationSlug: string;
  schedules: ScheduleRow[];
  editingScheduleId?: string | null;
};

function niceCategory(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function InterstitialSchedulesTable({
  locationId,
  locationSlug,
  schedules,
  editingScheduleId,
}: InterstitialSchedulesTableProps) {
  if (!schedules.length) {
    return <div className="rrEmptyBox">No schedule windows yet.</div>;
  }

  return (
    <div className="rrAssetList">
      {schedules.map((schedule) => {
        const isEditing = editingScheduleId === schedule.id;

        return (
          <div
            key={schedule.id}
            className={`rrAssetCard ${isEditing ? "rrAssetCard--editing" : ""}`}
          >
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
                    {schedule.active ? "Active" : "Inactive"}
                  </span>

                  <span className="rrChip rrChip--category">
                    {niceCategory(schedule.category)}
                  </span>

                  {schedule.required ? (
                    <span className="rrChip rrChip--schedule">Required</span>
                  ) : (
                    <span className="rrChip rrChip--inactive">Optional</span>
                  )}
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
                  <button type="submit" className="gunmetalBtn gunmetalBtn--warn">
                    {schedule.active ? "Deactivate" : "Activate"}
                  </button>
                </form>

                <Link
                  href={`/admin/${locationSlug}/interstitials?editSchedule=${schedule.id}`}
                  className="gunmetalBtn gunmetalBtn--ghostLink"
                >
                  {isEditing ? "Editing…" : "Edit"}
                </Link>

                <form
                  action={deleteInterstitialSchedule}
                  onSubmit={(e) => {
                    if (
                      !window.confirm(
                        `Delete window "${schedule.label?.trim() || niceCategory(schedule.category)}"?`
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="id" value={schedule.id} />
                  <input type="hidden" name="locationId" value={locationId} />
                  <button type="submit" className="gunmetalBtn gunmetalBtn--danger">
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
              <div className="rrAssetProfiles">
                <strong>Prompt:</strong> {schedule.promptBody}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
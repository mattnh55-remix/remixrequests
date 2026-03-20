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
    <form action={saveInterstitialAsset} className="space-y-4">
      <input type="hidden" name="id" defaultValue={initialValues?.id ?? ""} />
      <input type="hidden" name="locationId" value={locationId} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            name="name"
            defaultValue={initialValues?.name ?? ""}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Birthday shoutout intro"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">File URL</label>
          <input
            name="fileUrl"
            defaultValue={initialValues?.fileUrl ?? ""}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="https://..."
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select
            name="category"
            defaultValue={initialValues?.category ?? "BRANDING"}
            className="w-full rounded-lg border px-3 py-2"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Schedule Mode</label>
          <select
            name="scheduleMode"
            defaultValue={initialValues?.scheduleMode ?? "NONE"}
            className="w-full rounded-lg border px-3 py-2"
          >
            {scheduleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Duration (sec)</label>
          <input
            type="number"
            name="durationSec"
            defaultValue={initialValues?.durationSec ?? ""}
            className="w-full rounded-lg border px-3 py-2"
            min={0}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Interval Minutes</label>
          <input
            type="number"
            name="intervalMinutes"
            defaultValue={initialValues?.intervalMinutes ?? ""}
            className="w-full rounded-lg border px-3 py-2"
            min={0}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Priority</label>
          <input
            type="number"
            name="priority"
            defaultValue={initialValues?.priority ?? 0}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Random Weight</label>
          <input
            type="number"
            name="randomWeight"
            defaultValue={initialValues?.randomWeight ?? 100}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Allowed Profiles (comma separated)
          </label>
          <input
            name="allowedProfiles"
            defaultValue={(initialValues?.allowedProfiles ?? []).join(", ")}
            className="w-full rounded-lg border px-3 py-2"
            placeholder={profileOptions.join(", ")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Blocked Profiles (comma separated)
          </label>
          <input
            name="blockedProfiles"
            defaultValue={(initialValues?.blockedProfiles ?? []).join(", ")}
            className="w-full rounded-lg border px-3 py-2"
            placeholder={profileOptions.join(", ")}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initialValues?.active ?? true}
        />
        Active
      </label>

      <div>
        <button
          type="submit"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
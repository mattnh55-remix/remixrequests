"use client";

import { saveInterstitialAsset } from "@/app/admin/[location]/interstitials/actions";

export function InterstitialAssetForm({
  locationId,
  initialValues,
  submitLabel = "Save Interstitial",
}: any) {
  return (
    <form action={saveInterstitialAsset} className="space-y-6">
      <input type="hidden" name="id" defaultValue={initialValues?.id ?? ""} />
      <input type="hidden" name="locationId" value={locationId} />

      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400">IDENTITY</h3>

          <input
            name="name"
            defaultValue={initialValues?.name ?? ""}
            placeholder="Request Block Intro"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
            required
          />

          <input
            name="fileUrl"
            defaultValue={initialValues?.fileUrl ?? ""}
            placeholder="https://..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
            required
          />

          <input
            name="category"
            defaultValue={initialValues?.category ?? ""}
            placeholder="CATEGORY"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400">BEHAVIOR</h3>

          <input
            name="scheduleMode"
            defaultValue={initialValues?.scheduleMode ?? ""}
            placeholder="SCHEDULE MODE"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
          />

          <input
            type="number"
            name="durationSec"
            defaultValue={initialValues?.durationSec ?? ""}
            placeholder="Duration (sec)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
          />

          <input
            type="number"
            name="intervalMinutes"
            defaultValue={initialValues?.intervalMinutes ?? ""}
            placeholder="Interval Minutes"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
          />

          <input
            type="number"
            name="priority"
            defaultValue={initialValues?.priority ?? 0}
            placeholder="Priority"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
          />

          <input
            type="number"
            name="randomWeight"
            defaultValue={initialValues?.randomWeight ?? 100}
            placeholder="Weight"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* PROFILES */}
      <div className="grid md:grid-cols-2 gap-6">
        <input
          name="allowedProfiles"
          defaultValue={(initialValues?.allowedProfiles ?? []).join(", ")}
          placeholder="Allowed Profiles"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
        />

        <input
          name="blockedProfiles"
          defaultValue={(initialValues?.blockedProfiles ?? []).join(", ")}
          placeholder="Blocked Profiles"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
        />
      </div>

      {/* ACTIVE */}
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="active" defaultChecked />
        Active
      </label>

      {/* SUBMIT */}
      <button className="bg-amber-400 text-black px-4 py-2 rounded-lg font-medium">
        {submitLabel}
      </button>
    </form>
  );
}
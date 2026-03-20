"use client";

import { useState } from "react";
import {
  deleteInterstitialAsset,
  toggleInterstitialAsset,
} from "@/app/admin/[location]/interstitials/actions";
import { InterstitialAssetForm } from "@/components/admin/interstitials/interstitial-asset-form";

type AssetRow = {
  id: string;
  locationId: string;
  name: string;
  category: string;
  fileUrl: string;
  durationSec: number | null;
  active: boolean;
  priority: number;
  randomWeight: number;
  scheduleMode: string;
  intervalMinutes: number | null;
  allowedProfiles: string[];
  blockedProfiles: string[];
};

export function InterstitialAssetsTable({
  locationId,
  assets,
  categoryOptions,
  scheduleOptions,
  profileOptions,
}: {
  locationId: string;
  assets: AssetRow[];
  categoryOptions: string[];
  scheduleOptions: string[];
  profileOptions: string[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!assets.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-gray-600">
        No interstitial assets yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assets.map((asset) => {
        const editing = editingId === asset.id;

        return (
          <div key={asset.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{asset.name}</h3>

                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      asset.active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {asset.active ? "ACTIVE" : "INACTIVE"}
                  </span>

                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    {asset.category}
                  </span>

                  <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                    {asset.scheduleMode}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  Duration: {asset.durationSec ?? "—"} sec · Priority: {asset.priority} · Weight:{" "}
                  {asset.randomWeight}
                  {asset.intervalMinutes ? ` · Every ${asset.intervalMinutes} min` : ""}
                </div>

                <div className="break-all text-sm text-gray-600">{asset.fileUrl}</div>

                <div className="text-xs text-gray-500">
                  Allowed: {asset.allowedProfiles.length ? asset.allowedProfiles.join(", ") : "All"}
                  {" · "}
                  Blocked: {asset.blockedProfiles.length ? asset.blockedProfiles.join(", ") : "None"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={toggleInterstitialAsset}>
                  <input type="hidden" name="id" value={asset.id} />
                  <input type="hidden" name="locationId" value={locationId} />
                  <input type="hidden" name="nextActive" value={asset.active ? "false" : "true"} />
                  <button
                    type="submit"
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                  >
                    {asset.active ? "Deactivate" : "Activate"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setEditingId(editing ? null : asset.id)}
                  className="rounded-lg border px-3 py-2 text-sm font-medium"
                >
                  {editing ? "Close Edit" : "Edit"}
                </button>

                <form
                  action={deleteInterstitialAsset}
                  onSubmit={(e) => {
                    if (!window.confirm(`Delete "${asset.name}"?`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="id" value={asset.id} />
                  <input type="hidden" name="locationId" value={locationId} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>

            {editing ? (
              <div className="mt-4 border-t pt-4">
                <InterstitialAssetForm
                  locationId={locationId}
                  categoryOptions={categoryOptions}
                  scheduleOptions={scheduleOptions}
                  profileOptions={profileOptions}
                  initialValues={asset}
                  submitLabel="Update Interstitial"
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
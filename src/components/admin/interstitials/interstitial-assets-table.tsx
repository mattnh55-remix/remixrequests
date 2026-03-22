"use client";

import { useState } from "react";
import {
  deleteInterstitialAsset,
  toggleInterstitialAsset,
} from "@/app/admin/[location]/interstitials/actions";
import { InterstitialAssetForm } from "./interstitial-asset-form";

export function InterstitialAssetsTable({
  locationId,
  assets,
}: any) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!assets.length) {
    return <div className="text-zinc-500">No assets yet.</div>;
  }

  return (
    <div className="space-y-4">
      {assets.map((asset: any) => {
        const editing = editingId === asset.id;

        return (
          <div
            key={asset.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            {/* HEADER */}
            <div className="flex justify-between">
              <div>
                <div className="font-semibold text-zinc-100">
                  {asset.name}
                </div>

                <div className="text-xs text-zinc-500 mt-1">
                  {asset.category} · {asset.scheduleMode}
                </div>
              </div>

              <div className="flex gap-2">
                <form action={toggleInterstitialAsset}>
                  <input type="hidden" name="id" value={asset.id} />
                  <input type="hidden" name="locationId" value={locationId} />
                  <input
                    type="hidden"
                    name="nextActive"
                    value={asset.active ? "false" : "true"}
                  />
                  <button className="text-xs px-2 py-1 border rounded">
                    {asset.active ? "Deactivate" : "Activate"}
                  </button>
                </form>

                <button
                  onClick={() => setEditingId(editing ? null : asset.id)}
                  className="text-xs px-2 py-1 border rounded"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* META */}
            <div className="text-xs text-zinc-500 mt-2">
              {asset.durationSec ?? "—"} sec · Priority {asset.priority}
            </div>

            {/* EDIT */}
            {editing && (
              <div className="mt-4 border-t border-zinc-800 pt-4">
                <InterstitialAssetForm
                  locationId={locationId}
                  initialValues={asset}
                  submitLabel="Update"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
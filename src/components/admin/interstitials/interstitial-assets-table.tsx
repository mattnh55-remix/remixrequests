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
  previewGifUrl?: string | null;
  iconLabel?: string | null;
  durationSec: number | null;
  notes?: string | null;
  active: boolean;
  manualOnly?: boolean;
  priority: number;
  randomWeight: number;
  allowedProfiles: string[];
  blockedProfiles: string[];
};

function niceCategory(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function InterstitialAssetsTable({
  locationId,
  assets,
  categoryOptions,
  scheduleOptions,
}: {
  locationId: string;
  assets: AssetRow[];
  categoryOptions: string[];
  scheduleOptions?: string[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!assets.length) {
    return <div className="rrEmptyBox">No interstitial assets yet.</div>;
  }

  return (
    <div className="rrAssetList">
      {assets.map((asset) => {
        const editing = editingId === asset.id;

        return (
          <div
            key={asset.id}
            className={`rrAssetCard ${asset.active ? "" : "rrAssetCard--inactive"} ${
              editing ? "rrAssetCard--editing" : ""
            }`}
          >
            <div className="rrAssetHeader">
              <div>
                <div className="rrAssetTitleLine">
                  <div className="rrAssetTitle">{asset.name}</div>

                  <span
                    className={`rrChip ${
                      asset.active ? "rrChip--active" : "rrChip--inactive"
                    }`}
                  >
                    {asset.active ? "Active" : "Inactive"}
                  </span>

                  <span className="rrChip rrChip--category">
                    {niceCategory(asset.category)}
                  </span>

                  {asset.manualOnly ? (
                    <span className="rrChip rrChip--schedule">Manual Only</span>
                  ) : null}
                </div>

                <div className="rrAssetSub">
                  Local file: <strong>{asset.fileUrl}</strong>
                  {asset.iconLabel ? (
                    <>
                      {" • "}Tile label: <strong>{asset.iconLabel}</strong>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rrAssetActions">
                <form action={toggleInterstitialAsset}>
                  <input type="hidden" name="id" value={asset.id} />
                  <input type="hidden" name="locationId" value={locationId} />
                  <input
                    type="hidden"
                    name="nextActive"
                    value={asset.active ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="gunmetalBtn gunmetalBtn--warn"
                  >
                    {asset.active ? "Deactivate" : "Activate"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setEditingId(editing ? null : asset.id)}
                  className="gunmetalBtn"
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
                    className="gunmetalBtn gunmetalBtn--danger"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>

            <div className="rrAssetMetaGrid">
              <div className="rrAssetMetaCell">
                <span>Duration</span>
                <strong>
                  {asset.durationSec != null ? `${asset.durationSec} sec` : "—"}
                </strong>
              </div>

              <div className="rrAssetMetaCell">
                <span>Priority</span>
                <strong>{asset.priority}</strong>
              </div>

              <div className="rrAssetMetaCell">
                <span>Weight</span>
                <strong>{asset.randomWeight}</strong>
              </div>

              <div className="rrAssetMetaCell">
                <span>Preview GIF</span>
                <strong>{asset.previewGifUrl?.trim() ? "Configured" : "—"}</strong>
              </div>
            </div>

            {asset.notes?.trim() ? (
              <div className="rrAssetProfiles">
                <strong>Notes:</strong> {asset.notes}
              </div>
            ) : null}

            {editing ? (
              <div className="rrEditWrap">
                <InterstitialAssetForm
                  locationId={locationId}
                  categoryOptions={categoryOptions}
                  scheduleOptions={scheduleOptions}
                  initialValues={asset}
                  submitLabel="Update Asset"
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
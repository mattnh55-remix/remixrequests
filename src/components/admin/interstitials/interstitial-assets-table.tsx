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
    return <div className="rrEmptyBox">No interstitial assets yet.</div>;
  }

  return (
    <div className="rrAssetList">
      {assets.map((asset) => {
        const editing = editingId === asset.id;

        return (
          <div
            key={asset.id}
            className={`rrAssetCard ${asset.active ? "" : "rrAssetCard--inactive"}`}
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
                    {asset.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <span className="rrChip rrChip--category">
                    {asset.category}
                  </span>
                  <span className="rrChip rrChip--schedule">
                    {asset.scheduleMode}
                  </span>
                </div>

                <div className="rrAssetSub">
                  Local file: <strong>{asset.fileUrl}</strong>
                </div>
              </div>

              <div className="rrAssetActions">
                <form action={toggleInterstitialAsset}>
                  <input type="hidden" name="id" value={asset.id} />
                  <input
                    type="hidden"
                    name="locationId"
                    value={locationId}
                  />
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
                  <input
                    type="hidden"
                    name="locationId"
                    value={locationId}
                  />
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
                <span>Interval</span>
                <strong>
                  {asset.intervalMinutes != null
                    ? `Every ${asset.intervalMinutes} min`
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="rrAssetProfiles">
              <strong>Allowed:</strong>{" "}
              {asset.allowedProfiles.length
                ? asset.allowedProfiles.join(", ")
                : "All"}
              {"  •  "}
              <strong>Blocked:</strong>{" "}
              {asset.blockedProfiles.length
                ? asset.blockedProfiles.join(", ")
                : "None"}
            </div>

            {editing ? (
              <div className="rrEditWrap">
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
import { prisma } from "@/lib/prisma";
import { InterstitialAssetForm } from "@/components/admin/interstitials/interstitial-asset-form";
import { InterstitialAssetsTable } from "@/components/admin/interstitials/interstitial-assets-table";

export default async function AdminInterstitialsPage({
  params,
}: {
  params: { location: string };
}) {
  const locationId = params.location;

  const assets = await prisma.interstitialAsset.findMany({
    where: { locationId },
    orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Interstitial Control
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          Manage drops, intros, promos, and rule-driven inserts for{" "}
          <span className="text-zinc-200 font-medium">{locationId}</span>
        </p>
      </div>

      {/* CREATE PANEL */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-200">
          Create New Interstitial
        </h2>

        <p className="text-sm text-zinc-500 mt-1">
          Define playback behavior, targeting, and scheduling rules.
        </p>

        <div className="mt-6">
          <InterstitialAssetForm locationId={locationId} />
        </div>
      </section>

      {/* EXISTING */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">
          Existing Assets
        </h2>

        <InterstitialAssetsTable locationId={locationId} assets={assets} />
      </section>
    </div>
  );
}
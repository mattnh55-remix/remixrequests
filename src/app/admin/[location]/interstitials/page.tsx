import { prisma } from "@/lib/prisma";
import { InterstitialAssetForm } from "@/components/admin/interstitials/interstitial-asset-form";
import { InterstitialAssetsTable } from "@/components/admin/interstitials/interstitial-assets-table";

const CATEGORY_OPTIONS = [
  "REQUEST_SINGLE",
  "REQUEST_BLOCK",
  "BRANDING",
  "RULES",
  "GAME",
  "BIRTHDAY",
  "SAFETY",
  "MANUAL_ONLY",
] as const;

const SCHEDULE_OPTIONS = [
  "NONE",
  "INTERVAL_MINUTES",
  "TOP_OF_HOUR_WINDOW",
  "ONCE_PER_SESSION",
  "MANUAL_ONLY",
] as const;

const PROFILE_OPTIONS = [
  "FAMILY",
  "ADULT",
  "BIRTHDAY",
  "SCHOOL",
  "PRIVATE_EVENT",
  "GENERAL",
] as const;

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
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Interstitial Assets</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage backend-driven drops, branding inserts, rules announcements, and
          request intros for <span className="font-medium">{locationId}</span>.
        </p>
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Create New Interstitial</h2>
        <p className="mt-1 text-sm text-gray-600">
          Start with URL-based assets first. You can replace this with real storage upload next.
        </p>

        <div className="mt-4">
          <InterstitialAssetForm
            locationId={locationId}
            categoryOptions={[...CATEGORY_OPTIONS]}
            scheduleOptions={[...SCHEDULE_OPTIONS]}
            profileOptions={[...PROFILE_OPTIONS]}
          />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Existing Assets</h2>
          <p className="mt-1 text-sm text-gray-600">
            Edit, activate/deactivate, or remove assets. These are backend-managed and
            not part of the draggable song queue.
          </p>
        </div>

        <InterstitialAssetsTable
          locationId={locationId}
          assets={assets}
          categoryOptions={[...CATEGORY_OPTIONS]}
          scheduleOptions={[...SCHEDULE_OPTIONS]}
          profileOptions={[...PROFILE_OPTIONS]}
        />
      </section>
    </div>
  );
}
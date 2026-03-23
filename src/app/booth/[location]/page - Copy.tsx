import BoothLayout from "@/components/booth/BoothLayout";

export default async function BoothPage({ params }: { params: Promise<{ location: string }> }) {
  const { location } = await params;
  return <BoothLayout location={location} />;
}

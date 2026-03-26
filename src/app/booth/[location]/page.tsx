import BoothLayout from "@/components/booth/BoothLayout";

export default function BoothPage({ params }: { params: { location: string } }) {
  return <BoothLayout location={params.location} />;
}

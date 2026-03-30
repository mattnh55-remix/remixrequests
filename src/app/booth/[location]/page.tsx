import BoothLayout from "@/components/booth/BoothLayout";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function BoothPage({ params }: { params: { location: string } }) {
  const token = cookies().get("rm_admin")?.value;

  if (!token) {
    redirect(
      `/admin/${params.location}?next=${encodeURIComponent(`/booth/${params.location}`)}`
    );
  }

  return <BoothLayout location={params.location} />;
}
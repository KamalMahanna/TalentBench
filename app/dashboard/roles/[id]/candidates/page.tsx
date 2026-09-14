import { redirect } from "next/navigation";

export default async function RoleCandidatesRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/jobs/${id}`);
}


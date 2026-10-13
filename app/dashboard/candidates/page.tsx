import { redirect } from "next/navigation";

export default function CandidatesPoolRedirect() {
  redirect("/dashboard/jobs");
}

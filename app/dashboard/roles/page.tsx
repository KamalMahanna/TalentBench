import { redirect } from "next/navigation";

export default function RolesRedirect() {
  redirect("/dashboard/jobs");
}


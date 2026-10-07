import { redirect } from "next/navigation";

export default function LegacyAlertRoute() {
  redirect("/controller/alert?view=maintenance");
}

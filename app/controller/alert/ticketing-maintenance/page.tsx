import { redirect } from "next/navigation";

export default function ControllerAlertLegacyRoute() {
  redirect("/controller/alert?view=maintenance");
}

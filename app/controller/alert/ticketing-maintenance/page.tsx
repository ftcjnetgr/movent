import { redirect } from "next/navigation";

export default function ControllerMaintenanceAlertRedirect() {
  redirect("/controller/alert?view=maintenance");
}

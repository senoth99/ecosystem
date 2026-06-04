import { redirect } from "next/navigation";
import { ecosystemLoginUrl, appBasePath } from "@/lib/ecosystem-gate";

export default function TelegramLoginRedirect() {
  redirect(ecosystemLoginUrl(`${appBasePath()}/`));
}

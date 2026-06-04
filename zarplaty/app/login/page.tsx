import { redirect } from "next/navigation";
import { ecosystemLoginUrl, appBasePath } from "@/lib/ecosystem-gate";

export default function LoginRedirect() {
  redirect(ecosystemLoginUrl(`${appBasePath()}/employees`));
}

import { redirect } from "next/navigation";
import { getOptionalTenantContext } from "@/lib/tenant";

export default async function Home() {
  const ctx = await getOptionalTenantContext();
  redirect(ctx ? "/dashboard" : "/login");
}

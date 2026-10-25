import { redirect } from "next/navigation";
import { createClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export async function getAdminAccess({ lang = "zh", redirectTo = "/" } = {}) {
  if (!hasSupabaseServerConfig()) {
    return { allowed: false, reason: "missing-config" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    const params = new URLSearchParams({ redirectTo, lang });
    redirect(`/login?${params.toString()}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { allowed: false, reason: "not-admin" };
  }

  return { allowed: true, user: userData.user, profile };
}

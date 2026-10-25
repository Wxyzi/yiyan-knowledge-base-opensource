import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safeRedirect";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const lang = requestUrl.searchParams.get("lang") || "zh";
  const flow = requestUrl.searchParams.get("flow") || "";
  const redirectTo = safeRedirectPath(requestUrl.searchParams.get("redirectTo") || "/");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
    }
  }

  const loginUrl = new URL(flow === "recovery" ? "/forgot-password" : "/login", requestUrl.origin);
  loginUrl.searchParams.set("redirectTo", redirectTo);
  loginUrl.searchParams.set("lang", lang);
  loginUrl.searchParams.set("message", flow === "recovery" ? "reset-error" : "confirm-error");

  return NextResponse.redirect(loginUrl);
}

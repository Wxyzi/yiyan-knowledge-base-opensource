import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAuthCookieName } from "@/lib/supabase/config";
import { isDemoRequestAllowed } from "@/lib/demoAccess";

const publicPaths = new Set(["/login", "/forgot-password", "/auth/callback", "/privacy"]);
const publicApiPaths = new Set(["/api/article-views", "/api/ai-search", "/api/ai-history", "/api/discussion-activity"]);

function isPublicPath(pathname) {
  return publicPaths.has(pathname) || publicApiPaths.has(pathname);
}

function buildLoginRedirect(request) {
  const loginUrl = request.nextUrl.clone();
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const lang = request.nextUrl.searchParams.get("lang") || "zh";

  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("redirectTo", currentPath || "/");
  loginUrl.searchParams.set("lang", lang);

  return loginUrl;
}

export async function updateSession(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!isPublicPath(request.nextUrl.pathname) && !isDemoRequestAllowed(request.nextUrl.pathname, request.method)) {
      return NextResponse.redirect(buildLoginRedirect(request));
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: supabaseAuthCookieName
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { data } = await supabase.auth.getUser();

  if (!data.user && !isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(buildLoginRedirect(request));
  }

  return response;
}

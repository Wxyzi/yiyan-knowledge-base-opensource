import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

const MAX_TEXT_LENGTH = 160;

function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function cleanCoordinate(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Number(number.toFixed(1));
}

function getHeaderIp(headers) {
  const candidates = [
    "cf-connecting-ip",
    "x-real-ip",
    "x-forwarded-for",
    "x-vercel-forwarded-for"
  ];

  for (const name of candidates) {
    const value = headers.get(name);
    if (value) return value.split(",")[0].trim();
  }

  return "";
}

function maskIpAddress(value) {
  const ip = String(value || "").trim().replace(/^::ffff:/, "");

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".").map((part) => Number(part));
    if (parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  if (ip.includes(":")) {
    return `${ip.split(":").slice(0, 4).join(":")}::`;
  }

  return "";
}

function hashIpAddress(value) {
  if (!value) return "";
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function detectDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(userAgent) {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return "Safari";
  return "Other";
}

function detectOs(userAgent) {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/iphone|ipad|ios/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/mac os|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Other";
}

function getGeoFromHeaders(headers) {
  const rawCity = headers.get("x-vercel-ip-city") || "";
  let city = rawCity;

  try {
    city = decodeURIComponent(rawCity);
  } catch {
    city = rawCity;
  }

  return {
    country: cleanText(headers.get("x-vercel-ip-country") || "", 80),
    region: cleanText(headers.get("x-vercel-ip-country-region") || "", 80),
    city: cleanText(city, 80)
  };
}

async function getUser() {
  if (!hasSupabaseServerConfig()) {
    return { supabase: null, user: null, error: "missing-config" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { supabase, user: null, error: "not-authenticated" };
  }

  return { supabase, user: data.user, error: null };
}

export async function POST(request) {
  if (process.env.ENABLE_LEARNING_ANALYTICS !== "true") return new NextResponse(null, { status: 204 });
  const { supabase, user, error: userError } = await getUser();

  if (userError === "missing-config") {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const articleSlug = cleanText(body.articleSlug, 120);
  if (!articleSlug) {
    return NextResponse.json({ error: "articleSlug is required." }, { status: 400 });
  }

  const userAgent = cleanText(body.device?.userAgent || request.headers.get("user-agent") || "", 500);
  const rawIp = getHeaderIp(request.headers);
  const maskedIp = maskIpAddress(rawIp);
  const headerGeo = getGeoFromHeaders(request.headers);
  const location = body.location || {};
  const hasBrowserLocation = body.locationConsent === true;
  const latitude = hasBrowserLocation ? cleanCoordinate(location.latitude, -90, 90) : null;
  const longitude = hasBrowserLocation ? cleanCoordinate(location.longitude, -180, 180) : null;
  const browserLocationReady = latitude !== null && longitude !== null;

  const viewPayload = {
    user_id: user.id,
    article_slug: articleSlug,
    article_title: cleanText(body.articleTitle, 200),
    category: cleanText(body.category, 80),
    device_type: detectDeviceType(userAgent),
    browser_name: detectBrowser(userAgent),
    os_name: detectOs(userAgent),
    timezone: cleanText(body.device?.timezone, 80),
    locale: cleanText(body.device?.locale, 40),
    screen_width: cleanInteger(body.device?.screenWidth, 1, 10000),
    screen_height: cleanInteger(body.device?.screenHeight, 1, 10000),
    ip_address: maskedIp,
    ip_hash: hashIpAddress(rawIp),
    country: headerGeo.country,
    region: headerGeo.region,
    city: headerGeo.city,
    latitude,
    longitude,
    location_accuracy_m: browserLocationReady
      ? cleanInteger(location.accuracy, 0, 100000)
      : null,
    location_source: browserLocationReady
      ? "browser"
      : headerGeo.country || headerGeo.region || headerGeo.city
        ? "ip"
        : "none"
  };

  const { data, error } = await supabase
    .from("article_views")
    .insert(viewPayload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, viewId: data.id });
}

export async function PATCH(request) {
  const { supabase, user, error: userError } = await getUser();

  if (userError === "missing-config") {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const viewId = cleanText(body.viewId, 80);
  const latitude = cleanCoordinate(body.location?.latitude, -90, 90);
  const longitude = cleanCoordinate(body.location?.longitude, -180, 180);

  if (!viewId || latitude === null || longitude === null || body.locationConsent !== true) {
    return NextResponse.json({ error: "Location consent and valid coordinates are required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("article_views")
    .update({
      latitude,
      longitude,
      location_accuracy_m: cleanInteger(body.location?.accuracy, 0, 100000),
      location_source: "browser"
    })
    .eq("id", viewId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

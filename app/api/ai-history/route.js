import { NextResponse } from "next/server";
import { createClient, hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message, status, code) {
  return NextResponse.json(
    { error: message, code },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

async function getAuthenticatedClient() {
  if (!hasSupabaseServerConfig()) return { supabase: null, user: null };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function DELETE(request) {
  const { supabase, user } = await getAuthenticatedClient();

  if (!supabase) {
    return jsonError("Supabase is not configured.", 503, "SUPABASE_NOT_CONFIGURED");
  }

  if (!user) {
    return jsonError("Authentication required.", 401, "AUTH_REQUIRED");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  let query;

  if (body?.scope === "all") {
    query = supabase
      .from("ai_conversations")
      .delete()
      .eq("user_id", user.id);
  } else {
    const conversationId = String(body?.conversationId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) {
      return jsonError("A valid conversation ID is required.", 400, "INVALID_CONVERSATION_ID");
    }

    query = supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", user.id);
  }

  const { data, error } = await query.select("id");
  if (error) {
    console.error("AI history deletion failed", { code: error.code, message: error.message });
    return jsonError("The AI conversation could not be deleted.", 500, "CONVERSATION_DELETE_FAILED");
  }

  return NextResponse.json(
    { deleted: data?.length || 0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}

import { NextResponse } from "next/server";
import { getAiProviderStatus } from "@/lib/ai/config";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before checking AI status." }, { status: 401 });
  }

  const status = getAiProviderStatus();
  return NextResponse.json({
    mode: status.mode,
    requestedProvider: status.requestedProvider,
    configured: status.configured,
    missing: status.missing,
    label: status.label,
    detail: status.detail,
  });
}

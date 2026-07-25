import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function minutesField(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(Math.max(value, 0), 720) : 0;
}

async function ensureWorkspace(supabase: Awaited<ReturnType<typeof createClient>>, ownerId: string) {
  const { data: existingWorkspace, error: lookupError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (lookupError) return { workspaceId: null, error: lookupError };
  if (existingWorkspace) return { workspaceId: existingWorkspace.id as string, error: null };

  const { data: workspace, error: createError } = await supabase
    .from("workspaces")
    .insert({ owner_id: ownerId })
    .select("id")
    .single();
  return { workspaceId: workspace?.id as string | undefined ?? null, error: createError };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before saving availability." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The availability details were incomplete. Please try again." }, { status: 400 });
  }

  const rawRules = Array.isArray(body.rules) ? body.rules : [];
  const rules = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const matchingRule = rawRules.find((rule) => typeof rule === "object" && rule && "dayOfWeek" in rule && rule.dayOfWeek === dayOfWeek) as Record<string, unknown> | undefined;
    return { dayOfWeek, minutesAvailable: minutesField(matchingRule?.minutesAvailable) };
  });

  const { workspaceId, error } = await ensureWorkspace(supabase, user.id);
  if (error || !workspaceId) return NextResponse.json({ error: "We couldn't prepare your workspace." }, { status: 500 });

  const { data, error: upsertError } = await supabase
    .from("study_availability_rules")
    .upsert(rules.map((rule) => ({ workspace_id: workspaceId, day_of_week: rule.dayOfWeek, minutes_available: rule.minutesAvailable })), { onConflict: "workspace_id,day_of_week" })
    .select("id, day_of_week, minutes_available")
    .order("day_of_week", { ascending: true });
  if (upsertError) return NextResponse.json({ error: "We couldn't save your availability." }, { status: 500 });

  return NextResponse.json({
    availability: (data ?? []).map((rule) => ({ id: rule.id, dayOfWeek: rule.day_of_week, minutesAvailable: rule.minutes_available })),
  });
}

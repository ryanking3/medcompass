import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StudyPlanBlockStatus } from "@/components/types";

const statuses: StudyPlanBlockStatus[] = ["planned", "done", "skipped"];

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return asArray(value)[0] ?? null;
}

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before updating a study block." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The study block details were incomplete. Please try again." }, { status: 400 });
  }

  const { blockId } = await params;
  const status = textField(body.status, 20) as StudyPlanBlockStatus;
  if (!statuses.includes(status)) return NextResponse.json({ error: "Choose a valid study block status." }, { status: 400 });

  const { data: block, error } = await supabase
    .from("study_plan_blocks")
    .update({ status })
    .eq("id", blockId)
    .select("id, exam_id, topic_id, starts_on, duration_minutes, title, status, topics(id, name)")
    .single();
  if (error || !block) return NextResponse.json({ error: "We couldn't update that study block." }, { status: 500 });

  return NextResponse.json({
    block: {
      id: block.id,
      examId: block.exam_id,
      topicId: block.topic_id,
      topicName: firstRelation(block.topics)?.name ?? "Study topic",
      startsOn: block.starts_on,
      durationMinutes: block.duration_minutes,
      title: block.title,
      status: block.status,
    },
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ExamTopicRow = {
  topic_id: string;
  weight: number;
  confidence: number;
  topics: { id: string; name: string } | Array<{ id: string; name: string }> | null;
};

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

function minutesField(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(Math.max(value, 0), 720) : 0;
}

function availabilityFromBody(value: unknown) {
  if (!Array.isArray(value)) return null;
  const rules = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const matchingRule = value.find((rule) => typeof rule === "object" && rule && "dayOfWeek" in rule && rule.dayOfWeek === dayOfWeek) as Record<string, unknown> | undefined;
    return { dayOfWeek, minutesAvailable: minutesField(matchingRule?.minutesAvailable) };
  });
  return rules.some((rule) => rule.minutesAvailable > 0) ? rules : null;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before generating a study plan." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The planner details were incomplete. Please try again." }, { status: 400 });
  }

  const examId = textField(body.examId, 100);
  if (!examId) return NextResponse.json({ error: "Choose an exam before generating a plan." }, { status: 400 });

  const { data: exam, error: examError } = await supabase
    .from("study_exams")
    .select("id, workspace_id, title, exam_date, target_minutes")
    .eq("id", examId)
    .maybeSingle();
  if (examError || !exam) return NextResponse.json({ error: "We couldn't find that exam in your workspace." }, { status: 404 });

  const { data: topicRows, error: topicsError } = await supabase
    .from("study_exam_topics")
    .select("topic_id, weight, confidence, topics(id, name)")
    .eq("exam_id", exam.id)
    .returns<ExamTopicRow[]>();
  if (topicsError || !topicRows?.length) return NextResponse.json({ error: "Add topics to this exam before generating a plan." }, { status: 400 });

  const availabilityFromRequest = availabilityFromBody(body.availability);
  if (availabilityFromRequest) {
    const { error: upsertAvailabilityError } = await supabase
      .from("study_availability_rules")
      .upsert(availabilityFromRequest.map((rule) => ({ workspace_id: exam.workspace_id, day_of_week: rule.dayOfWeek, minutes_available: rule.minutesAvailable })), { onConflict: "workspace_id,day_of_week" });
    if (upsertAvailabilityError) return NextResponse.json({ error: "We couldn't save your weekly availability before generating the plan." }, { status: 500 });
  }

  const { data: savedAvailabilityRows, error: availabilityError } = await supabase
    .from("study_availability_rules")
    .select("day_of_week, minutes_available")
    .eq("workspace_id", exam.workspace_id)
    .order("day_of_week", { ascending: true });
  if (availabilityError) return NextResponse.json({ error: "We couldn't read your weekly availability." }, { status: 500 });

  const availabilityByDay = new Map((savedAvailabilityRows ?? []).map((rule) => [rule.day_of_week, rule.minutes_available]));
  const hasAvailability = Array.from(availabilityByDay.values()).some((minutes) => minutes > 0);
  if (!hasAvailability) return NextResponse.json({ error: "Add some weekly availability before generating a plan." }, { status: 400 });

  const today = parseDate(toDateString(new Date()));
  const examDate = parseDate(exam.exam_date);
  if (examDate <= today) return NextResponse.json({ error: "Choose an exam date from tomorrow onwards before generating a plan." }, { status: 400 });

  const studyDays: Array<{ date: string; minutesAvailable: number }> = [];
  for (let cursor = today; cursor < examDate; cursor = addDays(cursor, 1)) {
    const minutesAvailable = availabilityByDay.get(cursor.getUTCDay()) ?? 0;
    if (minutesAvailable > 0) studyDays.push({ date: toDateString(cursor), minutesAvailable });
  }
  if (!studyDays.length) return NextResponse.json({ error: "Your availability has no study time before this exam." }, { status: 400 });

  const topicQueue = topicRows.flatMap((row) => {
    const priority = Math.max(1, row.weight + (5 - row.confidence));
    return Array.from({ length: priority }, () => ({ id: row.topic_id, name: firstRelation(row.topics)?.name ?? "Study topic" }));
  });

  let remainingMinutes = exam.target_minutes;
  let topicIndex = 0;
  const blocks: Array<{ workspace_id: string; exam_id: string; topic_id: string; starts_on: string; duration_minutes: number; title: string }> = [];

  for (const day of studyDays) {
    let dayRemaining = day.minutesAvailable;
    while (dayRemaining >= 30 && remainingMinutes > 0) {
      const topic = topicQueue[topicIndex % topicQueue.length];
      const duration = Math.min(120, dayRemaining, remainingMinutes);
      if (duration < 30 && blocks.length > 0) {
        blocks[blocks.length - 1].duration_minutes += duration;
        remainingMinutes = 0;
        break;
      }
      blocks.push({
        workspace_id: exam.workspace_id,
        exam_id: exam.id,
        topic_id: topic.id,
        starts_on: day.date,
        duration_minutes: duration,
        title: `Study ${topic.name}`,
      });
      dayRemaining -= duration;
      remainingMinutes -= duration;
      topicIndex += 1;
    }
    if (remainingMinutes <= 0) break;
  }

  const { error: deleteError } = await supabase.from("study_plan_blocks").delete().eq("exam_id", exam.id);
  if (deleteError) return NextResponse.json({ error: "We couldn't refresh the old plan for this exam." }, { status: 500 });

  if (!blocks.length) return NextResponse.json({ blocks: [] });

  const { data: insertedBlocks, error: insertError } = await supabase
    .from("study_plan_blocks")
    .insert(blocks)
    .select("id, exam_id, topic_id, starts_on, duration_minutes, title, status, topics(id, name)")
    .order("starts_on", { ascending: true });
  if (insertError) return NextResponse.json({ error: "We couldn't generate the study plan." }, { status: 500 });

  return NextResponse.json({
    blocks: (insertedBlocks ?? []).map((block) => ({
      id: block.id,
      examId: block.exam_id,
      topicId: block.topic_id,
      topicName: firstRelation(block.topics)?.name ?? "Study topic",
      startsOn: block.starts_on,
      durationMinutes: block.duration_minutes,
      title: block.title,
      status: block.status,
    })),
    scheduledMinutes: blocks.reduce((total, block) => total + block.duration_minutes, 0),
  });
}

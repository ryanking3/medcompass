import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function dateField(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function minutesField(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(Math.max(value, 30), 60000) : 600;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before editing an exam." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The exam details were incomplete. Please try again." }, { status: 400 });
  }

  const title = textField(body.title, 180);
  const examDate = dateField(body.examDate);
  const courseId = textField(body.courseId, 100) || null;
  const notes = textField(body.notes, 2000) || null;
  const targetMinutes = minutesField(body.targetMinutes);
  const topicIds = Array.isArray(body.topicIds) ? body.topicIds.map((topicId) => textField(topicId, 100)).filter(Boolean) : [];

  if (!title || !examDate) return NextResponse.json({ error: "Give the exam a title and date." }, { status: 400 });
  if (parseDate(examDate) <= parseDate(toDateString(new Date()))) return NextResponse.json({ error: "Choose an exam date from tomorrow onwards." }, { status: 400 });
  if (!topicIds.length) return NextResponse.json({ error: "Choose at least one topic for this exam." }, { status: 400 });

  const { data: existingExam, error: existingExamError } = await supabase
    .from("study_exams")
    .select("id, workspace_id")
    .eq("id", examId)
    .maybeSingle();
  if (existingExamError || !existingExam) return NextResponse.json({ error: "We couldn't find that exam in your workspace." }, { status: 404 });

  const { data: topics, error: topicError } = await supabase
    .from("topics")
    .select("id, name, workspace_id")
    .in("id", topicIds);
  if (topicError || !topics?.length) return NextResponse.json({ error: "We couldn't find those topics in your workspace." }, { status: 404 });

  const everyTopicMatchesWorkspace = topics.length === topicIds.length && topics.every((topic) => topic.workspace_id === existingExam.workspace_id);
  if (!everyTopicMatchesWorkspace) return NextResponse.json({ error: "Choose topics from the same workspace as this exam." }, { status: 400 });

  if (courseId) {
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("workspace_id", existingExam.workspace_id)
      .maybeSingle();
    if (courseError || !course) return NextResponse.json({ error: "We couldn't find that course in your workspace." }, { status: 404 });
  }

  const { data: exam, error: examError } = await supabase
    .from("study_exams")
    .update({ course_id: courseId, title, exam_date: examDate, target_minutes: targetMinutes, notes })
    .eq("id", examId)
    .select("id, course_id, title, exam_date, target_minutes, notes")
    .single();
  if (examError || !exam) return NextResponse.json({ error: "We couldn't update that exam. Please try again." }, { status: 500 });

  const { error: deleteLinkError } = await supabase.from("study_exam_topics").delete().eq("exam_id", exam.id);
  if (deleteLinkError) return NextResponse.json({ error: "We couldn't refresh this exam's topic list." }, { status: 500 });

  const links = topics.map((topic) => ({ workspace_id: existingExam.workspace_id, exam_id: exam.id, topic_id: topic.id }));
  const { error: linkError } = await supabase.from("study_exam_topics").insert(links);
  if (linkError) return NextResponse.json({ error: "We couldn't link those topics to the exam." }, { status: 500 });

  return NextResponse.json({
    exam: {
      id: exam.id,
      courseId: exam.course_id,
      title: exam.title,
      examDate: exam.exam_date,
      targetMinutes: exam.target_minutes,
      notes: exam.notes,
      topics: topics.map((topic) => ({ topicId: topic.id, topicName: topic.name, weight: 1, confidence: 3 })),
    },
  });
}

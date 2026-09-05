import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function dateTimeField(value: unknown) {
  if (typeof value !== "string") return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function textAnswers(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, answer]) => [key, answer.trim().slice(0, 20_000)])
      .filter(([, answer]) => answer.length > 0),
  );
}

function questionIds(value: unknown) {
  if (!Array.isArray(value)) return new Set<string>();
  return new Set(value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const id = (entry as Record<string, unknown>).id;
    return typeof id === "string" ? [id] : [];
  }));
}

function toAttempt(row: {
  id: string;
  practice_exam_id: string;
  answered_count: number;
  question_count: number;
  duration_seconds: number;
  completed_at: string;
  answers: Record<string, string>;
}) {
  return {
    id: row.id,
    practiceExamId: row.practice_exam_id,
    answeredCount: row.answered_count,
    questionCount: row.question_count,
    durationSeconds: row.duration_seconds,
    completedAt: row.completed_at,
    answers: row.answers,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ practiceExamId: string }> }) {
  const { practiceExamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before saving an attempt." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The attempt details were incomplete. Please try again." }, { status: 400 });
  }

  const { data: practiceExam, error: practiceExamError } = await supabase
    .from("practice_exams")
    .select("id, workspace_id, questions")
    .eq("id", practiceExamId)
    .maybeSingle();

  if (practiceExamError || !practiceExam) return NextResponse.json({ error: "We couldn't find that practice paper." }, { status: 404 });

  const validQuestionIds = questionIds(practiceExam.questions);
  const submittedAnswers = textAnswers(body.answers);
  const answers = Object.fromEntries(Object.entries(submittedAnswers).filter(([questionId]) => validQuestionIds.has(questionId)));
  const startedAt = dateTimeField(body.startedAt);
  const completedAt = new Date();
  const durationSeconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));

  const { data: attempt, error: attemptError } = await supabase
    .from("practice_exam_attempts")
    .insert({
      workspace_id: practiceExam.workspace_id,
      practice_exam_id: practiceExam.id,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_seconds: durationSeconds,
      answered_count: Object.keys(answers).length,
      question_count: validQuestionIds.size,
      answers,
    })
    .select("id, practice_exam_id, answered_count, question_count, duration_seconds, completed_at, answers")
    .single();

  if (attemptError || !attempt) return NextResponse.json({ error: "We couldn't save that attempt. Please try again." }, { status: 500 });

  return NextResponse.json({ attempt: toAttempt(attempt) }, { status: 201 });
}

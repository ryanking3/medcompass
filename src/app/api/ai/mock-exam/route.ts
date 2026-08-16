import { NextResponse } from "next/server";
import { fakeMockExamResponse } from "@/lib/ai/fake-provider";
import type { MockExamFormat } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";

const formats = ["mcq", "written", "mixed"] as const;

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function integerField(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before generating a mock exam." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The mock exam request was incomplete. Please try again." }, { status: 400 });
  }

  const examId = textField(body.examId, 100);
  const format = formats.includes(body.format as MockExamFormat) ? body.format as MockExamFormat : "mixed";
  const questionCount = integerField(body.questionCount, 6, 1, 20);
  if (!examId) return NextResponse.json({ error: "Choose an exam first." }, { status: 400 });

  const { data: exam, error: examError } = await supabase
    .from("study_exams")
    .select("id, title, workspace_id, study_exam_topics(weight, confidence, topics(id, name))")
    .eq("id", examId)
    .maybeSingle();
  if (examError || !exam) return NextResponse.json({ error: "We couldn't find that exam in your workspace." }, { status: 404 });

  const topicLinks = Array.isArray(exam.study_exam_topics) ? exam.study_exam_topics : [];
  const topics = topicLinks.map((link) => {
    const topic = Array.isArray(link.topics) ? link.topics[0] : link.topics;
    return {
      topicName: topic?.name ?? "Untitled topic",
      weight: link.weight,
      confidence: link.confidence,
    };
  });

  return NextResponse.json(fakeMockExamResponse({
    examTitle: exam.title,
    format,
    questionCount,
    topics,
  }));
}

import { NextResponse } from "next/server";
import { fakeSourceStudyResponse } from "@/lib/ai/fake-provider";
import type { AiSourceAction } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";

const actions = ["ask", "note", "flashcard"] as const;

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function pageNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 1;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before using AI study tools." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The AI request was incomplete. Please try again." }, { status: 400 });
  }

  const action = actions.includes(body.action as AiSourceAction) ? body.action as AiSourceAction : null;
  const documentId = textField(body.documentId, 100);
  const topicId = textField(body.topicId, 100);
  const selectedText = textField(body.selectedText, 12_000);
  const question = textField(body.question, 1_000);
  const page = pageNumber(body.page);

  if (!action || !documentId) return NextResponse.json({ error: "Choose an AI action and source." }, { status: 400 });
  if (action === "ask" && !question) return NextResponse.json({ error: "Ask a question before running AI." }, { status: 400 });

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, workspace_id, title")
    .eq("id", documentId)
    .maybeSingle();
  if (documentError || !document) return NextResponse.json({ error: "We couldn't find that source in your workspace." }, { status: 404 });

  let topicName = "";
  if (topicId) {
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("id, name, workspace_id")
      .eq("id", topicId)
      .maybeSingle();
    if (topicError || !topic || topic.workspace_id !== document.workspace_id) return NextResponse.json({ error: "Choose a topic linked to this workspace." }, { status: 400 });
    topicName = topic.name;
  }

  return NextResponse.json(fakeSourceStudyResponse({
    action,
    question,
    selectedText,
    documentId: document.id,
    documentTitle: document.title,
    topicId: topicId || undefined,
    topicName: topicName || undefined,
    page,
  }));
}

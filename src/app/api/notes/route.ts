import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before creating a note." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The note details were incomplete. Please try again." }, { status: 400 });
  }

  const topicId = textField(body.topicId, 100);
  const title = textField(body.title, 180) || "Untitled note";
  const noteBody = textField(body.body, 50_000);
  if (!topicId) return NextResponse.json({ error: "Choose a topic before creating a note." }, { status: 400 });

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, workspace_id")
    .eq("id", topicId)
    .maybeSingle();
  if (topicError || !topic) return NextResponse.json({ error: "We couldn't find that topic in your workspace." }, { status: 404 });

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .insert({ workspace_id: topic.workspace_id, topic_id: topic.id, author_id: user.id, title, body: noteBody })
    .select("id, topic_id, title, body, updated_at")
    .single();
  if (noteError || !note) return NextResponse.json({ error: "We couldn't create that note. Please try again." }, { status: 500 });

  return NextResponse.json({ note: { id: note.id, topicId: note.topic_id, title: note.title, body: note.body, updatedAt: note.updated_at, citations: [] } }, { status: 201 });
}

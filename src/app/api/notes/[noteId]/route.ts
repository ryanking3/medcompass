import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before saving a note." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The note details were incomplete. Please try again." }, { status: 400 });
  }

  const title = textField(body.title, 180);
  const noteBody = textField(body.body, 50_000);
  if (!title) return NextResponse.json({ error: "Give your note a title before saving." }, { status: 400 });

  const { data: note, error } = await supabase
    .from("notes")
    .update({ title, body: noteBody })
    .eq("id", noteId)
    .select("id, topic_id, title, body, updated_at")
    .single();
  if (error || !note) return NextResponse.json({ error: "We couldn't save that note. Please try again." }, { status: 500 });

  return NextResponse.json({ note: { id: note.id, topicId: note.topic_id, title: note.title, body: note.body, updatedAt: note.updated_at } });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function pageNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before adding a citation." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The citation details were incomplete. Please try again." }, { status: 400 });
  }

  const documentId = textField(body.documentId, 100);
  const pageStart = pageNumber(body.pageStart);
  const pageEnd = pageNumber(body.pageEnd);
  const excerpt = textField(body.excerpt, 2_000) || null;
  if (!documentId) return NextResponse.json({ error: "Choose a source before adding a citation." }, { status: 400 });
  if (pageStart && pageEnd && pageEnd < pageStart) return NextResponse.json({ error: "The end page must come after the start page." }, { status: 400 });

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id, workspace_id")
    .eq("id", noteId)
    .maybeSingle();
  if (noteError || !note) return NextResponse.json({ error: "We couldn't find that note in your workspace." }, { status: 404 });

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, title")
    .eq("id", documentId)
    .eq("workspace_id", note.workspace_id)
    .maybeSingle();
  if (documentError || !document) return NextResponse.json({ error: "We couldn't find that source in your workspace." }, { status: 404 });

  const { data: citation, error: citationError } = await supabase
    .from("note_citations")
    .insert({ workspace_id: note.workspace_id, note_id: note.id, document_id: document.id, page_start: pageStart, page_end: pageEnd, excerpt })
    .select("id, document_id, page_start, page_end, excerpt")
    .single();
  if (citationError || !citation) return NextResponse.json({ error: "We couldn't add that citation. Please try again." }, { status: 500 });

  return NextResponse.json({ citation: { id: citation.id, documentId: citation.document_id, documentTitle: document.title, pageStart: citation.page_start, pageEnd: citation.page_end, excerpt: citation.excerpt } }, { status: 201 });
}

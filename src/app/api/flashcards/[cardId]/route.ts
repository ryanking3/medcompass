import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const cardKinds = ["basic", "cloze"] as const;

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function pageNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before saving a card." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The card details were incomplete. Please try again." }, { status: 400 });
  }

  const front = textField(body.front, 10_000);
  const back = textField(body.back, 10_000);
  const kind = cardKinds.includes(body.kind as (typeof cardKinds)[number]) ? body.kind as (typeof cardKinds)[number] : "basic";
  const isKept = typeof body.isKept === "boolean" ? body.isKept : false;
  const sourceDocumentId = textField(body.sourceDocumentId, 100) || null;
  const sourcePageStart = pageNumber(body.sourcePageStart);
  const sourcePageEnd = pageNumber(body.sourcePageEnd);
  if (!front || !back) return NextResponse.json({ error: "Fill in both sides of the card before saving." }, { status: 400 });
  if (sourcePageStart && sourcePageEnd && sourcePageEnd < sourcePageStart) return NextResponse.json({ error: "The end page must come after the start page." }, { status: 400 });

  const { data: existingCard, error: existingCardError } = await supabase
    .from("flashcards")
    .select("id, deck_id, workspace_id, flashcard_decks(topic_id)")
    .eq("id", cardId)
    .maybeSingle();
  if (existingCardError || !existingCard) return NextResponse.json({ error: "We couldn't find that card in your workspace." }, { status: 404 });

  let sourceDocumentTitle: string | null = null;
  if (sourceDocumentId) {
    const { data: sourceDocument, error: sourceDocumentError } = await supabase
      .from("documents")
      .select("id, title")
      .eq("id", sourceDocumentId)
      .eq("workspace_id", existingCard.workspace_id)
      .maybeSingle();
    if (sourceDocumentError || !sourceDocument) return NextResponse.json({ error: "We couldn't find that source in your workspace." }, { status: 404 });
    sourceDocumentTitle = sourceDocument.title;
  }

  const { data: card, error: cardError } = await supabase
    .from("flashcards")
    .update({ kind, front, back, is_kept: isKept, source_document_id: sourceDocumentId, source_page_start: sourcePageStart, source_page_end: sourcePageEnd })
    .eq("id", existingCard.id)
    .select("id, deck_id, kind, front, back, is_kept, source_document_id, source_page_start, source_page_end, updated_at")
    .single();
  if (cardError || !card) return NextResponse.json({ error: "We couldn't save that card. Please try again." }, { status: 500 });

  const topicId = firstRelation(existingCard.flashcard_decks)?.topic_id;
  if (!topicId) return NextResponse.json({ error: "This card is missing its topic context." }, { status: 500 });
  return NextResponse.json({ card: { id: card.id, deckId: card.deck_id, topicId, kind: card.kind, front: card.front, back: card.back, isKept: card.is_kept, sourceDocumentId: card.source_document_id, sourceDocumentTitle, sourcePageStart: card.source_page_start, sourcePageEnd: card.source_page_end, updatedAt: card.updated_at } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before deleting a card." }, { status: 401 });

  const { error } = await supabase.from("flashcards").delete().eq("id", cardId);
  if (error) return NextResponse.json({ error: "We couldn't delete that card. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

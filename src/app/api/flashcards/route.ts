import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const cardKinds = ["basic", "cloze"] as const;

function textField(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function pageNumber(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before creating a card." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The card details were incomplete. Please try again." }, { status: 400 });
  }

  const topicId = textField(body.topicId, 100);
  const front = textField(body.front, 10_000);
  const back = textField(body.back, 10_000);
  const kind = cardKinds.includes(body.kind as (typeof cardKinds)[number]) ? body.kind as (typeof cardKinds)[number] : "basic";
  const sourceDocumentId = textField(body.sourceDocumentId, 100) || null;
  const sourcePageStart = pageNumber(body.sourcePageStart);
  const sourcePageEnd = pageNumber(body.sourcePageEnd);
  if (!topicId || !front || !back) return NextResponse.json({ error: "Choose a topic and fill in both sides of the card." }, { status: 400 });
  if (sourcePageStart && sourcePageEnd && sourcePageEnd < sourcePageStart) return NextResponse.json({ error: "The end page must come after the start page." }, { status: 400 });

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, workspace_id, name")
    .eq("id", topicId)
    .maybeSingle();
  if (topicError || !topic) return NextResponse.json({ error: "We couldn't find that topic in your workspace." }, { status: 404 });

  let sourceDocumentTitle: string | null = null;
  if (sourceDocumentId) {
    const { data: sourceDocument, error: sourceDocumentError } = await supabase
      .from("documents")
      .select("id, title")
      .eq("id", sourceDocumentId)
      .eq("workspace_id", topic.workspace_id)
      .maybeSingle();
    if (sourceDocumentError || !sourceDocument) return NextResponse.json({ error: "We couldn't find that source in your workspace." }, { status: 404 });
    sourceDocumentTitle = sourceDocument.title;
  }

  const { data: existingDeck, error: deckLookupError } = await supabase
    .from("flashcard_decks")
    .select("id")
    .eq("topic_id", topic.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (deckLookupError) return NextResponse.json({ error: "We couldn't prepare this topic's card deck." }, { status: 500 });

  let deckId = existingDeck?.id;
  if (!deckId) {
    const { data: deck, error: deckCreateError } = await supabase
      .from("flashcard_decks")
      .insert({ workspace_id: topic.workspace_id, topic_id: topic.id, name: `${topic.name} cards` })
      .select("id")
      .single();
    if (deckCreateError || !deck) return NextResponse.json({ error: "We couldn't create this topic's card deck." }, { status: 500 });
    deckId = deck.id;
  }

  const { data: card, error: cardError } = await supabase
    .from("flashcards")
    .insert({ workspace_id: topic.workspace_id, deck_id: deckId, kind, front, back, is_kept: false, source_document_id: sourceDocumentId, source_page_start: sourcePageStart, source_page_end: sourcePageEnd })
    .select("id, deck_id, kind, front, back, is_kept, source_document_id, source_page_start, source_page_end, updated_at")
    .single();
  if (cardError || !card) return NextResponse.json({ error: "We couldn't create that card. Please try again." }, { status: 500 });

  return NextResponse.json({ card: { id: card.id, deckId: card.deck_id, topicId: topic.id, kind: card.kind, front: card.front, back: card.back, isKept: card.is_kept, sourceDocumentId: card.source_document_id, sourceDocumentTitle, sourcePageStart: card.source_page_start, sourcePageEnd: card.source_page_end, updatedAt: card.updated_at } }, { status: 201 });
}

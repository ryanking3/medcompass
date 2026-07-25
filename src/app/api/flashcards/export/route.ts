import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvField(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before exporting cards." }, { status: 401 });

  const topicId = new URL(request.url).searchParams.get("topicId") ?? "";
  if (!topicId) return NextResponse.json({ error: "Choose a topic before exporting cards." }, { status: 400 });

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, name")
    .eq("id", topicId)
    .maybeSingle();
  if (topicError || !topic) return NextResponse.json({ error: "We couldn't find that topic in your workspace." }, { status: 404 });

  const { data: decks, error: deckError } = await supabase
    .from("flashcard_decks")
    .select("flashcards(kind, front, back, is_kept)")
    .eq("topic_id", topic.id);
  if (deckError) return NextResponse.json({ error: "We couldn't prepare your export. Please try again." }, { status: 500 });

  const cards = (decks ?? []).flatMap((deck) => deck.flashcards ?? []).filter((card) => card.is_kept);
  if (!cards.length) return NextResponse.json({ error: "Keep at least one card before exporting to Anki." }, { status: 400 });

  const tag = `medcompass::${topic.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, "") || "study"}`;
  const rows = cards.map((card) => [card.front, card.back, `${tag} card_type::${card.kind}`].map(csvField).join(","));
  const csv = ["Front,Back,Tags", ...rows].join("\r\n");
  const filename = `${topic.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || "medcompass"}-anki.csv`;

  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
}

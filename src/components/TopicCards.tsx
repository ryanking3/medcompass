"use client";

import { useMemo, useState } from "react";
import type { FlashcardKind, StudyDocument, StudyFlashcard, StudyTopic } from "./types";

type CardDraft = Pick<StudyFlashcard, "kind" | "front" | "back" | "isKept" | "sourceDocumentId" | "sourcePageStart" | "sourcePageEnd">;

type TopicCardsProps = {
  topic: StudyTopic | null;
  cards: StudyFlashcard[];
  documents: StudyDocument[];
  onBack: () => void;
  onCardCreated: (card: StudyFlashcard) => void;
  onCardUpdated: (card: StudyFlashcard) => void;
  onCardDeleted: (cardId: string) => void;
};

export function TopicCards({ topic, cards, documents, onBack, onCardCreated, onCardUpdated, onCardDeleted }: TopicCardsProps) {
  const topicCards = useMemo(() => topic ? cards.filter((card) => card.topicId === topic.id) : [], [cards, topic]);
  const topicDocuments = useMemo(() => topic ? documents.filter((document) => document.linkedTopics.some((linkedTopic) => linkedTopic.id === topic.id)) : [], [documents, topic]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, CardDraft>>({});
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeCardId = topicCards.some((card) => card.id === selectedCardId) ? selectedCardId : topicCards[0]?.id ?? null;
  const selectedCard = topicCards.find((card) => card.id === activeCardId) ?? null;
  const draft = selectedCard ? drafts[selectedCard.id] ?? {
    kind: selectedCard.kind,
    front: selectedCard.front,
    back: selectedCard.back,
    isKept: selectedCard.isKept,
    sourceDocumentId: selectedCard.sourceDocumentId,
    sourcePageStart: selectedCard.sourcePageStart,
    sourcePageEnd: selectedCard.sourcePageEnd,
  } : null;
  const retainedCount = topicCards.filter((card) => card.isKept).length;

  function updateDraft(change: Partial<CardDraft>) {
    if (!selectedCard) return;
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [selectedCard.id]: { ...(currentDrafts[selectedCard.id] ?? draft!), ...change },
    }));
  }

  function clearDraft(cardId: string) {
    setDrafts((currentDrafts) => {
      const remainingDrafts = { ...currentDrafts };
      delete remainingDrafts[cardId];
      return remainingDrafts;
    });
  }

  async function createCard() {
    if (!topic || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: topic.id, kind: "basic", front: "New question", back: "Add your answer", sourceDocumentId: null, sourcePageStart: null, sourcePageEnd: null }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setFeedback(result.error ?? "We couldn't create a card. Please try again.");
      return;
    }
    const card = result.card as StudyFlashcard;
    onCardCreated(card);
    setSelectedCardId(card.id);
  }

  async function saveCard() {
    if (!selectedCard || !draft || !draft.front.trim() || !draft.back.trim() || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    const response = await fetch(`/api/flashcards/${selectedCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setFeedback(result.error ?? "We couldn't save that card. Please try again.");
      return;
    }
    onCardUpdated(result.card as StudyFlashcard);
    clearDraft(selectedCard.id);
    setFeedback("Saved");
  }

  async function deleteCard() {
    if (!selectedCard || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    const response = await fetch(`/api/flashcards/${selectedCard.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setFeedback(result.error ?? "We couldn't delete that card. Please try again.");
      return;
    }
    onCardDeleted(selectedCard.id);
    clearDraft(selectedCard.id);
    setSelectedCardId(null);
  }

  async function exportCards() {
    if (!topic || !retainedCount || isExporting) return;
    setIsExporting(true);
    setFeedback("");
    const response = await fetch(`/api/flashcards/export?topicId=${encodeURIComponent(topic.id)}`);
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setFeedback(result.error ?? "We couldn't export these cards. Please try again.");
      setIsExporting(false);
      return;
    }
    const fileUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `${topic.name}-anki.csv`;
    link.click();
    URL.revokeObjectURL(fileUrl);
    setIsExporting(false);
    setFeedback("CSV downloaded — import it in Anki.");
  }

  if (!topic) {
    return <div className="cards-empty"><p className="eyebrow">Flashcards</p><h1>Choose a topic first</h1><p>Cards remain connected to the topic and sources they came from.</p><button className="button primary" onClick={onBack}>Return to topic</button></div>;
  }

  return <div className="cards-workspace">
    <header className="cards-header"><button className="back-link" onClick={onBack}>← <span>{topic.name}</span></button><div><p className="eyebrow">Topic cards</p><h1>Review and keep the useful ones</h1></div><button className="button primary" onClick={createCard} disabled={isSaving}>+ New card</button></header>
    <div className="cards-layout">
      <aside className="card-list"><p className="eyebrow">{topic.name}</p>{topicCards.length ? topicCards.map((card, index) => <button key={card.id} className={card.id === activeCardId ? "saved-card active" : "saved-card"} onClick={() => setSelectedCardId(card.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{card.front}</strong><small>{card.isKept ? "Kept for Anki" : "Draft card"}</small></div></button>) : <p className="card-list-empty">Create your first card for this topic.</p>}</aside>
      <section className="card-editor">
        {selectedCard && draft ? <><div className="card-toolbar"><span>{feedback || "Edit before keeping"}</span><label className="keep-toggle"><input type="checkbox" checked={draft.isKept} onChange={(event) => updateDraft({ isKept: event.target.checked })} /> Keep for Anki</label><button className="text-button" onClick={saveCard} disabled={!draft.front.trim() || !draft.back.trim() || isSaving}>{isSaving ? "Saving…" : "Save card"}</button></div><div className="card-form-head"><label>Type<select value={draft.kind} onChange={(event) => updateDraft({ kind: event.target.value as FlashcardKind })}><option value="basic">Basic question and answer</option><option value="cloze">Cloze deletion</option></select></label><span>{draft.isKept ? "This card will be included in export." : "Keep it once it is worth revising."}</span></div><label className="card-field"><span>{draft.kind === "cloze" ? "Text with cloze markers" : "Front"}</span><textarea value={draft.front} onChange={(event) => updateDraft({ front: event.target.value })} placeholder={draft.kind === "cloze" ? "e.g. The {{c1::aortic valve}} opens during ventricular ejection." : "Ask one clear question"} /></label><label className="card-field"><span>{draft.kind === "cloze" ? "Extra explanation" : "Back"}</span><textarea value={draft.back} onChange={(event) => updateDraft({ back: event.target.value })} placeholder="Write a concise answer or explanation" /></label><div className="card-actions"><button className="button ghost danger" onClick={deleteCard} disabled={isSaving}>Delete card</button><button className="button dark" onClick={() => updateDraft({ isKept: !draft.isKept })}>{draft.isKept ? "Move to drafts" : "Keep this card"}</button></div></> : <div className="editor-empty"><h2>No card selected</h2><p>Create a card to begin.</p></div>}
      </section>
      <aside className="card-tools"><p className="eyebrow">Source link</p><h2>Keep cards grounded</h2>{selectedCard && draft ? topicDocuments.length ? <><label>Source<select value={draft.sourceDocumentId ?? ""} onChange={(event) => updateDraft({ sourceDocumentId: event.target.value || null })}><option value="">No source link</option>{topicDocuments.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label><div className="page-inputs"><label>Start page<input type="number" min="1" value={draft.sourcePageStart ?? ""} onChange={(event) => updateDraft({ sourcePageStart: event.target.value ? Number(event.target.value) : null })} /></label><label>End page<input type="number" min="1" value={draft.sourcePageEnd ?? ""} onChange={(event) => updateDraft({ sourcePageEnd: event.target.value ? Number(event.target.value) : null })} /></label></div><p className="source-help">Use the exact page where you learned this fact.</p></> : <p className="tool-empty">Upload a PDF and link it to <strong>{topic.name}</strong> to cite it here.</p> : <p className="tool-empty">Create a card before linking a source.</p>}</aside>
    </div>
    <footer className="export-bar"><span><strong>{retainedCount} kept {retainedCount === 1 ? "card" : "cards"}</strong> &nbsp; Export creates a standard CSV for Anki’s import screen.</span><button className="button primary" onClick={exportCards} disabled={!retainedCount || isExporting}>{isExporting ? "Preparing export…" : "Export kept cards →"}</button></footer>
    <style jsx>{`
      .cards-workspace { min-height: 100vh; padding-bottom: 78px; background: #f8f8f4; }.cards-header { height: 128px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 22px 58px; background: #fffefa; border-bottom: 1px solid #dde2df; }.cards-header > div { text-align: center; }.cards-header h1 { margin: 0; font: 29px Georgia, serif; font-weight: 500; letter-spacing: -.5px; }.cards-header .button { justify-self: end; }.cards-layout { min-height: calc(100vh - 206px); display: grid; grid-template-columns: 240px minmax(360px, 1fr) 270px; }.card-list { padding: 24px 16px; border-right: 1px solid #dde2df; background: #f4f6f2; }.card-list-empty, .tool-empty { color: #718078; font-size: 11px; line-height: 1.5; }.saved-card { width: 100%; display: flex; gap: 9px; align-items: flex-start; border: 0; border-radius: 7px; padding: 11px; background: transparent; text-align: left; color: #3e4c4c; }.saved-card:hover { background: #e7ece8; }.saved-card.active { background: #dceadf; }.saved-card > span { color: #84918b; font: 12px Georgia, serif; }.saved-card strong { display: block; max-height: 32px; overflow: hidden; font-size: 11px; line-height: 1.35; }.saved-card small { display: block; margin-top: 4px; color: #718078; font-size: 10px; }.card-editor { padding: 24px clamp(28px, 5vw, 70px); background: #fffefa; }.card-toolbar { display: flex; align-items: center; gap: 15px; color: #78857f; font-size: 11px; padding-bottom: 18px; border-bottom: 1px solid #e8ebe7; }.card-toolbar .text-button { margin-left: auto; }.keep-toggle { display: flex; gap: 5px; align-items: center; color: #36715c; font-weight: 700; }.keep-toggle input { accent-color: #437967; }.card-form-head { display: flex; justify-content: space-between; align-items: end; gap: 15px; margin: 25px 0 18px; color: #78857f; font-size: 10px; }.card-form-head label { display: grid; gap: 5px; color: #64736d; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }.card-form-head select { border: 1px solid #d8ded9; border-radius: 6px; padding: 7px; background: white; color: #354441; font-size: 11px; font-weight: 400; letter-spacing: normal; text-transform: none; }.card-field { display: grid; gap: 8px; margin-bottom: 22px; }.card-field span { color: #6b7a75; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }.card-field textarea { min-height: 124px; width: 100%; resize: vertical; padding: 14px; border: 1px solid #d8ded9; border-radius: 7px; color: #2b3838; background: white; font: 14px/1.55 Georgia, serif; outline-color: #497970; }.card-actions { display: flex; justify-content: space-between; padding-top: 18px; border-top: 1px solid #e8ebe7; }.card-tools { padding: 27px 18px; border-left: 1px solid #dde2df; background: #f7f8f5; }.card-tools h2 { margin: 0 0 15px; font: 20px Georgia, serif; font-weight: 500; }.card-tools label { display: grid; gap: 6px; margin-top: 12px; color: #66756f; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }.card-tools select, .card-tools input { width: 100%; border: 1px solid #d8ded9; border-radius: 6px; padding: 8px; background: white; color: #354441; font-size: 11px; font-weight: 400; letter-spacing: normal; text-transform: none; outline-color: #497970; }.page-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.source-help { margin: 14px 0 0; color: #78857f; font-size: 10px; line-height: 1.45; }.editor-empty { display: grid; min-height: 340px; place-items: center; align-content: center; color: #78857f; text-align: center; }.editor-empty h2 { margin: 0; font: 24px Georgia, serif; font-weight: 500; }.editor-empty p { font-size: 12px; }.export-bar { position: fixed; bottom: 0; left: 248px; right: 0; z-index: 4; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px max(58px, calc((100vw - 1130px) / 2)); border-top: 1px solid #dce2dc; background: rgba(255,254,250,.95); backdrop-filter: blur(10px); color: #687771; font-size: 12px; }.export-bar strong { color: #354541; }.cards-empty { min-height: 100vh; display: grid; place-content: center; justify-items: center; padding: 32px; text-align: center; background: #f8f8f4; }.cards-empty h1 { margin: 0; font: 32px Georgia, serif; font-weight: 500; }.cards-empty > p:not(.eyebrow) { max-width: 340px; color: #6b7974; font-size: 13px; line-height: 1.5; }.cards-empty .button { margin-top: 9px; } @media (max-width: 950px) { .cards-header { padding: 22px 30px; }.cards-layout { grid-template-columns: 200px minmax(300px, 1fr); }.card-tools { display: none; }.export-bar { left: 0; padding: 13px 30px; } } @media (max-width: 700px) { .cards-header { height: auto; min-height: 82px; grid-template-columns: 1fr auto; padding: 20px; }.cards-header > div { display: none; }.cards-layout { min-height: calc(100vh - 150px); grid-template-columns: 1fr; }.card-list { display: none; }.card-editor { padding: 22px; }.card-form-head { display: grid; }.card-toolbar { flex-wrap: wrap; }.card-toolbar .text-button { margin-left: 0; }.export-bar { left: 0; padding: 12px 18px; }.export-bar span { display: none; } }
    `}</style>
  </div>;
}

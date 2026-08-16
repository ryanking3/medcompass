"use client";

import { useMemo, useState } from "react";
import type { AiSourceAction, AiSourceStudyResponse } from "@/lib/ai/types";
import type { StudyCourse, StudyDocument, StudyFlashcard, StudyNote } from "./types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
  result?: AiSourceStudyResponse;
};

type AiChatPageProps = {
  courses: StudyCourse[];
  documents: StudyDocument[];
  onNoteCreated: (note: StudyNote) => void;
  onCardCreated: (card: StudyFlashcard) => void;
  onOpenNotesForTopic: (topicId: string) => void;
  onOpenCardsForTopic: (topicId: string) => void;
};

function flattenTopics(courses: StudyCourse[]) {
  return courses.flatMap((course) => course.modules.flatMap((module) => module.topics.map((topic) => ({ ...topic, courseName: course.name, moduleName: module.name }))));
}

export function AiChatPage({ courses, documents, onNoteCreated, onCardCreated, onOpenNotesForTopic, onOpenCardsForTopic }: AiChatPageProps) {
  const topics = useMemo(() => flattenTopics(courses), [courses]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(documents[0]?.id ?? "");
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState<AiSourceAction | null>(null);
  const [feedback, setFeedback] = useState("");
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null;
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? null;

  const runAction = async (action: AiSourceAction) => {
    if (!selectedDocument || busy) return;
    const userPrompt = prompt.trim() || (action === "ask" ? "What should I understand from this source?" : "Use this source context.");
    setBusy(action);
    setFeedback("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", body: action === "ask" ? userPrompt : `${action === "note" ? "Draft a note" : "Draft a flashcard"} from: ${userPrompt}` }]);
    const response = await fetch("/api/ai/source-study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        question: userPrompt,
        selectedText: userPrompt,
        documentId: selectedDocument.id,
        topicId: selectedTopic?.id,
        page: 1,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setFeedback(payload.error ?? "The fake AI assistant couldn't respond.");
      return;
    }
    const result = payload as AiSourceStudyResponse;
    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      role: "assistant",
      body: result.answer ?? result.noteDraft?.body ?? (result.flashcardDraft ? `${result.flashcardDraft.front}\n\n${result.flashcardDraft.back}` : "Fake AI draft ready."),
      result,
    }]);
    setPrompt("");
  };

  const saveNoteDraft = async (result: AiSourceStudyResponse) => {
    if (!result.noteDraft || !selectedTopic) return;
    setFeedback("");
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: selectedTopic.id, title: result.noteDraft.title, body: result.noteDraft.body }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setFeedback(payload.error ?? "We couldn't save that note draft.");
    onNoteCreated(payload.note as StudyNote);
    setFeedback("Note draft saved.");
  };

  const saveCardDraft = async (result: AiSourceStudyResponse) => {
    if (!result.flashcardDraft || !selectedTopic || !selectedDocument) return;
    setFeedback("");
    const draft = result.flashcardDraft;
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: selectedTopic.id, kind: draft.kind, front: draft.front, back: draft.back, sourceDocumentId: selectedDocument.id, sourcePageStart: 1, sourcePageEnd: 1 }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setFeedback(payload.error ?? "We couldn't save that card draft.");
    onCardCreated(payload.card as StudyFlashcard);
    setFeedback("Flashcard draft saved.");
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Chat</p>
          <h1>Ask across your study material.</h1>
          <p>This is the AI home base: choose a source/topic, ask questions, draft notes, or create flashcards. It is fake-mode now, ready for the real provider later.</p>
        </div>
      </header>

      <section className="chat-shell">
        <aside className="chat-context">
          <p className="eyebrow">Context</p>
          <label>Source<select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)}><option value="">Choose a source</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
          <label>Topic<select value={selectedTopicId} onChange={(event) => setSelectedTopicId(event.target.value)}><option value="">No topic</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
          <div className="chat-unlocks">
            <span>Ask source questions</span>
            <span>Draft cited notes</span>
            <span>Draft flashcards</span>
            <span>Future: diagrams/images</span>
          </div>
        </aside>

        <main className="chat-main">
          <div className="chat-thread">
            {messages.length ? messages.map((message) => <article key={message.id} className={message.role}>
              <span>{message.role === "user" ? "You" : "MedCompass AI · fake"}</span>
              <p>{message.body}</p>
              {message.result?.noteDraft && selectedTopic && <div className="message-actions"><button className="button dark" onClick={() => saveNoteDraft(message.result!)}>Save note</button><button className="text-button" onClick={() => onOpenNotesForTopic(selectedTopic.id)}>Open notes →</button></div>}
              {message.result?.flashcardDraft && selectedTopic && <div className="message-actions"><button className="button dark" onClick={() => saveCardDraft(message.result!)}>Save card</button><button className="text-button" onClick={() => onOpenCardsForTopic(selectedTopic.id)}>Open cards →</button></div>}
            </article>) : <div className="chat-empty"><span>✦</span><h2>Start with a source.</h2><p>Ask a question, or use the quick actions below to create a note/card draft from your prompt.</p></div>}
          </div>
          {feedback && <p className="chat-feedback" role="status">{feedback}</p>}
          <div className="chat-composer">
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about a textbook section, lecture PDF, or topic…" />
            <div>
              <button className="button ghost" onClick={() => runAction("note")} disabled={!selectedDocument || busy !== null}>{busy === "note" ? "Drafting…" : "Draft note"}</button>
              <button className="button ghost" onClick={() => runAction("flashcard")} disabled={!selectedDocument || busy !== null}>{busy === "flashcard" ? "Drafting…" : "Draft card"}</button>
              <button className="button primary" onClick={() => runAction("ask")} disabled={!selectedDocument || busy !== null}>{busy === "ask" ? "Asking…" : "Ask AI"}</button>
            </div>
          </div>
        </main>
      </section>

      <style jsx>{`
        .chat-page { max-width: 1280px; margin: 0 auto; padding: 55px 58px 100px; }
        .chat-header { margin-bottom: 28px; }
        .chat-header h1 { max-width: 700px; margin: 0 0 10px; color: #202b2e; font: 48px Georgia, serif; font-weight: 500; letter-spacing: -1.7px; }
        .chat-header p:not(.eyebrow) { max-width: 720px; margin: 0; color: #66746f; font-size: 14px; line-height: 1.6; }
        .chat-shell { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: stretch; min-height: 690px; }
        .chat-context, .chat-main { border: 1px solid #e1e6e1; border-radius: 16px; background: #fffefa; box-shadow: 0 8px 24px rgba(32,52,42,.032); }
        .chat-context { display: grid; align-content: start; gap: 14px; padding: 22px; }
        .chat-context label { display: grid; gap: 7px; color: #3f504d; font-size: 12px; font-weight: 700; }
        .chat-context select { min-height: 42px; border: 1px solid #d5ddd6; border-radius: 8px; padding: 0 11px; color: #20343a; background: #fffefa; outline-color: #497970; }
        .chat-unlocks { display: flex; flex-wrap: wrap; gap: 7px; padding-top: 12px; border-top: 1px solid #e8eee8; }
        .chat-unlocks span { border-radius: 999px; padding: 7px 9px; color: #53675f; background: #edf4ee; font-size: 10px; font-weight: 800; }
        .chat-main { display: grid; grid-template-rows: minmax(0, 1fr) auto; overflow: hidden; }
        .chat-thread { display: grid; align-content: start; gap: 14px; overflow: auto; padding: 24px; background: linear-gradient(145deg, #fbfcf9, #eef4ef); }
        .chat-thread article { max-width: 78%; padding: 14px 16px; border-radius: 16px; box-shadow: 0 8px 20px rgba(32,52,42,.04); }
        .chat-thread article.user { justify-self: end; border-bottom-right-radius: 4px; color: #233a35; background: #dfeee4; }
        .chat-thread article.assistant { justify-self: start; border-bottom-left-radius: 4px; color: #2c3d39; background: #fffefa; }
        .chat-thread article span { color: #6d7d75; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
        .chat-thread article p { white-space: pre-wrap; margin: 7px 0 0; font-size: 13px; line-height: 1.6; }
        .message-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        .message-actions .button { padding: 8px 10px; font-size: 11px; }
        .chat-empty { display: grid; place-items: center; align-content: center; min-height: 440px; gap: 10px; color: #718078; text-align: center; }
        .chat-empty span { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 18px; color: #3f7764; background: #e3efe6; font-size: 24px; }
        .chat-empty h2 { margin: 0; color: #263d37; font: 28px Georgia, serif; font-weight: 500; }
        .chat-empty p { max-width: 420px; margin: 0; font-size: 13px; line-height: 1.55; }
        .chat-feedback { margin: 0 24px 12px; color: #2e6b58; font-size: 12px; font-weight: 800; }
        .chat-composer { display: grid; gap: 10px; padding: 14px; border-top: 1px solid #e1e6e1; background: #fffefa; }
        .chat-composer textarea { min-height: 82px; resize: vertical; border: 1px solid #d5ddd6; border-radius: 12px; padding: 13px; color: #20343a; background: #fbfcf9; outline-color: #497970; font-size: 13px; line-height: 1.5; }
        .chat-composer div { display: flex; justify-content: flex-end; gap: 8px; }
        @media (max-width: 980px) { .chat-page { padding: 40px 34px 90px; }.chat-shell { grid-template-columns: 1fr; }.chat-thread article { max-width: 92%; } }
        @media (max-width: 620px) { .chat-page { padding: 30px 18px 80px; }.chat-header h1 { font-size: 38px; }.chat-composer div { display: grid; } }
      `}</style>
    </div>
  );
}

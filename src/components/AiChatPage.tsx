"use client";

import { useEffect, useMemo, useState } from "react";
import type { AiSourceAction, AiSourceStudyResponse } from "@/lib/ai/types";
import type { ChatLaunchContext, StudyCourse, StudyDocument, StudyFlashcard, StudyNote } from "./types";

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
  launchContext: ChatLaunchContext | null;
  onLaunchContextConsumed: () => void;
};

function flattenTopics(courses: StudyCourse[]) {
  return courses.flatMap((course) => course.modules.flatMap((module) => module.topics.map((topic) => ({ ...topic, courseName: course.name, moduleName: module.name }))));
}

export function AiChatPage({ courses, documents, onNoteCreated, onCardCreated, onOpenNotesForTopic, onOpenCardsForTopic, launchContext, onLaunchContextConsumed }: AiChatPageProps) {
  const topics = useMemo(() => flattenTopics(courses), [courses]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(documents[0]?.id ?? "");
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id ?? "");
  const [contextOpen, setContextOpen] = useState(false);
  const [activeLaunchContext, setActiveLaunchContext] = useState<ChatLaunchContext | null>(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState<AiSourceAction | null>(null);
  const [feedback, setFeedback] = useState("");
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null;
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? null;
  const readyDocuments = documents.filter((document) => document.status === "ready");
  const promptStarters = [
    "Explain this like I’m revising the night before an exam.",
    "What are the likely MCQ traps in this topic?",
    "Turn the key mechanism into an active recall checklist.",
  ];

  useEffect(() => {
    if (!launchContext) return;
    let cancelled = false;
    window.queueMicrotask(() => {
      if (cancelled) return;
      if (launchContext.documentId) setSelectedDocumentId(launchContext.documentId);
      if (launchContext.topicId) setSelectedTopicId(launchContext.topicId);
      const sourceLine = launchContext.documentTitle ? `${launchContext.documentTitle}${launchContext.page ? `, p. ${launchContext.page}` : ""}` : "the selected source";
      const selectedText = launchContext.selectedText?.trim();
      setPrompt(launchContext.prompt ?? (selectedText ? `Explain this section from ${sourceLine}:\n\n${selectedText}` : `What should I understand from ${sourceLine}?`));
      setActiveLaunchContext(launchContext);
      setContextOpen(false);
      onLaunchContextConsumed();
    });
    return () => { cancelled = true; };
  }, [launchContext, onLaunchContextConsumed]);

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
          <h1>Your source-aware study assistant.</h1>
          <p>Ask questions, draft notes, and make flashcards from your PDFs and topic structure. Responses are fake for now, but the product flow is wired for the real model.</p>
        </div>
        <button className="button ghost" onClick={() => setContextOpen(true)}>Study context</button>
      </header>

      <section className="chat-workbench">
        <div className="context-strip">
          <div>
            <span>Source</span>
            <strong>{selectedDocument ? selectedDocument.title : "No source selected"}</strong>
          </div>
          <div>
            <span>Topic</span>
            <strong>{selectedTopic ? selectedTopic.name : "Optional"}</strong>
          </div>
          <button className="text-button" onClick={() => setContextOpen(true)}>Change context →</button>
        </div>
        {activeLaunchContext?.selectedText && <div className="launched-context">
          <span>Sent from {activeLaunchContext.source}{activeLaunchContext.page ? ` · page ${activeLaunchContext.page}` : ""}</span>
          <p>{activeLaunchContext.selectedText}</p>
        </div>}

        <main className="chat-main">
          <div className="chat-thread">
            {messages.length ? messages.map((message) => <article key={message.id} className={message.role}>
              <div className="message-avatar">{message.role === "user" ? "Y" : "M"}</div>
              <div className="message-card">
                <span>{message.role === "user" ? "You" : "MedCompass AI · fake mode"}</span>
                <p>{message.body}</p>
                {message.result?.citations?.length ? <div className="citation-row">{message.result.citations.map((citation, index) => <span key={`${citation.documentId}-${citation.pageStart}-${index}`}>{citation.documentTitle ?? "Source"}{citation.pageStart ? ` · p. ${citation.pageStart}` : ""}</span>)}</div> : null}
                {message.result?.standards?.length ? <div className="standards-row">{message.result.standards.slice(0, 3).map((standard) => <small key={standard}>{standard}</small>)}</div> : null}
                {message.result?.noteDraft && selectedTopic && <div className="message-actions"><button className="button dark" onClick={() => saveNoteDraft(message.result!)}>Save note</button><button className="text-button" onClick={() => onOpenNotesForTopic(selectedTopic.id)}>Open notes →</button></div>}
                {message.result?.flashcardDraft && selectedTopic && <div className="message-actions"><button className="button dark" onClick={() => saveCardDraft(message.result!)}>Save card</button><button className="text-button" onClick={() => onOpenCardsForTopic(selectedTopic.id)}>Open cards →</button></div>}
              </div>
            </article>) : <div className="chat-empty">
              <span>✦</span>
              <h2>Start a study conversation.</h2>
              <p>Select a source, then ask for an explanation, a high-yield summary, a note draft, or a flashcard. Later this becomes the live AI cockpit.</p>
              <div className="starter-grid">
                {promptStarters.map((starter) => <button key={starter} onClick={() => setPrompt(starter)}>{starter}</button>)}
              </div>
            </div>}
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

      {contextOpen && <div className="context-backdrop" onMouseDown={() => setContextOpen(false)}>
        <aside className="context-drawer" role="dialog" aria-modal="true" aria-labelledby="context-drawer-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="drawer-heading">
            <div>
              <p className="eyebrow">Study context</p>
              <h2 id="context-drawer-title">Choose what AI can see</h2>
            </div>
            <button className="drawer-close" onClick={() => setContextOpen(false)} aria-label="Close study context">×</button>
          </div>

          <div className="drawer-section">
            <label>Source<select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)}><option value="">Choose a source</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
            <div className="source-summary">
              <strong>{readyDocuments.length} studyable sources</strong>
              <p>{selectedDocument ? `${selectedDocument.kind} · ${selectedDocument.pageCount ?? "unknown"} pages · ${selectedDocument.status}` : "Upload and extract PDFs in Library to make them available here."}</p>
            </div>
          </div>

          <div className="drawer-section">
            <label>Topic<select value={selectedTopicId} onChange={(event) => setSelectedTopicId(event.target.value)}><option value="">No topic</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
            {selectedTopic ? <div className="topic-summary">
              <strong>{selectedTopic.courseName}</strong>
              <p>{selectedTopic.moduleName}</p>
            </div> : <p className="drawer-help">Topic is optional for questions, but needed when saving AI note/card drafts.</p>}
          </div>

          <div className="drawer-section">
            <p className="eyebrow">Unlocked actions</p>
            <div className="chat-unlocks">
              <span>Source Q&A</span>
              <span>Cited note drafts</span>
              <span>Flashcard drafts</span>
              <span>PDF highlights</span>
              <span>Future image reasoning</span>
            </div>
          </div>
        </aside>
      </div>}

      <style jsx>{`
        .chat-page { max-width: 1280px; margin: 0 auto; padding: 55px 58px 100px; }
        .chat-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 28px; }
        .chat-header h1 { max-width: 700px; margin: 0 0 10px; color: #202b2e; font: 48px Georgia, serif; font-weight: 500; letter-spacing: -1.7px; }
        .chat-header p:not(.eyebrow) { max-width: 720px; margin: 0; color: #66746f; font-size: 14px; line-height: 1.6; }
        .chat-workbench { border: 1px solid #e1e6e1; border-radius: 18px; background: #fffefa; box-shadow: 0 18px 45px rgba(32,52,42,.045); overflow: hidden; }
        .context-strip { min-height: 70px; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr) auto; align-items: center; gap: 18px; padding: 14px 18px; border-bottom: 1px solid #e3e8e2; background: linear-gradient(135deg, #fffefa, #f4f7f2); }
        .context-strip div { min-width: 0; display: grid; gap: 3px; }
        .context-strip span { color: #718078; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .context-strip strong { color: #223a35; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .launched-context { display: grid; gap: 6px; padding: 12px 18px; border-bottom: 1px solid #e3e8e2; background: #f8faf6; }
        .launched-context span { color: #4d806d; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .launched-context p { max-height: 72px; overflow: auto; margin: 0; color: #52625d; font: 12px/1.5 Georgia, serif; }
        .chat-unlocks { display: flex; flex-wrap: wrap; gap: 7px; padding-top: 12px; border-top: 1px solid #e8eee8; }
        .chat-unlocks span { border-radius: 999px; padding: 7px 9px; color: #53675f; background: #edf4ee; font-size: 10px; font-weight: 800; }
        .chat-main { min-height: 650px; display: grid; grid-template-rows: minmax(0, 1fr) auto; overflow: hidden; }
        .chat-thread { display: grid; align-content: start; gap: 18px; overflow: auto; padding: 32px; background:
          radial-gradient(circle at 12% 0%, rgba(209,229,212,.48), transparent 34%),
          linear-gradient(145deg, #fbfcf9, #eef4ef); }
        .chat-thread article { width: min(760px, 100%); display: flex; gap: 12px; }
        .chat-thread article.user { justify-self: end; flex-direction: row-reverse; }
        .chat-thread article.assistant { justify-self: start; }
        .message-avatar { flex: 0 0 auto; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 12px; color: #fffefa; background: #20343a; font-size: 12px; font-weight: 900; }
        .user .message-avatar { background: #d8a13f; }
        .message-card { min-width: 0; padding: 15px 17px; border: 1px solid #e2e8e2; border-radius: 16px; box-shadow: 0 10px 24px rgba(32,52,42,.05); }
        .user .message-card { border-bottom-right-radius: 5px; color: #233a35; background: #dfeee4; }
        .assistant .message-card { border-bottom-left-radius: 5px; color: #2c3d39; background: #fffefa; }
        .message-card > span { color: #6d7d75; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
        .message-card p { white-space: pre-wrap; margin: 8px 0 0; font-size: 13px; line-height: 1.65; }
        .citation-row, .standards-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .citation-row span { border: 1px solid #dce8df; border-radius: 999px; padding: 5px 7px; color: #397468; background: #f0f6f1; font-size: 10px; font-weight: 800; }
        .standards-row small { border-radius: 999px; padding: 5px 7px; color: #718078; background: #f2f4f0; font-size: 10px; font-weight: 700; }
        .message-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        .message-actions .button { padding: 8px 10px; font-size: 11px; }
        .chat-empty { display: grid; place-items: center; align-content: center; min-height: 480px; gap: 10px; color: #718078; text-align: center; }
        .chat-empty span { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 18px; color: #3f7764; background: #e3efe6; font-size: 24px; }
        .chat-empty h2 { margin: 0; color: #263d37; font: 28px Georgia, serif; font-weight: 500; }
        .chat-empty p { max-width: 420px; margin: 0; font-size: 13px; line-height: 1.55; }
        .starter-grid { width: min(620px, 100%); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
        .starter-grid button { border: 1px solid #dfe8e1; border-radius: 12px; padding: 12px; color: #3d5751; background: rgba(255,254,250,.76); text-align: left; font-size: 12px; line-height: 1.45; }
        .starter-grid button:hover { border-color: #bfd4c5; background: #fffefa; }
        .chat-feedback { margin: 0 24px 12px; color: #2e6b58; font-size: 12px; font-weight: 800; }
        .chat-composer { display: grid; gap: 10px; padding: 14px; border-top: 1px solid #e1e6e1; background: #fffefa; }
        .chat-composer textarea { min-height: 82px; resize: vertical; border: 1px solid #d5ddd6; border-radius: 12px; padding: 13px; color: #20343a; background: #fbfcf9; outline-color: #497970; font-size: 13px; line-height: 1.5; }
        .chat-composer div { display: flex; justify-content: flex-end; gap: 8px; }
        .context-backdrop { position: fixed; inset: 0; z-index: 90; display: flex; justify-content: flex-end; background: rgba(22,36,31,.24); backdrop-filter: blur(4px); }
        .context-drawer { width: min(430px, 100%); height: 100%; overflow: auto; padding: 28px; border-left: 1px solid #dce6de; background: #fffefa; box-shadow: -24px 0 60px rgba(24,43,36,.15); }
        .drawer-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 24px; }
        .drawer-heading h2 { margin: 0; color: #263d37; font: 29px Georgia, serif; font-weight: 500; letter-spacing: -.6px; }
        .drawer-close { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid #d9e3db; border-radius: 999px; color: #546761; background: #fbfcf9; font-size: 21px; line-height: 1; }
        .drawer-section { display: grid; gap: 12px; padding: 18px 0; border-top: 1px solid #e8eee8; }
        .drawer-section label { display: grid; gap: 7px; color: #3f504d; font-size: 12px; font-weight: 700; }
        .drawer-section select { min-height: 44px; border: 1px solid #d5ddd6; border-radius: 9px; padding: 0 11px; color: #20343a; background: #fffefa; outline-color: #497970; }
        .source-summary, .topic-summary { padding: 13px; border: 1px solid #dce8df; border-radius: 12px; background: #eef6f0; }
        .source-summary strong, .topic-summary strong { color: #29453e; font-size: 13px; }
        .source-summary p, .topic-summary p, .drawer-help { margin: 5px 0 0; color: #6b7974; font-size: 12px; line-height: 1.5; }
        @media (max-width: 980px) { .chat-page { padding: 40px 34px 90px; }.chat-header { display: grid; }.context-strip { grid-template-columns: 1fr; align-items: start; }.chat-thread article { width: 100%; }.starter-grid { grid-template-columns: 1fr; } }
        @media (max-width: 620px) { .chat-page { padding: 30px 18px 80px; }.chat-header h1 { font-size: 38px; }.chat-thread { padding: 20px; }.chat-composer div { display: grid; }.message-avatar { display: none; } }
      `}</style>
    </div>
  );
}

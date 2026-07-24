"use client";

import { useMemo, useState } from "react";
import type { StudyDocument, StudyNote, StudyTopic } from "./types";

type TopicNotesProps = {
  topic: StudyTopic | null;
  notes: StudyNote[];
  documents: StudyDocument[];
  onBack: () => void;
  onNoteCreated: (note: StudyNote) => void;
  onNoteUpdated: (note: StudyNote) => void;
};

export function TopicNotes({ topic, notes, documents, onBack, onNoteCreated, onNoteUpdated }: TopicNotesProps) {
  const topicNotes = useMemo(() => topic ? notes.filter((note) => note.topicId === topic.id) : [], [notes, topic]);
  const topicDocuments = useMemo(() => topic ? documents.filter((document) => document.linkedTopics.some((linkedTopic) => linkedTopic.id === topic.id)) : [], [documents, topic]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { title: string; body: string }>>({});
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [citationDocumentId, setCitationDocumentId] = useState("");
  const [pageStart, setPageStart] = useState("");
  const [pageEnd, setPageEnd] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [isAddingCitation, setIsAddingCitation] = useState(false);

  const activeNoteId = topicNotes.some((note) => note.id === selectedNoteId) ? selectedNoteId : topicNotes[0]?.id ?? null;
  const selectedNote = topicNotes.find((note) => note.id === activeNoteId) ?? null;
  const draft = selectedNote ? drafts[selectedNote.id] ?? { title: selectedNote.title, body: selectedNote.body } : null;
  const activeCitationDocumentId = topicDocuments.some((document) => document.id === citationDocumentId) ? citationDocumentId : topicDocuments[0]?.id ?? "";

  function updateDraft(change: Partial<{ title: string; body: string }>) {
    if (!selectedNote) return;
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [selectedNote.id]: { ...(currentDrafts[selectedNote.id] ?? { title: selectedNote.title, body: selectedNote.body }), ...change },
    }));
  }

  async function createNote() {
    if (!topic || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: topic.id, title: "Untitled note", body: "" }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setFeedback(result.error ?? "We couldn't create a note. Please try again.");
      return;
    }
    const note = result.note as StudyNote;
    onNoteCreated(note);
    setSelectedNoteId(note.id);
  }

  async function saveNote() {
    if (!selectedNote || !draft?.title.trim() || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    const response = await fetch(`/api/notes/${selectedNote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title, body: draft.body }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setFeedback(result.error ?? "We couldn't save your note. Please try again.");
      return;
    }
    onNoteUpdated({ ...(result.note as StudyNote), citations: selectedNote.citations });
    setDrafts((currentDrafts) => {
      const remainingDrafts = { ...currentDrafts };
      delete remainingDrafts[selectedNote.id];
      return remainingDrafts;
    });
    setFeedback("Saved");
  }

  async function addCitation() {
    if (!selectedNote || !activeCitationDocumentId || isAddingCitation) return;
    setIsAddingCitation(true);
    setFeedback("");
    const response = await fetch(`/api/notes/${selectedNote.id}/citations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: activeCitationDocumentId, pageStart: pageStart ? Number(pageStart) : null, pageEnd: pageEnd ? Number(pageEnd) : null, excerpt }),
    });
    const result = await response.json().catch(() => ({}));
    setIsAddingCitation(false);
    if (!response.ok) {
      setFeedback(result.error ?? "We couldn't add that citation. Please try again.");
      return;
    }
    onNoteUpdated({ ...selectedNote, citations: [...selectedNote.citations, result.citation] });
    setPageStart("");
    setPageEnd("");
    setExcerpt("");
    setFeedback("Citation added");
  }

  if (!topic) {
    return <div className="notes-empty"><p className="eyebrow">Topic notes</p><h1>Choose a topic first</h1><p>Notes stay connected to the topic and sources that support them.</p><button className="button primary" onClick={onBack}>Return to topic</button></div>;
  }

  return <div className="notes-workspace">
    <header className="notes-header"><button className="back-link" onClick={onBack}>← <span>{topic.name}</span></button><div><p className="eyebrow">Topic notes</p><h1>Keep the useful bits</h1></div><button className="button primary" onClick={createNote} disabled={isSaving}>+ New note</button></header>
    <div className="notes-layout">
      <aside className="notes-list"><p className="eyebrow">{topic.name}</p>{topicNotes.length ? topicNotes.map((note) => <button key={note.id} className={note.id === activeNoteId ? "saved-note active" : "saved-note"} onClick={() => setSelectedNoteId(note.id)}><strong>{note.title}</strong><small>{note.citations.length ? `${note.citations.length} source ${note.citations.length === 1 ? "link" : "links"}` : "No source links yet"}</small></button>) : <p className="notes-list-empty">Create your first note for this topic.</p>}</aside>
      <section className="note-editor">
        {selectedNote && draft ? <><div className="editor-toolbar"><span>{feedback || "Private to your workspace"}</span><button className="text-button" onClick={saveNote} disabled={!draft.title.trim() || isSaving}>{isSaving ? "Saving…" : "Save note"}</button></div><input className="note-title" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} aria-label="Note title" placeholder="Note title" /><textarea className="note-body" value={draft.body} onChange={(event) => updateDraft({ body: event.target.value })} aria-label="Note body" placeholder="Write what you want to remember, in your own words…" />
          <div className="citation-section"><p className="eyebrow">Source links</p>{selectedNote.citations.length ? <div className="citation-list">{selectedNote.citations.map((citation) => <div key={citation.id} className="note-citation"><span>↗</span><div><strong>{citation.documentTitle}{citation.pageStart ? `, p. ${citation.pageStart}${citation.pageEnd && citation.pageEnd !== citation.pageStart ? `–${citation.pageEnd}` : ""}` : ""}</strong>{citation.excerpt && <small>{citation.excerpt}</small>}</div></div>)}</div> : <p className="citation-empty">Add a source page so you can trace this note back to the original material.</p>}</div>
        </> : <div className="editor-empty"><h2>No note selected</h2><p>Create a note to begin.</p></div>}
      </section>
      <aside className="note-tools"><p className="eyebrow">Add source link</p><h2>Keep the evidence close</h2>{selectedNote ? topicDocuments.length ? <><label>Source<select value={activeCitationDocumentId} onChange={(event) => setCitationDocumentId(event.target.value)}>{topicDocuments.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label><div className="page-inputs"><label>Start page<input type="number" min="1" value={pageStart} onChange={(event) => setPageStart(event.target.value)} /></label><label>End page<input type="number" min="1" value={pageEnd} onChange={(event) => setPageEnd(event.target.value)} /></label></div><label>Optional excerpt<textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="A short passage or reminder" /></label><button className="button ghost citation-button" onClick={addCitation} disabled={!activeCitationDocumentId || isAddingCitation}>{isAddingCitation ? "Adding…" : "Add source link"}</button></> : <p className="tool-empty">Upload a PDF and link it to <strong>{topic.name}</strong> to cite it here.</p> : <p className="tool-empty">Create a note before adding its source links.</p>}</aside>
    </div>
    <style jsx>{`
      .notes-workspace { min-height: 100vh; background: #f8f8f4; }.notes-header { height: 128px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 22px 58px; background: #fffefa; border-bottom: 1px solid #dde2df; }.notes-header > div { text-align: center; }.notes-header h1 { margin: 0; font: 29px Georgia, serif; font-weight: 500; letter-spacing: -.5px; }.notes-header .button { justify-self: end; }.notes-layout { min-height: calc(100vh - 128px); display: grid; grid-template-columns: 240px minmax(360px, 1fr) 270px; }.notes-list { padding: 24px 16px; border-right: 1px solid #dde2df; background: #f4f6f2; }.notes-list-empty, .tool-empty { color: #718078; font-size: 11px; line-height: 1.5; }.saved-note { width: 100%; display: grid; gap: 4px; border: 0; border-radius: 7px; padding: 11px; background: transparent; text-align: left; color: #3e4c4c; }.saved-note:hover { background: #e7ece8; }.saved-note.active { background: #dceadf; }.saved-note strong { overflow: hidden; text-overflow: ellipsis; font-size: 12px; white-space: nowrap; }.saved-note small { color: #718078; font-size: 10px; }.note-editor { padding: 24px clamp(28px, 5vw, 70px); background: #fffefa; }.editor-toolbar { display: flex; justify-content: space-between; color: #78857f; font-size: 11px; padding-bottom: 18px; border-bottom: 1px solid #e8ebe7; }.note-title { width: 100%; border: 0; outline: 0; padding: 30px 0 12px; color: #253233; background: transparent; font: 33px Georgia, serif; letter-spacing: -.8px; }.note-body { width: 100%; min-height: 260px; resize: vertical; border: 0; outline: 0; padding: 8px 0; color: #475657; background: transparent; font: 16px/1.75 Georgia, serif; }.citation-section { margin-top: 22px; padding-top: 18px; border-top: 1px solid #e8ebe7; }.citation-empty { color: #76837d; font-size: 11px; }.citation-list { display: grid; gap: 8px; }.note-citation { display: flex; gap: 11px; align-items: flex-start; padding: 12px; background: #f1f7f2; border-left: 3px solid #99bca4; border-radius: 0 7px 7px 0; }.note-citation > span { color: #42795e; }.note-citation strong, .note-citation small { display: block; }.note-citation strong { font-size: 11px; }.note-citation small { margin-top: 4px; color: #667570; font-size: 10px; line-height: 1.45; }.editor-empty { display: grid; min-height: 340px; place-items: center; align-content: center; color: #78857f; text-align: center; }.editor-empty h2 { margin: 0; font: 24px Georgia, serif; font-weight: 500; }.editor-empty p { font-size: 12px; }.note-tools { padding: 27px 18px; border-left: 1px solid #dde2df; background: #f7f8f5; }.note-tools h2 { margin: 0 0 15px; font: 20px Georgia, serif; font-weight: 500; }.note-tools label { display: grid; gap: 6px; margin-top: 12px; color: #66756f; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }.note-tools select, .note-tools input, .note-tools textarea { width: 100%; border: 1px solid #d8ded9; border-radius: 6px; padding: 8px; background: white; color: #354441; font-size: 11px; font-weight: 400; letter-spacing: normal; text-transform: none; outline-color: #497970; }.note-tools textarea { min-height: 76px; resize: vertical; }.page-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.citation-button { width: 100%; margin-top: 15px; }.notes-empty { min-height: 100vh; display: grid; place-content: center; justify-items: center; padding: 32px; text-align: center; background: #f8f8f4; }.notes-empty h1 { margin: 0; font: 32px Georgia, serif; font-weight: 500; }.notes-empty > p:not(.eyebrow) { max-width: 340px; color: #6b7974; font-size: 13px; line-height: 1.5; }.notes-empty .button { margin-top: 9px; } @media (max-width: 950px) { .notes-header { padding: 22px 30px; }.notes-layout { grid-template-columns: 200px minmax(300px, 1fr); }.note-tools { display: none; } } @media (max-width: 700px) { .notes-header { height: auto; min-height: 82px; grid-template-columns: 1fr auto; padding: 20px; }.notes-header > div { display: none; }.notes-layout { min-height: calc(100vh - 82px); grid-template-columns: 1fr; }.notes-list { display: none; }.note-editor { padding: 22px; } }
    `}</style>
  </div>;
}

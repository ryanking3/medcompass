"use client";

import { useMemo, useRef, useState, type ClipboardEvent } from "react";
import { NoteInlineContent, noteImageToken } from "@/components/NoteInlineContent";
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
  const [isAddingImage, setIsAddingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const noteBodyRef = useRef<HTMLTextAreaElement | null>(null);

  const activeNoteId = topicNotes.some((note) => note.id === selectedNoteId) ? selectedNoteId : topicNotes[0]?.id ?? null;
  const selectedNote = topicNotes.find((note) => note.id === activeNoteId) ?? null;
  const draft = selectedNote ? drafts[selectedNote.id] ?? { title: selectedNote.title, body: selectedNote.body } : null;
  const activeCitationDocumentId = topicDocuments.some((document) => document.id === citationDocumentId) ? citationDocumentId : topicDocuments[0]?.id ?? "";

  function updateDraft(change: Partial<{ title: string; body: string }>) {
    if (!selectedNote) return;
    setDrafts((currentDrafts) => ({ ...currentDrafts, [selectedNote.id]: { ...(currentDrafts[selectedNote.id] ?? { title: selectedNote.title, body: selectedNote.body }), ...change } }));
  }

  async function createNote() {
    if (!topic || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId: topic.id, title: "Untitled note", body: "" }) });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) return setFeedback(result.error ?? "We couldn't create a note. Please try again.");
    const note = result.note as StudyNote;
    onNoteCreated(note);
    setSelectedNoteId(note.id);
  }

  async function saveNote() {
    if (!selectedNote || !draft?.title.trim() || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    const response = await fetch(`/api/notes/${selectedNote.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft.title, body: draft.body }) });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) return setFeedback(result.error ?? "We couldn't save your note. Please try again.");
    onNoteUpdated({ ...(result.note as StudyNote), citations: selectedNote.citations, images: selectedNote.images });
    setDrafts((currentDrafts) => { const remainingDrafts = { ...currentDrafts }; delete remainingDrafts[selectedNote.id]; return remainingDrafts; });
    setFeedback("Saved");
  }

  async function addCitation() {
    if (!selectedNote || !activeCitationDocumentId || isAddingCitation) return;
    setIsAddingCitation(true);
    setFeedback("");
    const response = await fetch(`/api/notes/${selectedNote.id}/citations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: activeCitationDocumentId, pageStart: pageStart ? Number(pageStart) : null, pageEnd: pageEnd ? Number(pageEnd) : null, excerpt }) });
    const result = await response.json().catch(() => ({}));
    setIsAddingCitation(false);
    if (!response.ok) return setFeedback(result.error ?? "We couldn't add that citation. Please try again.");
    onNoteUpdated({ ...selectedNote, citations: [...selectedNote.citations, result.citation] });
    setPageStart(""); setPageEnd(""); setExcerpt(""); setFeedback("Source link added");
  }

  async function copyCitation(citation: StudyNote["citations"][number]) {
    const pageText = citation.pageStart ? `, p. ${citation.pageStart}${citation.pageEnd && citation.pageEnd !== citation.pageStart ? `–${citation.pageEnd}` : ""}` : "";
    try {
      await navigator.clipboard.writeText(`${citation.documentTitle}${pageText}`);
      setFeedback("Citation copied");
    } catch {
      setFeedback("We couldn't copy that citation from this browser.");
    }
  }

  function noteSupportLabel(note: StudyNote) {
    const parts = [];
    if (note.citations.length) parts.push(`${note.citations.length} source ${note.citations.length === 1 ? "link" : "links"}`);
    if (note.images.length) parts.push(`${note.images.length} ${note.images.length === 1 ? "image" : "images"}`);
    return parts.length ? parts.join(" · ") : "No source link";
  }

  function insertTextIntoDraft(text: string) {
    if (!selectedNote || !draft) return;
    const input = noteBodyRef.current;
    const currentBody = draft.body;
    const start = input?.selectionStart ?? currentBody.length;
    const end = input?.selectionEnd ?? currentBody.length;
    const prefix = currentBody.slice(0, start);
    const suffix = currentBody.slice(end);
    const needsLeadingBreak = prefix && !prefix.endsWith("\n") ? "\n\n" : "";
    const needsTrailingBreak = suffix && !suffix.startsWith("\n") ? "\n\n" : "";
    const nextBody = `${prefix}${needsLeadingBreak}${text}${needsTrailingBreak}${suffix}`;
    updateDraft({ body: nextBody });
    window.requestAnimationFrame(() => {
      const nextCursor = start + needsLeadingBreak.length + text.length;
      noteBodyRef.current?.focus();
      noteBodyRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function uploadImage(file: File) {
    if (!selectedNote || isAddingImage) return;
    if (!file.type.startsWith("image/")) {
      setFeedback("Paste or upload an image file.");
      return;
    }
    setIsAddingImage(true);
    setFeedback("Uploading image…");
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`/api/notes/${selectedNote.id}/images`, { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    setIsAddingImage(false);
    if (!response.ok) {
      setFeedback(result.error ?? "We couldn't add that image.");
      return;
    }
    onNoteUpdated({ ...selectedNote, images: [...selectedNote.images, result.image] });
    insertTextIntoDraft(noteImageToken(result.image.id));
    setFeedback("Image added inline — save note to keep placement");
  }

  async function removeImage(imageId: string) {
    if (!selectedNote || isAddingImage) return;
    setIsAddingImage(true);
    setFeedback("");
    const response = await fetch(`/api/notes/${selectedNote.id}/images/${imageId}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setIsAddingImage(false);
    if (!response.ok) {
      setFeedback(result.error ?? "We couldn't remove that image.");
      return;
    }
    onNoteUpdated({ ...selectedNote, images: selectedNote.images.filter((image) => image.id !== imageId) });
    updateDraft({ body: (draft?.body ?? selectedNote.body).replaceAll(noteImageToken(imageId), "").replace(/\n{3,}/g, "\n\n").trim() });
    setFeedback("Image removed — save note to keep changes");
  }

  function handleNotePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    const imageFile = imageItem?.getAsFile();
    if (!imageFile) return;
    event.preventDefault();
    uploadImage(imageFile);
  }

  if (!topic) return <EmptyNotes onBack={onBack} />;

  return <div className="notes-page">
    <header className="notes-page-header"><div><button className="back-link" onClick={onBack}>← <span>{topic.name}</span></button><p className="eyebrow">Topic notes</p><h1>{topic.name}</h1><p>Write in your own words, then keep the supporting source close by.</p></div><button className="button primary" onClick={createNote} disabled={isSaving}>+ New note</button></header>
    <div className="notes-shell">
      <aside className="notes-rail"><div className="rail-heading"><div><p className="eyebrow">Saved notes</p><strong>{topicNotes.length}</strong></div><button className="rail-add" onClick={createNote} aria-label="Create new note" disabled={isSaving}>+</button></div>{topicNotes.length ? <div className="note-list">{topicNotes.map((note) => <button key={note.id} className={note.id === activeNoteId ? "note-list-item active" : "note-list-item"} onClick={() => setSelectedNoteId(note.id)}><strong>{note.title}</strong><small>{noteSupportLabel(note)}</small></button>)}</div> : <div className="rail-empty"><span>✦</span><p>Your first note will appear here.</p></div>}</aside>
      <main className="notes-editor-wrap">{selectedNote && draft ? <><section className="note-paper"><div className="note-paper-toolbar"><span>{feedback || "Private to your workspace"}</span><div className="note-toolbar-actions"><input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file); event.target.value = ""; }} /><button className="button ghost compact-button" onClick={() => imageInputRef.current?.click()} disabled={isAddingImage}>{isAddingImage ? "Adding image…" : "Add image"}</button><button className="button dark compact-button" onClick={saveNote} disabled={!draft.title.trim() || isSaving}>{isSaving ? "Saving…" : "Save note"}</button></div></div><input className="note-title-input" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} aria-label="Note title" placeholder="Note title" /><textarea ref={noteBodyRef} className="note-body-input" value={draft.body} onChange={(event) => updateDraft({ body: event.target.value })} onPaste={handleNotePaste} aria-label="Note body" placeholder="Write what you want to remember, in your own words… Paste screenshots or diagrams here." /><NoteInlineContent body={draft.body} images={selectedNote.images} onRemoveImage={removeImage} removeDisabled={isAddingImage} />{selectedNote.citations.length > 0 && <div className="note-sources"><p className="eyebrow">Linked sources</p>{selectedNote.citations.map((citation) => <div key={citation.id} className="citation-chip"><span>↗</span><div><strong>{citation.documentTitle}{citation.pageStart ? ` · p. ${citation.pageStart}${citation.pageEnd && citation.pageEnd !== citation.pageStart ? `–${citation.pageEnd}` : ""}` : ""}</strong>{citation.excerpt && <small>{citation.excerpt}</small>}</div><button onClick={() => copyCitation(citation)}>Copy</button></div>)}</div>}</section><section className="source-link-panel"><div><p className="eyebrow">Source link</p><h2>Where did this come from?</h2><p>Add a page reference whenever a source supports the note.</p></div>{topicDocuments.length ? <div className="source-link-form"><label>Source<select value={activeCitationDocumentId} onChange={(event) => setCitationDocumentId(event.target.value)}>{topicDocuments.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label><label>Page<input type="number" min="1" value={pageStart} onChange={(event) => setPageStart(event.target.value)} placeholder="e.g. 12" /></label><label>To page <input type="number" min="1" value={pageEnd} onChange={(event) => setPageEnd(event.target.value)} placeholder="Optional" /></label><label className="excerpt-field">Optional excerpt<textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="A short passage or reminder" /></label><button className="button ghost" onClick={addCitation} disabled={!activeCitationDocumentId || isAddingCitation}>{isAddingCitation ? "Adding…" : "Add source link"}</button></div> : <div className="source-link-empty"><strong>Add a source first</strong><p>Upload a PDF and link it to {topic.name} to cite it here.</p></div>}</section></> : <div className="editor-empty"><span>✦</span><h2>No note selected</h2><p>Create a note to begin writing.</p><button className="button primary" onClick={createNote}>Create note</button></div>}</main>
    </div>
    <style jsx>{`
      .notes-page { min-height: 100vh; background: #f6f7f3; }.notes-page-header { max-width: 1120px; display: flex; justify-content: space-between; gap: 30px; align-items: flex-start; margin: 0 auto; padding: 52px 42px 34px; }.notes-page-header h1 { margin: 7px 0 7px; color: #202b2e; font: 43px Georgia, serif; font-weight: 500; letter-spacing: -1.4px; }.notes-page-header > div > p:not(.eyebrow) { max-width: 540px; margin: 0; color: #6a7874; font-size: 13px; line-height: 1.5; }.notes-page-header .button { margin-top: 28px; }.notes-shell { max-width: 1120px; display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 18px; margin: 0 auto; padding: 0 42px 80px; }.notes-rail, .note-paper, .source-link-panel { border: 1px solid #dfe6df; border-radius: 12px; background: #fffefa; }.notes-rail { align-self: start; padding: 15px 10px; }.rail-heading { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px 12px; border-bottom: 1px solid #edf0ec; }.rail-heading .eyebrow { margin-bottom: 3px; }.rail-heading strong { color: #425950; font: 18px Georgia, serif; }.rail-add { display: grid; place-items: center; width: 25px; height: 25px; border: 0; border-radius: 50%; color: #2d6f59; background: #e4f0e6; font-size: 18px; }.note-list { display: grid; gap: 3px; margin-top: 10px; }.note-list-item { display: grid; gap: 4px; width: 100%; border: 0; border-radius: 7px; padding: 10px; background: transparent; color: #40504c; text-align: left; }.note-list-item:hover { background: #f1f5f1; }.note-list-item.active { background: #e2eee5; }.note-list-item strong { overflow: hidden; text-overflow: ellipsis; font-size: 12px; white-space: nowrap; }.note-list-item small { color: #78857f; font-size: 10px; }.rail-empty { padding: 22px 10px 13px; color: #7e8a84; text-align: center; font-size: 11px; line-height: 1.5; }.rail-empty span { display: grid; place-items: center; width: 28px; height: 28px; margin: 0 auto 8px; border-radius: 50%; color: #477a66; background: #e9f3ea; }.rail-empty p { margin: 0; }.notes-editor-wrap { min-width: 0; }.note-paper { padding: 24px clamp(24px, 5vw, 58px) 34px; }.note-paper-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 14px; color: #7b8781; font-size: 11px; }.note-toolbar-actions { display: flex; align-items: center; gap: 8px; }.compact-button { padding: 8px 11px; font-size: 11px; }.note-title-input { width: 100%; border: 0; outline: 0; padding: 31px 0 12px; color: #253233; background: transparent; font: 35px Georgia, serif; letter-spacing: -.8px; }.note-body-input { width: 100%; min-height: 290px; resize: vertical; border: 0; border-top: 1px solid #ecf0eb; outline: 0; padding: 18px 0 0; color: #475657; background: transparent; font: 16px/1.78 Georgia, serif; }.note-images, .note-sources { display: grid; gap: 8px; margin-top: 27px; padding-top: 18px; border-top: 1px solid #e9eeea; }.note-images > div { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }.note-images figure { overflow: hidden; margin: 0; border: 1px solid #dce7df; border-radius: 10px; background: #f8faf7; }.note-images img { display: block; width: 100%; max-height: 360px; object-fit: contain; background: white; }.note-images figcaption { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; color: #66756f; font-size: 10px; }.note-images figcaption span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.note-images figcaption button { border: 0; color: #9a4a4a; background: transparent; font-size: 10px; font-weight: 800; }.citation-chip { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: flex-start; padding: 11px 12px; border-radius: 7px; background: #f0f6f1; }.citation-chip > span { color: #39765e; }.citation-chip strong, .citation-chip small { display: block; }.citation-chip strong { color: #43544f; font-size: 11px; }.citation-chip small { margin-top: 4px; color: #718078; font-size: 10px; line-height: 1.45; }.citation-chip button { border: 1px solid #d6e3d8; border-radius: 999px; padding: 5px 8px; color: #3f776a; background: #fffefa; font-size: 10px; font-weight: 800; }.source-link-panel { display: grid; grid-template-columns: minmax(180px, .7fr) minmax(0, 1.3fr); gap: 22px; margin-top: 15px; padding: 20px 22px; background: #edf5ef; border-color: #d9e7dc; }.source-link-panel h2 { margin: 0 0 7px; font: 21px Georgia, serif; font-weight: 500; }.source-link-panel > div > p:not(.eyebrow) { margin: 0; color: #64746c; font-size: 11px; line-height: 1.5; }.source-link-form { display: grid; grid-template-columns: minmax(140px, 1fr) 74px 74px; gap: 9px; align-items: end; }.source-link-form label { display: grid; gap: 5px; color: #66756f; font-size: 9px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }.source-link-form select, .source-link-form input, .source-link-form textarea { width: 100%; border: 1px solid #d4dfd5; border-radius: 6px; padding: 8px; background: white; color: #354441; font-size: 11px; font-weight: 400; letter-spacing: normal; text-transform: none; outline-color: #497970; }.source-link-form textarea { min-height: 58px; resize: vertical; }.source-link-form .excerpt-field { grid-column: span 2; }.source-link-form .button { align-self: end; padding: 9px 10px; font-size: 11px; }.source-link-empty { color: #6a7b73; font-size: 11px; line-height: 1.5; }.source-link-empty p { margin: 4px 0 0; }.editor-empty { display: grid; min-height: 430px; place-items: center; align-content: center; padding: 35px; border: 1px dashed #c8d5ca; border-radius: 12px; background: #fbfcf9; color: #73817b; text-align: center; }.editor-empty > span { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; color: #39765e; background: #e3f0e5; }.editor-empty h2 { margin: 15px 0 5px; color: #354540; font: 25px Georgia, serif; font-weight: 500; }.editor-empty p { margin: 0 0 17px; font-size: 12px; }.notes-empty { min-height: 100vh; display: grid; place-content: center; justify-items: center; padding: 32px; text-align: center; background: #f6f7f3; }.notes-empty h1 { margin: 0; font: 32px Georgia, serif; font-weight: 500; }.notes-empty > p:not(.eyebrow) { max-width: 340px; color: #6b7974; font-size: 13px; line-height: 1.5; }.notes-empty .button { margin-top: 9px; } @media (max-width: 780px) { .notes-page-header, .notes-shell { padding-left: 22px; padding-right: 22px; }.notes-shell { grid-template-columns: 1fr; }.notes-rail { display: none; }.source-link-panel { grid-template-columns: 1fr; }.source-link-form { grid-template-columns: 1fr 78px 78px; } } @media (max-width: 560px) { .notes-page-header { display: grid; padding-top: 31px; }.notes-page-header h1 { font-size: 36px; }.notes-page-header .button { justify-self: start; margin-top: 5px; }.note-paper { padding: 19px 20px 25px; }.note-paper-toolbar, .note-toolbar-actions { align-items: flex-start; flex-wrap: wrap; }.note-title-input { font-size: 29px; }.note-images > div { grid-template-columns: 1fr; }.source-link-form { grid-template-columns: 1fr 1fr; }.source-link-form > label:first-child, .source-link-form .excerpt-field { grid-column: span 2; }.source-link-form .button { grid-column: span 2; justify-self: start; } }
    `}</style>
  </div>;
}

function EmptyNotes({ onBack }: { onBack: () => void }) {
  return <div className="no-topic-state"><section><span className="no-topic-icon">↗</span><p className="eyebrow">Topic notes</p><h1>Start with a topic.</h1><p>Notes stay in the context of the course material and sources that support them.</p><button className="button primary" onClick={onBack}>Go to your workspace →</button></section><div className="no-topic-steps"><span>1</span><span>Choose or create a topic</span><i>→</i><span>2</span><span>Write your first note</span></div><style jsx>{`.no-topic-state { min-height: 100vh; display: grid; place-items: center; padding: 42px; background: #f6f7f3; }.no-topic-state section { width: min(510px, 100%); padding: 43px; border: 1px solid #dce6de; border-radius: 16px; background: #fffefa; box-shadow: 0 18px 40px rgba(37,58,47,.06); text-align: center; }.no-topic-icon { display: grid; place-items: center; width: 54px; height: 54px; margin: 0 auto 18px; border-radius: 18px; color: #3f7764; background: #e3efe6; font: 25px Georgia, serif; }.no-topic-state h1 { margin: 0 0 10px; color: #243334; font: 34px Georgia, serif; font-weight: 500; letter-spacing: -.8px; }.no-topic-state section > p:not(.eyebrow) { max-width: 360px; margin: 0 auto; color: #687771; font-size: 13px; line-height: 1.55; }.no-topic-state .button { margin-top: 24px; }.no-topic-steps { display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: 18px; color: #718078; font-size: 11px; }.no-topic-steps > span:nth-of-type(odd) { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; color: #3b7460; background: #e1ece4; font-size: 10px; font-weight: 700; }.no-topic-steps i { color: #a2ada6; font-style: normal; } @media (max-width: 560px) { .no-topic-state { padding: 22px; }.no-topic-state section { padding: 33px 24px; }.no-topic-steps { display: none; } }`}</style></div>;
}

"use client";

import { useMemo, useState } from "react";
import type { DocumentKind, StudyDocument } from "@/components/types";

type DocumentLibraryProps = {
  documents: StudyDocument[];
  onOpenDocument: (document: StudyDocument) => void;
  onOpenUpload: () => void;
  onDocumentUpdated: (document: StudyDocument) => void;
};

const kindLabels: Record<DocumentKind, string> = {
  textbook: "Textbook",
  lecture: "Lecture",
  other: "PDF",
};

const statusLabels: Record<StudyDocument["status"], string> = {
  pending: "Uploaded",
  processing: "Preparing",
  ready: "Ready",
  failed: "Needs attention",
};

export function DocumentLibrary({ documents, onOpenDocument, onOpenUpload, onDocumentUpdated }: DocumentLibraryProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | DocumentKind>("all");
  const [preparingDocumentId, setPreparingDocumentId] = useState<string | null>(null);
  const [prepareFeedback, setPrepareFeedback] = useState("");
  const readyCount = documents.filter((document) => document.status === "ready").length;
  const pendingCount = documents.filter((document) => document.status === "pending" || document.status === "processing").length;
  const failedCount = documents.filter((document) => document.status === "failed").length;
  const linkedCount = documents.filter((document) => document.linkedTopics.length > 0).length;
  const filteredDocuments = useMemo(() => documents.filter((document) => {
    const matchesQuery = document.title.toLowerCase().includes(query.toLowerCase()) || document.originalFilename.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "all" || document.kind === filter);
  }), [documents, filter, query]);

  const countFor = (kind: "all" | DocumentKind) => kind === "all" ? documents.length : documents.filter((document) => document.kind === kind).length;
  const prepareDocument = async (document: StudyDocument) => {
    if (preparingDocumentId) return;
    setPreparingDocumentId(document.id);
    setPrepareFeedback("");
    const response = await fetch(`/api/documents/${document.id}/extract`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setPreparingDocumentId(null);

    if (!response.ok) {
      const diagnostic = result.details ? ` (${result.stage}: ${result.details})` : "";
      setPrepareFeedback(`${result.error ?? "We couldn't prepare that source."}${diagnostic}`);
      return;
    }

    onDocumentUpdated(result.document as StudyDocument);
    setPrepareFeedback(`${result.document?.title ?? document.title} is ready for study.`);
  };

  return (
    <div className="library-page">
      <header className="library-header">
        <div><p className="eyebrow">Your sources</p><h1>Textbooks &amp; PDFs</h1><p>Private study material, ready for the reading and AI layers we’re building next.</p></div>
        <button className="button primary" onClick={onOpenUpload}>+ Add source</button>
      </header>

      <div className="library-tools">
        <label className="library-search">⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your textbooks and PDFs" aria-label="Search your library" /></label>
        <div className="filter-row" aria-label="Filter sources">
          <button className={filter === "all" ? "filter active" : "filter"} onClick={() => setFilter("all")}>All <span>{countFor("all")}</span></button>
          <button className={filter === "textbook" ? "filter active" : "filter"} onClick={() => setFilter("textbook")}>Textbooks <span>{countFor("textbook")}</span></button>
          <button className={filter === "lecture" ? "filter active" : "filter"} onClick={() => setFilter("lecture")}>Lectures <span>{countFor("lecture")}</span></button>
        </div>
      </div>

      <section className="library-readiness" aria-label="Library readiness">
        <article>
          <span>Studyable</span>
          <strong>{readyCount}</strong>
          <p>{readyCount === 1 ? "source has" : "sources have"} extracted pages for citations and Chat.</p>
        </article>
        <article>
          <span>Preparing</span>
          <strong>{pendingCount}</strong>
          <p>{pendingCount ? "Prepare these PDFs directly from the list." : "No PDFs waiting on extraction."}</p>
        </article>
        <article className={failedCount ? "attention" : ""}>
          <span>Needs attention</span>
          <strong>{failedCount}</strong>
          <p>{failedCount ? "Retry extraction or upload a cleaner PDF." : "No failed source prep right now."}</p>
        </article>
        <article>
          <span>Linked</span>
          <strong>{linkedCount}/{documents.length || 0}</strong>
          <p>Linked sources can create topic-aware notes, cards, and AI context.</p>
        </article>
      </section>
      {prepareFeedback && <p className="library-feedback" role="status">{prepareFeedback}</p>}

      <section className="library-section">
        <div className="library-section-heading"><div><p className="eyebrow">Your uploads</p><h2>Study library</h2></div></div>
        {filteredDocuments.length > 0 ? (
          <div className="source-list">
            {filteredDocuments.map((document) => (
              <article key={document.id}>
                <span className={`source-document ${document.kind}`}>{document.kind === "textbook" ? "BK" : "PDF"}</span>
                <span><strong>{document.title}</strong><small>{kindLabels[document.kind]} · Added {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(document.createdAt))}{document.linkedTopics.length ? ` · ${document.linkedTopics.map((topic) => topic.name).join(", ")}` : " · Unlinked"}</small></span>
                <span className={`document-status ${document.status}`}>{statusLabels[document.status]}</span>
                <span className="source-actions">
                  {(document.status === "pending" || document.status === "failed") && <button className="source-prepare" onClick={() => prepareDocument(document)} disabled={preparingDocumentId === document.id}>{preparingDocumentId === document.id ? "Preparing…" : document.status === "failed" ? "Retry" : "Prepare"}</button>}
                  <button className="source-open" onClick={() => onOpenDocument(document)}>Open →</button>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-empty"><span>↑</span><h3>{query || filter !== "all" ? "No matching sources" : "Your study library starts here"}</h3><p>{query || filter !== "all" ? "Try another search or filter." : "Upload a permitted PDF to keep it securely in your workspace."}</p>{!query && filter === "all" && <button className="button primary" onClick={onOpenUpload}>Upload your first PDF</button>}</div>
        )}
      </section>

      <section className="library-notice"><span>⌾</span><div><strong>Your material stays yours.</strong><p>PDFs are private by default. Page extraction, source-grounded chat, and the reader will build on these secure uploads.</p></div></section>
      <style jsx>{`
        .library-page { max-width: 1180px; margin: 0 auto; padding: 55px 58px 80px; }.library-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }.library-header h1 { margin: 0 0 9px; font: 45px Georgia, serif; font-weight: 500; letter-spacing: -1.5px; }.library-header p:not(.eyebrow) { max-width: 610px; margin: 0; color: #66747a; font-size: 14px; }.library-tools { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 35px 0; }.library-search { width: min(420px, 100%); display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fffefa; border: 1px solid #dce2dc; border-radius: 7px; color: #7b8981; }.library-search input { min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font-size: 12px; }.filter-row { display: flex; gap: 6px; }.filter { border: 1px solid #dce2dc; border-radius: 99px; padding: 7px 10px; color: #64736d; background: transparent; font-size: 11px; }.filter.active { color: #31715e; background: #e7f1e8; border-color: #cfe0d3; font-weight: 700; }.library-readiness { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: -12px 0 18px; }.library-readiness article { min-height: 112px; padding: 16px; border: 1px solid #dfe7df; border-radius: 12px; background: linear-gradient(145deg, #fffefa, #f4f8f3); box-shadow: 0 8px 24px rgba(32,52,42,.032); }.library-readiness article.attention { border-color: #efd0ca; background: #fff7f4; }.library-readiness span { color: #718078; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }.library-readiness strong { display: block; margin-top: 9px; color: #263d37; font: 27px Georgia, serif; font-weight: 500; }.library-readiness p { margin: 5px 0 0; color: #65756e; font-size: 11px; line-height: 1.45; }.library-feedback { margin: 0 0 20px; padding: 10px 12px; border-radius: 9px; color: #315f54; background: #e8f2eb; font-size: 12px; font-weight: 800; }.library-section { margin-top: 35px; }.library-section-heading { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }.library-section-heading h2 { margin: 0; font: 22px Georgia, serif; font-weight: 500; }.source-list { display: grid; gap: 8px; }.source-list article { width: 100%; display: grid; grid-template-columns: 42px 1fr auto auto; align-items: center; gap: 13px; padding: 12px; border: 1px solid #e0e5e0; border-radius: 9px; background: #fffefa; color: #2d3939; text-align: left; }.source-list article:hover { border-color: #b8d0be; }.source-document { display: grid; place-items: center; width: 31px; height: 39px; color: white; border-radius: 3px 5px 5px 3px; background: #788d7e; font: 9px Georgia, serif; }.source-document.textbook { background: #486a80; }.source-document.lecture { background: #bd8d45; }.source-list strong, .source-list small { display: block; }.source-list strong { font-size: 12px; }.source-list small { margin-top: 4px; color: #718078; font-size: 10px; }.document-status { border-radius: 99px; padding: 5px 7px; color: #59736a; background: #edf2ee; font-size: 10px; }.document-status.ready { color: #39765e; background: #e5f1e7; }.document-status.processing { color: #8a6c36; background: #fff3dc; }.document-status.failed { color: #954747; background: #fae8e7; }.source-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }.source-open, .source-prepare { border: 0; background: transparent; color: #3d796d; font-size: 11px; font-weight: 800; }.source-prepare { border-radius: 999px; padding: 7px 10px; background: #e8f1e9; }.source-prepare:disabled { opacity: .65; }.library-empty { display: grid; place-items: center; min-height: 270px; padding: 32px; border: 1px dashed #bccbbf; border-radius: 12px; background: #fbfcf9; text-align: center; }.library-empty > span { display: grid; place-items: center; width: 43px; height: 43px; border-radius: 50%; color: #39765e; background: #e4f0e6; font-size: 22px; }.library-empty h3 { margin: 15px 0 6px; font: 22px Georgia, serif; font-weight: 500; }.library-empty p { max-width: 340px; margin: 0 0 17px; color: #6b7974; font-size: 12px; line-height: 1.5; }.library-notice { display: flex; gap: 12px; margin-top: 35px; padding: 17px; border: 1px solid #d9e8dc; border-radius: 9px; background: #eef6f0; }.library-notice > span { color: #467e65; font-size: 20px; }.library-notice strong { font-size: 12px; }.library-notice p { margin: 4px 0 0; max-width: 600px; color: #62756c; font-size: 11px; line-height: 1.45; } @media (max-width: 950px) { .library-readiness { grid-template-columns: repeat(2, minmax(0, 1fr)); } } @media (max-width: 750px) { .library-page { padding: 32px 18px 70px; }.library-header { display: grid; }.library-header h1 { font-size: 38px; }.library-header .button { justify-self: start; }.library-tools { display: grid; margin: 28px 0; }.library-readiness { grid-template-columns: 1fr; }.filter-row { overflow: auto; }.source-list article { grid-template-columns: 42px 1fr; align-items: start; }.source-actions { grid-column: 1 / -1; justify-content: flex-start; }.document-status { display: none; } }
      `}</style>
    </div>
  );
}

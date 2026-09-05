"use client";

import { TopicAtlasPanel } from "./TopicAtlasPanel";
import type { StudyCourse, StudyDocument, StudyExam, StudyFlashcard, StudyNote, StudyPlanBlock, StudyTopic } from "./types";

type TopicDashboardProps = {
  topic: StudyTopic;
  course: StudyCourse | null;
  documents: StudyDocument[];
  notes: StudyNote[];
  flashcards: StudyFlashcard[];
  exams: StudyExam[];
  planBlocks: StudyPlanBlock[];
  onOpenDocument: (document: StudyDocument) => void;
  onOpenNotes: () => void;
  onOpenCards: () => void;
  onOpenUpload: () => void;
  onOpenPlanner: () => void;
};

export function TopicDashboard({ topic, course, documents, notes, flashcards, exams, planBlocks, onOpenDocument, onOpenNotes, onOpenCards, onOpenUpload, onOpenPlanner }: TopicDashboardProps) {
  const topicDocuments = documents.filter((document) => document.linkedTopics.some((linkedTopic) => linkedTopic.id === topic.id));
  const topicNotes = notes.filter((note) => note.topicId === topic.id);
  const topicCards = flashcards.filter((card) => card.topicId === topic.id);
  const keptCards = topicCards.filter((card) => card.isKept).length;
  const readySources = topicDocuments.filter((document) => document.status === "ready").length;
  const linkedExams = exams.filter((exam) => exam.topics.some((examTopic) => examTopic.topicId === topic.id));
  const upcomingBlocks = planBlocks.filter((block) => block.topicId === topic.id && block.status === "planned").sort((first, second) => first.startsOn.localeCompare(second.startsOn));
  const briefAction = !topicDocuments.length ? "Add a source" : !topicNotes.length ? "Write first note" : !keptCards ? "Create cards" : upcomingBlocks.length ? "Study next block" : "Plan revision";

  return <div className="topic-dashboard">
    <header className="topic-header"><div><p className="breadcrumb">{course?.name ?? "Study workspace"} <span>/</span> Topic</p><h1>{topic.name}</h1><p className="objective"><span>Learning objective</span> {topic.learningObjectives[0]?.body ?? "Add a learning objective when you are ready to focus this topic."}</p></div><button className="button primary" onClick={onOpenUpload}>+ Add source</button></header>
    <section className="topic-brief" aria-label="Topic study brief">
      <div>
        <p className="eyebrow">Study brief</p>
        <h2>{briefAction}</h2>
        <p>{upcomingBlocks[0] ? `Next planned block: ${upcomingBlocks[0].title}.` : linkedExams[0] ? `Appears in ${linkedExams[0].title}.` : "Build the source → note → card loop for this topic."}</p>
      </div>
      <dl>
        <div><dt>Ready sources</dt><dd>{readySources}/{topicDocuments.length}</dd></div>
        <div><dt>Notes</dt><dd>{topicNotes.length}</dd></div>
        <div><dt>Kept cards</dt><dd>{keptCards}</dd></div>
        <div><dt>Exams</dt><dd>{linkedExams.length}</dd></div>
      </dl>
      <div className="brief-actions">
        <button className="button ghost" onClick={onOpenNotes}>{topicNotes.length ? "Open notes" : "Write note"}</button>
        <button className="button ghost" onClick={onOpenCards}>{topicCards.length ? "Review cards" : "Make cards"}</button>
        <button className="button ghost" onClick={onOpenPlanner}>Plan</button>
      </div>
    </section>
    <section className="topic-grid"><TopicAtlasPanel topic={topic} documents={documents} notes={notes} flashcards={flashcards} exams={exams} planBlocks={planBlocks} onOpenDocument={onOpenDocument} onOpenNotes={onOpenNotes} onOpenCards={onOpenCards} onOpenPlanner={onOpenPlanner} /><article className="topic-panel sources"><div className="panel-heading"><div><p className="eyebrow">Sources</p><h2>Your study material</h2></div><button className="text-button" onClick={onOpenUpload}>+ Add source</button></div>{topicDocuments.length ? <div className="source-list">{topicDocuments.map((document) => <button key={document.id} onClick={() => onOpenDocument(document)}><span className={`source-icon ${document.kind}`}>{document.kind === "textbook" ? "BK" : "PDF"}</span><span><strong>{document.title}</strong><small>{document.status === "ready" ? `${document.pageCount} pages ready` : document.status === "failed" ? "Needs attention" : "Preparing source"}</small></span><b>Open →</b></button>)}</div> : <div className="panel-empty"><p>No sources linked yet.</p><button className="button ghost" onClick={onOpenUpload}>Add a PDF</button></div>}</article>
      <article className="topic-panel next-step"><p className="eyebrow">Next step</p><h2>{topicDocuments.length ? "Turn what you read into durable study material." : "Add a source to start studying this topic."}</h2><p>{topicDocuments.length ? "Save notes in your own words and create a small set of cards worth revising." : "Upload a permitted PDF and keep it connected to this topic from the beginning."}</p><div>{topicDocuments.length ? <><button className="button dark" onClick={onOpenNotes}>Open notes →</button><button className="text-button" onClick={onOpenCards}>Review cards →</button></> : <button className="button dark" onClick={onOpenUpload}>Add source →</button>}</div></article>
      <article className="topic-panel notes"><div className="panel-heading"><div><p className="eyebrow">Notes</p><h2>{topicNotes.length ? `${topicNotes.length} saved ${topicNotes.length === 1 ? "note" : "notes"}` : "No notes yet"}</h2></div><button className="text-button" onClick={onOpenNotes}>{topicNotes.length ? "Open notes" : "Create note"}</button></div>{topicNotes.length ? <div className="note-list">{topicNotes.slice(0, 3).map((note) => <button key={note.id} onClick={onOpenNotes}><span>↗</span><div><strong>{note.title}</strong><small>{note.citations.length ? `${note.citations.length} source link${note.citations.length === 1 ? "" : "s"}` : "No source links yet"}</small></div></button>)}</div> : <div className="panel-empty small"><p>Capture the useful bits in your own words.</p></div>}</article>
      <article className="topic-panel cards"><div className="cards-count">{keptCards}</div><div><p className="eyebrow">Kept cards</p><h2>{keptCards ? "Ready for Anki" : "No cards kept yet"}</h2><p>{topicCards.length ? `${topicCards.length} card ${topicCards.length === 1 ? "draft" : "drafts"} in this topic.` : "Create small, source-linked cards when you are ready."}</p><button className="text-button" onClick={onOpenCards}>{topicCards.length ? "Review cards →" : "Create cards →"}</button></div></article></section>
    <style jsx>{`.topic-dashboard { max-width: 1220px; margin: 0 auto; padding: 55px 58px 100px; }.topic-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 30px; margin-bottom: 24px; }.breadcrumb { margin: 0 0 12px; color: #718078; font-size: 13px; }.breadcrumb span { color: #a9b0ad; margin: 0 4px; }.topic-header h1 { margin: 0 0 14px; color: #202b2e; font: 50px Georgia, serif; font-weight: 500; letter-spacing: -1.8px; }.objective { max-width: 680px; margin: 0; color: #4e5c60; font-size: 14px; line-height: 1.55; }.objective span { color: #278260; font-weight: 700; margin-right: 7px; }.topic-brief { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 24px; margin-bottom: 24px; padding: 22px; border: 1px solid #dbe6dc; border-radius: 14px; background: linear-gradient(135deg, #fffefa, #eaf3ec); box-shadow: 0 8px 24px rgba(32,52,42,.032); }.topic-brief h2 { margin: 0; color: #263d37; font: 26px Georgia, serif; font-weight: 500; }.topic-brief p:not(.eyebrow) { margin: 7px 0 0; color: #61716b; font-size: 12px; line-height: 1.45; }.topic-brief dl { display: grid; grid-template-columns: repeat(4, 74px); gap: 10px; margin: 0; }.topic-brief dt { color: #63766d; font-size: 9px; text-transform: uppercase; letter-spacing: .07em; }.topic-brief dd { margin: 5px 0 0; color: #315a4f; font: 21px Georgia, serif; }.brief-actions { display: grid; gap: 7px; }.topic-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 18px; }.topic-panel { border: 1px solid #e2e5e1; border-radius: 12px; background: #fffefa; box-shadow: 0 8px 22px rgba(33,48,44,.025); }.sources, .notes { padding: 22px; }.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }.topic-panel h2 { margin: 0; font: 21px Georgia, serif; font-weight: 500; letter-spacing: -.3px; }.source-list, .note-list { display: grid; gap: 8px; margin-top: 15px; }.source-list button { display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: 11px; width: 100%; padding: 10px; border: 1px solid #e0e5e0; border-radius: 8px; background: white; text-align: left; color: #344341; }.source-list button:hover { border-color: #b8d0be; }.source-icon { display: grid; place-items: center; width: 29px; height: 37px; border-radius: 3px 5px 5px 3px; color: white; background: #748d7e; font: 9px Georgia, serif; }.source-icon.textbook { background: #496b80; }.source-icon.lecture { background: #bd8d45; }.source-list strong, .source-list small, .note-list strong, .note-list small { display: block; }.source-list strong, .note-list strong { font-size: 12px; }.source-list small, .note-list small { margin-top: 3px; color: #718078; font-size: 10px; }.source-list b { color: #3d796d; font-size: 10px; }.panel-empty { display: grid; justify-items: start; gap: 10px; margin-top: 16px; padding: 19px; border: 1px dashed #bdcdbf; border-radius: 8px; background: #fbfcf9; }.panel-empty p { margin: 0; color: #718078; font-size: 12px; }.panel-empty.small { padding: 14px; }.next-step { min-height: 272px; padding: 26px; background: #e1ece4; border-color: #d1dfd4; }.next-step h2 { margin: 0 0 9px; font-size: 26px; }.next-step p:not(.eyebrow) { margin: 0 0 19px; color: #546760; font-size: 13px; line-height: 1.5; }.next-step div { display: flex; align-items: center; gap: 14px; }.note-list button { display: flex; align-items: center; gap: 10px; border: 0; border-top: 1px solid #eef0ed; padding: 12px 0 0; background: transparent; text-align: left; color: #3e4c4c; }.note-list button span { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 6px; color: #39765e; background: #e8f0ea; }.cards { display: flex; align-items: center; gap: 19px; padding: 24px; }.cards-count { display: grid; flex: 0 0 auto; place-items: center; width: 66px; height: 66px; border-radius: 50%; color: #b47722; background: #fff0d9; font: 27px Georgia, serif; }.cards p:not(.eyebrow) { margin: 8px 0; color: #6b7974; font-size: 12px; line-height: 1.45; } @media (max-width: 1050px) { .topic-brief { grid-template-columns: 1fr; align-items: start; }.topic-brief dl { grid-template-columns: repeat(4, minmax(0, 1fr)); }.brief-actions { display: flex; flex-wrap: wrap; } } @media (max-width: 850px) { .topic-dashboard { padding: 40px 32px 80px; }.topic-grid { grid-template-columns: 1fr; } } @media (max-width: 600px) { .topic-dashboard { padding: 30px 18px 70px; }.topic-header { display: grid; }.topic-header h1 { font-size: 38px; }.topic-header .button { justify-self: start; }.topic-brief dl { grid-template-columns: repeat(2, minmax(0, 1fr)); } }`}</style>
  </div>;
}

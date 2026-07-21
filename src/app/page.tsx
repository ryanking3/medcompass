"use client";

import { FormEvent, useState } from "react";

type View = "dashboard" | "reader" | "notes" | "cards";

const cards = [
  {
    front: "What event produces the first heart sound (S1)?",
    back: "Closure of the atrioventricular valves at the beginning of ventricular systole.",
    source: "Guyton & Hall, p. 12",
  },
  {
    front: "During which phase of the cardiac cycle are all four valves closed?",
    back: "Isovolumetric contraction and isovolumetric relaxation.",
    source: "Guyton & Hall, pp. 12–13",
  },
  {
    front: "What causes the aortic valve to open?",
    back: "Ventricular pressure rises above aortic pressure during ventricular ejection.",
    source: "Guyton & Hall, p. 13",
  },
];

function Brand() {
  return (
    <div className="brand" aria-label="MedCompass">
      <span className="brand-mark" aria-hidden="true">M</span>
      <span>MedCompass</span>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [toast, setToast] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={view === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setView("dashboard")}>
            <Icon>⌂</Icon> Home
          </button>
          <button className="nav-item" onClick={() => notify("Your library will appear here once sources are uploaded.")}>
            <Icon>▤</Icon> Library
          </button>
          <button className={view === "notes" ? "nav-item active" : "nav-item"} onClick={() => setView("notes")}>
            <Icon>↗</Icon> Notes
          </button>
          <button className={view === "cards" ? "nav-item active" : "nav-item"} onClick={() => setView("cards")}>
            <Icon>◇</Icon> Cards
          </button>
        </nav>

        <div className="sidebar-section">
          <p className="eyebrow">Current course</p>
          <button className="course-switcher" onClick={() => notify("Course switching is part of the upcoming workspace setup.")}>
            <span className="course-dot" />
            <span>Graduate Entry Medicine</span>
            <span className="chevron">⌄</span>
          </button>
        </div>

        <div className="topic-list">
          <p className="eyebrow">Topics</p>
          <button className="topic-item active" onClick={() => setView("dashboard")}>Cardiac cycle</button>
          <button className="topic-item" onClick={() => notify("This is a static prototype; only Cardiac cycle is available.")}>Cardiac output</button>
          <button className="topic-item" onClick={() => notify("This is a static prototype; only Cardiac cycle is available.")}>ECG fundamentals</button>
          <button className="subtle-button add-topic" onClick={() => setTopicOpen(true)}>+ New topic</button>
        </div>

        <div className="sidebar-footer">
          <button className="profile-button" onClick={() => notify("Account settings will be added with authentication.")}>
            <span className="avatar">RK</span>
            <span><strong>Ryan King</strong><small>Student workspace</small></span>
            <span className="chevron">⋯</span>
          </button>
        </div>
      </aside>

      <section className="content-area">
        {view === "dashboard" && <Dashboard onOpenReader={() => setView("reader")} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} onOpenUpload={() => setUploadOpen(true)} notify={notify} />}
        {view === "reader" && <Reader onBack={() => setView("dashboard")} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} notify={notify} />}
        {view === "notes" && <Notes onBack={() => setView("dashboard")} notify={notify} />}
        {view === "cards" && <Cards onBack={() => setView("dashboard")} notify={notify} />}
      </section>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} notify={notify} />}
      {topicOpen && <TopicModal onClose={() => setTopicOpen(false)} notify={notify} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Dashboard({ onOpenReader, onOpenCards, onOpenNotes, onOpenUpload, notify }: { onOpenReader: () => void; onOpenCards: () => void; onOpenNotes: () => void; onOpenUpload: () => void; notify: (message: string) => void }) {
  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">Graduate Entry Medicine <span>/</span> Cardiovascular system</p>
          <h1>Cardiac cycle</h1>
          <p className="objective"><span>Learning objective</span> Explain the phases of the cardiac cycle and the pressure changes that drive them.</p>
        </div>
        <button className="button primary" onClick={onOpenUpload}>+ Add source</button>
      </header>

      <section className="dashboard-grid">
        <article className="panel sources-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Sources</p><h2>Your study material</h2></div>
            <button className="text-button" onClick={() => notify("Your complete source library is coming next.")}>View library</button>
          </div>
          <button className="source-card ready" onClick={onOpenReader}>
            <span className="book-cover book-cover-blue">GH</span>
            <span className="source-info"><strong>Guyton &amp; Hall Textbook</strong><small>Chapter 9 · 38 pages</small></span>
            <span className="source-status">Ready <span>→</span></span>
          </button>
          <button className="source-card ready" onClick={onOpenReader}>
            <span className="book-cover book-cover-amber">L3</span>
            <span className="source-info"><strong>Cardiovascular lecture 03</strong><small>Professor slides · 42 pages</small></span>
            <span className="source-status">Ready <span>→</span></span>
          </button>
          <button className="upload-source" onClick={onOpenUpload}>
            <span>+</span><div><strong>Add a source</strong><small>Textbook chapter, lecture, or permitted PDF</small></div>
          </button>
        </article>

        <article className="panel continue-panel">
          <div className="continue-copy">
            <p className="eyebrow">Continue studying</p>
            <h2>Pick up where you left off</h2>
            <p>You were reading the pressure changes during ventricular ejection.</p>
            <button className="button dark" onClick={onOpenReader}>Open textbook <span>→</span></button>
          </div>
          <div className="mini-page" aria-hidden="true">
            <span className="mini-label">p. 12</span><i /><i /><i className="highlight-line" /><i /><i /><i />
          </div>
        </article>

        <article className="panel notes-panel">
          <div className="panel-heading"><div><p className="eyebrow">Notes</p><h2>Two saved notes</h2></div><button className="text-button" onClick={onOpenNotes}>Open notes</button></div>
          <div className="note-row"><span className="note-icon">↗</span><div><strong>Ventricular filling</strong><small>From Guyton &amp; Hall, p. 11</small></div></div>
          <div className="note-row"><span className="note-icon">↗</span><div><strong>Heart sounds and valve closure</strong><small>From lecture 03, slide 17</small></div></div>
        </article>

        <article className="panel cards-panel">
          <div className="cards-orb">6</div>
          <div><p className="eyebrow">Draft cards</p><h2>Ready for your review</h2><p>Review each card before it becomes part of your Anki deck.</p><button className="text-button arrow-button" onClick={onOpenCards}>Review cards <span>→</span></button></div>
        </article>
      </section>

      <section className="recent-section">
        <div className="section-heading"><div><p className="eyebrow">Tutor</p><h2>Recent study activity</h2></div><button className="text-button" onClick={onOpenReader}>Open tutor</button></div>
        <button className="activity-row" onClick={onOpenReader}>
          <span className="activity-icon">✦</span>
          <span><strong>Why does aortic pressure rise after ventricular ejection begins?</strong><small>Asked from Guyton &amp; Hall, pages 12–13 · Yesterday</small></span>
          <span className="activity-arrow">→</span>
        </button>
      </section>
    </div>
  );
}

function Notes({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  const [title, setTitle] = useState("Ventricular filling");
  const [body, setBody] = useState("During ventricular diastole, the atrioventricular valves are open and blood moves from the atria into the ventricles. Most ventricular filling occurs passively; atrial contraction contributes the final portion of end-diastolic volume.");

  return (
    <div className="notes-workspace">
      <header className="notes-header"><button className="back-link" onClick={onBack}>← <span>Cardiac cycle</span></button><div><p className="eyebrow">Topic notes</p><h1>Keep the useful bits</h1></div><button className="button primary" onClick={() => notify("A new blank note was created in this prototype.")}>+ New note</button></header>
      <div className="notes-layout">
        <aside className="notes-list"><div className="notes-search">⌕ <input placeholder="Search notes" /></div><p className="eyebrow">Saved notes</p><button className="saved-note active"><strong>Ventricular filling</strong><small>Guyton &amp; Hall · p. 11</small></button><button className="saved-note"><strong>Heart sounds and valve closure</strong><small>Lecture 03 · slide 17</small></button><button className="saved-note"><strong>Isovolumetric contraction</strong><small>Guyton &amp; Hall · p. 12</small></button></aside>
        <section className="note-editor"><div className="editor-toolbar"><span>↶ &nbsp; ↷</span><span>Normal <b> B </b> <i>I</i> &nbsp; ⛓</span><span>Saved just now</span></div><input className="note-title" value={title} onChange={(event) => setTitle(event.target.value)} /><textarea className="note-body" value={body} onChange={(event) => setBody(event.target.value)} /><div className="note-citation"><span>↗</span><div><strong>Guyton &amp; Hall Textbook, page 11</strong><small>“During ventricular filling, the atrioventricular valves are open…”</small></div><button onClick={() => notify("The cited page will open in the reader.")}>Open source →</button></div></section>
        <aside className="note-tools"><p className="eyebrow">Study actions</p><h2>Use this note</h2><button onClick={() => notify("A concise summary will be generated once the AI tutor is connected.")}>✦ Summarise this note</button><button onClick={() => notify("This note will become an editable card draft.")}>◇ Create flashcards</button><button onClick={() => notify("Objective coverage will be available with the course backend.")}>✓ Check objective coverage</button><hr /><p className="eyebrow">Linked sources</p><button className="linked-source" onClick={() => notify("The cited page will open in the reader.")}>Guyton &amp; Hall <span>p. 11 →</span></button></aside>
      </div>
      <style jsx>{`
        .notes-workspace { min-height: 100vh; background: #f8f8f4; }.notes-header { height: 128px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 22px 58px; background: #fffefa; border-bottom: 1px solid #dde2df; }.notes-header > div { text-align: center; }.notes-header h1 { margin: 0; font: 29px Georgia, serif; font-weight: 500; letter-spacing: -.5px; }.notes-header .button { justify-self: end; }
        .notes-layout { height: calc(100vh - 128px); display: grid; grid-template-columns: 240px minmax(360px, 1fr) 250px; }.notes-list { padding: 24px 16px; border-right: 1px solid #dde2df; background: #f4f6f2; }.notes-search { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #dce2dc; border-radius: 6px; padding: 7px 9px; color: #7b8981; margin-bottom: 22px; }.notes-search input { min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font-size: 12px; }.saved-note { width: 100%; display: grid; gap: 4px; border: 0; border-radius: 7px; padding: 11px; background: transparent; text-align: left; color: #3e4c4c; }.saved-note:hover { background: #e7ece8; }.saved-note.active { background: #dceadf; }.saved-note strong { font-size: 12px; }.saved-note small { color: #718078; font-size: 10px; }.note-editor { padding: 24px clamp(28px, 5vw, 70px); overflow: auto; background: #fffefa; }.editor-toolbar { display: flex; justify-content: space-between; color: #78857f; font-size: 11px; padding-bottom: 18px; border-bottom: 1px solid #e8ebe7; }.editor-toolbar b { color: #425652; }.note-title { width: 100%; border: 0; outline: 0; padding: 30px 0 12px; color: #253233; background: transparent; font: 33px Georgia, serif; letter-spacing: -.8px; }.note-body { width: 100%; min-height: 250px; resize: vertical; border: 0; outline: 0; padding: 8px 0; color: #475657; background: transparent; font: 16px/1.75 Georgia, serif; }.note-citation { display: flex; gap: 11px; align-items: center; margin-top: 23px; padding: 13px; background: #f1f7f2; border-left: 3px solid #99bca4; border-radius: 0 7px 7px 0; }.note-citation > span { color: #42795e; }.note-citation strong, .note-citation small { display: block; }.note-citation strong { font-size: 11px; }.note-citation small { margin-top: 4px; color: #667570; font-size: 10px; }.note-citation button { margin-left: auto; border: 0; background: transparent; color: #3e786b; white-space: nowrap; font-size: 10px; font-weight: 700; }.note-tools { padding: 27px 18px; border-left: 1px solid #dde2df; background: #f7f8f5; }.note-tools h2 { margin: 0 0 15px; font: 20px Georgia, serif; font-weight: 500; }.note-tools > button { width: 100%; margin: 6px 0; border: 1px solid #dbe2dc; border-radius: 7px; padding: 10px; background: white; color: #46645d; text-align: left; font-size: 11px; font-weight: 700; }.note-tools > button:hover { border-color: #a9c4b0; }.note-tools hr { margin: 25px 0; border: 0; border-top: 1px solid #dde2df; }.linked-source { width: 100%; display: flex; justify-content: space-between; border: 0; padding: 0; color: #45786c; background: transparent; font-size: 11px; font-weight: 700; }
        @media (max-width: 950px) { .notes-header { padding: 22px 30px; }.notes-layout { grid-template-columns: 200px minmax(300px, 1fr); }.note-tools { display: none; } } @media (max-width: 700px) { .notes-header { height: auto; min-height: 82px; grid-template-columns: 1fr auto; padding: 20px; }.notes-header > div { display: none; }.notes-header .button { font-size: 11px; padding: 9px 11px; }.notes-layout { height: calc(100vh - 82px); grid-template-columns: 1fr; }.notes-list { display: none; }.note-editor { padding: 22px; } }
      `}</style>
    </div>
  );
}

function UploadModal({ onClose, notify }: { onClose: () => void; notify: (message: string) => void }) {
  const [fileName, setFileName] = useState("");
  const [stage, setStage] = useState<"choose" | "processing" | "ready">("choose");

  const startProcessing = () => {
    if (!fileName) return;
    setStage("processing");
    window.setTimeout(() => setStage("ready"), 1400);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close upload dialog">×</button>
        <p className="eyebrow">Add a private source</p>
        <h2 id="upload-title">Bring a textbook or lecture into this topic</h2>
        <p className="modal-intro">Your source will be available only in this study workspace. Upload only material you are permitted to use, and never upload patient-identifiable information.</p>

        {stage === "choose" && <>
          <label className={fileName ? "file-drop selected" : "file-drop"}>
            <input type="file" accept="application/pdf" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
            <span className="file-icon">↑</span>
            <strong>{fileName || "Choose a PDF"}</strong>
            <small>{fileName ? "Ready to process in the prototype" : "Textbook chapter, lecture, or other permitted study PDF"}</small>
          </label>
          <label className="acknowledgement"><input type="checkbox" defaultChecked /> <span>I have the right to upload this material and understand it is for my own study use.</span></label>
          <div className="modal-actions"><button className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={!fileName} onClick={startProcessing}>Add source →</button></div>
          <p className="prototype-note">Prototype state only — the file is not uploaded or retained yet.</p>
        </>}

        {stage === "processing" && <div className="processing-state"><div className="processing-orb"><span /></div><h3>Preparing your source</h3><p>Extracting pages and creating a private study index…</p><div className="progress-track"><span /></div><small>{fileName}</small></div>}

        {stage === "ready" && <div className="ready-state"><div className="ready-check">✓</div><h3>Source is ready to study</h3><p><strong>{fileName}</strong> is attached to Cardiac cycle. In the connected product, this is where page extraction and indexing will have completed.</p><button className="button primary" onClick={() => { onClose(); notify("Source added to Cardiac cycle."); }}>Done</button></div>}

        <style jsx>{`
          .modal-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(23, 36, 35, .35); backdrop-filter: blur(4px); }
          .upload-modal { width: min(510px, 100%); position: relative; background: #fffefa; border-radius: 14px; padding: 34px; box-shadow: 0 24px 80px rgba(22, 40, 38, .28); }
          .modal-close { position: absolute; top: 17px; right: 17px; width: 31px; height: 31px; border-radius: 50%; border: 0; background: #eef1ed; color: #5a6866; font-size: 21px; line-height: 1; }
          .upload-modal h2 { max-width: 400px; margin: 0 0 12px; font: 27px/1.16 Georgia, serif; font-weight: 500; letter-spacing: -.5px; }
          .modal-intro { margin: 0 0 23px; color: #5e6d69; font-size: 13px; line-height: 1.55; }
          .file-drop { min-height: 146px; display: grid; place-items: center; align-content: center; gap: 5px; padding: 18px; border: 1px dashed #aabbb1; border-radius: 9px; background: #f8fbf7; color: #426d60; text-align: center; cursor: pointer; }
          .file-drop:hover, .file-drop.selected { background: #eff7f0; border-color: #5e957c; }.file-drop input { position: absolute; width: 1px; height: 1px; opacity: 0; }
          .file-icon { display: grid; place-items: center; width: 34px; height: 34px; margin-bottom: 3px; border-radius: 50%; background: #d9ebe0; color: #39765e; font-weight: 700; font-size: 20px; }.file-drop strong { font-size: 13px; }.file-drop small { color: #73827b; font-size: 11px; }
          .acknowledgement { display: flex; gap: 9px; align-items: flex-start; margin: 16px 0; color: #63716d; font-size: 11px; line-height: 1.45; }.acknowledgement input { margin: 2px 0 0; accent-color: #497970; }.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }.prototype-note { margin: 15px 0 0; color: #929b95; text-align: center; font-size: 10px; }
          .processing-state, .ready-state { min-height: 255px; display: grid; place-items: center; align-content: center; text-align: center; }.processing-state h3, .ready-state h3 { margin: 14px 0 7px; font: 22px Georgia, serif; font-weight: 500; }.processing-state p, .ready-state p { max-width: 340px; margin: 0; color: #60716c; font-size: 13px; line-height: 1.55; }
          .processing-orb, .ready-check { display: grid; place-items: center; width: 62px; height: 62px; border-radius: 50%; background: #e5f1e8; color: #39765e; }.processing-orb span { width: 25px; height: 25px; border: 3px solid #9fc4ab; border-top-color: #36735b; border-radius: 50%; animation: spin 900ms linear infinite; }.progress-track { width: 230px; height: 6px; margin: 20px 0 9px; border-radius: 99px; overflow: hidden; background: #e7ece7; }.progress-track span { display: block; width: 72%; height: 100%; border-radius: inherit; background: #679a7a; animation: progress 1.2s ease-in-out infinite alternate; }.processing-state small { color: #87918c; font-size: 10px; }.ready-check { font-size: 28px; }.ready-state .button { margin-top: 21px; }
          @keyframes spin { to { transform: rotate(360deg); } } @keyframes progress { from { transform: translateX(-18%); } to { transform: translateX(38%); } }
        `}</style>
      </section>
    </div>
  );
}

function TopicModal({ onClose, notify }: { onClose: () => void; notify: (message: string) => void }) {
  const [topic, setTopic] = useState("");

  const createTopic = (event: FormEvent) => {
    event.preventDefault();
    if (!topic.trim()) return;
    onClose();
    notify(`${topic.trim()} was created in Graduate Entry Medicine.`);
  };

  return (
    <div className="topic-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="topic-modal" role="dialog" aria-modal="true" aria-labelledby="topic-title" onSubmit={createTopic} onMouseDown={(event) => event.stopPropagation()}>
        <button className="topic-close" type="button" onClick={onClose} aria-label="Close topic dialog">×</button>
        <p className="eyebrow">New study topic</p>
        <h2 id="topic-title">Create a focused place to study</h2>
        <p>Topics keep sources, notes, tutor conversations, and cards together around one area of learning.</p>
        <label>Course<select defaultValue="Graduate Entry Medicine"><option>Graduate Entry Medicine</option></select></label>
        <label>Module <input defaultValue="Cardiovascular system" /></label>
        <label>Topic <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Cardiac output" autoFocus /></label>
        <label>Learning objective <textarea placeholder="e.g. Explain the factors that determine cardiac output" /></label>
        <div className="topic-actions"><button className="button ghost" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={!topic.trim()} type="submit">Create topic →</button></div>
        <small>Prototype state only — topics are not persisted until the workspace backend is connected.</small>
        <style jsx>{`
          .topic-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(23, 36, 35, .35); backdrop-filter: blur(4px); }
          .topic-modal { width: min(500px, 100%); position: relative; display: grid; gap: 13px; background: #fffefa; border-radius: 14px; padding: 34px; box-shadow: 0 24px 80px rgba(22, 40, 38, .28); }.topic-close { position: absolute; top: 17px; right: 17px; width: 31px; height: 31px; border-radius: 50%; border: 0; background: #eef1ed; color: #5a6866; font-size: 21px; line-height: 1; }
          h2 { max-width: 380px; margin: -2px 0 0; font: 27px/1.16 Georgia, serif; font-weight: 500; letter-spacing: -.5px; } p { margin: 0 0 5px; color: #5e6d69; font-size: 13px; line-height: 1.55; } label { display: grid; gap: 6px; color: #5e6d69; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; } input, textarea, select { width: 100%; border: 1px solid #d8ded9; border-radius: 7px; padding: 10px; color: #2b3838; background: white; font-size: 13px; font-weight: 400; letter-spacing: normal; text-transform: none; outline-color: #497970; } textarea { min-height: 75px; resize: vertical; }.topic-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }.topic-modal small { color: #929b95; text-align: center; font-size: 10px; }
        `}</style>
      </form>
    </div>
  );
}

function Reader({ onBack, onOpenCards, onOpenNotes, notify }: { onBack: () => void; onOpenCards: () => void; onOpenNotes: () => void; notify: (message: string) => void }) {
  const [scope, setScope] = useState("Selected text · p. 12");
  const [question, setQuestion] = useState("");
  const [answered, setAnswered] = useState(true);

  const sendQuestion = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setAnswered(true);
    setQuestion("");
  };

  return (
    <div className="reader-page">
      <header className="reader-header">
        <button className="back-link" onClick={onBack}>← <span>Cardiac cycle</span></button>
        <div className="reader-title"><strong>Guyton &amp; Hall Textbook</strong><span>Chapter 9</span></div>
        <div className="reader-controls"><button onClick={() => notify("Page controls are represented in this prototype.")}>‹</button><span>12 / 38</span><button onClick={() => notify("Page controls are represented in this prototype.")}>›</button><span className="zoom">− &nbsp; 100% &nbsp; +</span><button onClick={() => notify("Reader settings are coming soon.")}>•••</button></div>
      </header>
      <div className="reader-layout">
        <aside className="reader-index">
          <p className="eyebrow">Contents</p>
          <strong>Chapter 9</strong>
          <button>Overview</button><button>Cardiac cycle</button><button className="index-active">Pressure changes <span>12</span></button><button>Heart sounds</button><button>Cardiac output</button>
          <div className="page-thumbnails"><p className="eyebrow">Pages</p><button className="thumbnail"><span>11</span></button><button className="thumbnail active"><span>12</span></button><button className="thumbnail"><span>13</span></button></div>
        </aside>

        <section className="document-canvas" aria-label="Textbook page 12">
          <div className="paper">
            <div className="paper-header"><span>CHAPTER 9</span><span>THE HEART AS A PUMP</span></div>
            <h2>Pressure Changes During the Cardiac Cycle</h2>
            <p>During ventricular filling, the atrioventricular valves are open and blood flows from the atria into the ventricles. The pressure in the ventricles remains low until ventricular systole begins.</p>
            <p className="selected-passage">When ventricular contraction starts, intraventricular pressure rises sharply. As soon as this pressure exceeds atrial pressure, the atrioventricular valves close. When ventricular pressure exceeds aortic pressure, the aortic valve opens and ventricular ejection begins.</p>
            <p>Although ventricular volume does not change during the first moments of contraction, the pressure continues to rise. This interval is termed the period of isovolumetric contraction.</p>
            <div className="paper-figure"><div className="graph-line graph-one" /><div className="graph-line graph-two" /><div className="axis-y" /><div className="axis-x" /><span>Ventricular pressure</span><small>Time</small></div>
            <p>At the end of systole, the ventricles begin to relax. The fall in ventricular pressure closes the aortic valve and begins the period of isovolumetric relaxation.</p>
            <div className="paper-footer">12</div>
          </div>
          <div className="selection-toolbar"><button onClick={() => setScope("Selected text · p. 12")}>✦ Ask</button><button onClick={onOpenNotes}>↗ Save note</button><button onClick={onOpenCards}>◇ Create cards</button></div>
        </section>

        <aside className="tutor-panel">
          <div className="tutor-head"><div><p className="eyebrow">Tutor</p><h2>Study this source</h2></div><button onClick={() => notify("Conversation history will be saved with the backend.")}>•••</button></div>
          <label className="scope-label">Scope<select value={scope} onChange={(event) => setScope(event.target.value)}><option>Selected text · p. 12</option><option>Pages 12–14</option><option>This source</option><option>Topic sources</option></select></label>
          <div className="chat-thread">
            <div className="student-message">Why does ventricular pressure rise before ventricular volume changes?</div>
            {answered && <div className="assistant-message"><span className="source-pill">From your sources</span><p>At the start of ventricular systole, both the atrioventricular and aortic valves are closed. The ventricle contracts against this closed chamber, so its pressure rises without blood entering or leaving it. This is <strong>isovolumetric contraction</strong>.</p><div className="citations"><button onClick={() => notify("Opened supporting passage on page 12.")}>Guyton &amp; Hall, p. 12 ↗</button></div><div className="message-actions"><button onClick={onOpenNotes}>↗ Save note</button><button onClick={onOpenCards}>◇ Create cards</button></div></div>}
          </div>
          <form className="chat-compose" onSubmit={sendQuestion}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this…" aria-label="Ask about this source" /><button type="submit" aria-label="Send question">↑</button></form>
          <p className="education-note">For study only. Do not include patient-identifiable information.</p>
        </aside>
      </div>
    </div>
  );
}

function Cards({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState(cards[0]);

  const changeCard = (next: number) => {
    const bounded = Math.max(0, Math.min(cards.length - 1, next));
    setIndex(bounded);
    setCard(cards[bounded]);
  };

  return (
    <div className="page cards-page">
      <header className="page-header compact"><div><button className="back-link" onClick={onBack}>← <span>Cardiac cycle</span></button><h1>Review cards</h1><p>Keep, edit, or remove each draft before exporting it to Anki.</p></div><div className="draft-count"><strong>6</strong><span>draft cards</span></div></header>
      <div className="card-review-layout">
        <section className="review-panel panel">
          <div className="review-header"><span className="eyebrow">Card {index + 1} of {cards.length}</span><label>Type <select><option>Basic</option><option>Cloze</option></select></label></div>
          <label className="card-field"><span>Front</span><textarea value={card.front} onChange={(event) => setCard({ ...card, front: event.target.value })} /></label>
          <label className="card-field"><span>Back</span><textarea value={card.back} onChange={(event) => setCard({ ...card, back: event.target.value })} /></label>
          <div className="review-actions"><button className="button ghost danger" onClick={() => notify("The draft card was removed in this prototype.")}>Delete</button><div><button className="button ghost" disabled={index === 0} onClick={() => changeCard(index - 1)}>← Previous</button><button className="button dark" disabled={index === cards.length - 1} onClick={() => changeCard(index + 1)}>Next →</button></div></div>
        </section>
        <aside className="source-panel panel"><p className="eyebrow">Source</p><h2>{card.source}</h2><blockquote>“When ventricular contraction starts, intraventricular pressure rises sharply…”</blockquote><button className="text-button arrow-button" onClick={() => notify("The reader will open at the cited passage.")}>Open in reader <span>→</span></button><hr /><p className="eyebrow">Quality checks</p><div className="quality good">✓ Linked to a source</div><div className="quality warning">! Similar to one draft card</div></aside>
      </div>
      <footer className="export-bar"><span><strong>5 selected</strong> &nbsp; Cards remain editable after export.</span><button className="button primary" onClick={() => notify("Anki export will be enabled after automated file compatibility checks.")}>Export selected cards →</button></footer>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";

type View = "dashboard" | "reader" | "cards";

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
          <button className="subtle-button add-topic" onClick={() => notify("Topic creation will be connected with the workspace backend.")}>+ New topic</button>
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
        {view === "dashboard" && <Dashboard onOpenReader={() => setView("reader")} onOpenCards={() => setView("cards")} notify={notify} />}
        {view === "reader" && <Reader onBack={() => setView("dashboard")} onOpenCards={() => setView("cards")} notify={notify} />}
        {view === "cards" && <Cards onBack={() => setView("dashboard")} notify={notify} />}
      </section>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Dashboard({ onOpenReader, onOpenCards, notify }: { onOpenReader: () => void; onOpenCards: () => void; notify: (message: string) => void }) {
  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">Graduate Entry Medicine <span>/</span> Cardiovascular system</p>
          <h1>Cardiac cycle</h1>
          <p className="objective"><span>Learning objective</span> Explain the phases of the cardiac cycle and the pressure changes that drive them.</p>
        </div>
        <button className="button primary" onClick={() => notify("PDF upload will be connected once the secure storage backend is in place.")}>+ Add source</button>
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
          <button className="upload-source" onClick={() => notify("Upload is deliberately deferred until private storage is configured.")}>
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
          <div className="panel-heading"><div><p className="eyebrow">Notes</p><h2>Two saved notes</h2></div><button className="text-button" onClick={() => notify("The notes editor will arrive after the reader flow is wired.")}>Open notes</button></div>
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

function Reader({ onBack, onOpenCards, notify }: { onBack: () => void; onOpenCards: () => void; notify: (message: string) => void }) {
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
          <div className="selection-toolbar"><button onClick={() => setScope("Selected text · p. 12")}>✦ Ask</button><button onClick={() => notify("This passage was saved as a new note.")}>↗ Save note</button><button onClick={onOpenCards}>◇ Create cards</button></div>
        </section>

        <aside className="tutor-panel">
          <div className="tutor-head"><div><p className="eyebrow">Tutor</p><h2>Study this source</h2></div><button onClick={() => notify("Conversation history will be saved with the backend.")}>•••</button></div>
          <label className="scope-label">Scope<select value={scope} onChange={(event) => setScope(event.target.value)}><option>Selected text · p. 12</option><option>Pages 12–14</option><option>This source</option><option>Topic sources</option></select></label>
          <div className="chat-thread">
            <div className="student-message">Why does ventricular pressure rise before ventricular volume changes?</div>
            {answered && <div className="assistant-message"><span className="source-pill">From your sources</span><p>At the start of ventricular systole, both the atrioventricular and aortic valves are closed. The ventricle contracts against this closed chamber, so its pressure rises without blood entering or leaving it. This is <strong>isovolumetric contraction</strong>.</p><div className="citations"><button onClick={() => notify("Opened supporting passage on page 12.")}>Guyton &amp; Hall, p. 12 ↗</button></div><div className="message-actions"><button onClick={() => notify("Answer saved to a new linked note.")}>↗ Save note</button><button onClick={onOpenCards}>◇ Create cards</button></div></div>}
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

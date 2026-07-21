import { FormEvent, useState } from "react";

const cards = [
  { front: "What event produces the first heart sound (S1)?", back: "Closure of the atrioventricular valves at the beginning of ventricular systole.", source: "Guyton & Hall, p. 12" },
  { front: "During which phase of the cardiac cycle are all four valves closed?", back: "Isovolumetric contraction and isovolumetric relaxation.", source: "Guyton & Hall, pp. 12–13" },
  { front: "What causes the aortic valve to open?", back: "Ventricular pressure rises above aortic pressure during ventricular ejection.", source: "Guyton & Hall, p. 13" },
];

export function StudentHome({ onOpenTopic, onOpenReader, onOpenLibrary, onOpenTopicModal }: { onOpenTopic: () => void; onOpenReader: () => void; onOpenLibrary: () => void; onOpenTopicModal: () => void }) {
  return (
    <div className="student-home">
      <header className="home-header">
        <div><p className="eyebrow">Monday, 21 July</p><h1>Good morning, Ryan.</h1><p>Here’s a calm way back into your cardiovascular study.</p></div>
        <button className="button primary" onClick={onOpenTopicModal}>+ New topic</button>
      </header>

      <section className="home-hero">
        <div className="hero-course"><span className="hero-course-dot" /><div><p className="eyebrow">Your current course</p><h2>Graduate Entry Medicine</h2><p>Cardiovascular system · 3 active topics</p></div><button onClick={onOpenTopic}>Open course →</button></div>
        <div className="hero-progress"><span>Current focus</span><strong>Cardiac cycle</strong><div className="progress-bar"><i /></div><small>2 notes · 6 draft cards · last studied yesterday</small></div>
      </section>

      <section className="home-section continue-section"><div className="section-heading"><div><p className="eyebrow">Continue studying</p><h2>One useful next step</h2></div><button className="text-button" onClick={onOpenTopic}>View topic</button></div><button className="continue-study" onClick={onOpenReader}><span className="continue-number">12</span><div><strong>Pressure changes during the cardiac cycle</strong><small>Guyton &amp; Hall Textbook · Chapter 9</small></div><span className="continue-tag">Resume reading</span><span className="activity-arrow">→</span></button></section>

      <section className="home-section"><div className="section-heading"><div><p className="eyebrow">Your topics</p><h2>Keep your work in context</h2></div><button className="text-button" onClick={onOpenTopicModal}>+ Add topic</button></div><div className="topic-cards">
        <button className="topic-card active" onClick={onOpenTopic}><span className="topic-status">In progress</span><h3>Cardiac cycle</h3><p>2 sources · 2 notes · 6 cards</p><div className="topic-card-footer"><span>Last opened yesterday</span><strong>Open →</strong></div></button>
        <button className="topic-card" onClick={onOpenTopic}><span className="topic-status muted">Ready to start</span><h3>Cardiac output</h3><p>1 source · no notes yet</p><div className="topic-card-footer"><span>Add your first note</span><strong>Open →</strong></div></button>
        <button className="topic-card" onClick={onOpenTopic}><span className="topic-status muted">Ready to start</span><h3>ECG fundamentals</h3><p>2 sources · 3 draft cards</p><div className="topic-card-footer"><span>Last opened 4 days ago</span><strong>Open →</strong></div></button>
      </div></section>

      <section className="home-bottom-grid"><article className="home-insight"><p className="eyebrow">Study insight</p><h2>Your strongest source of progress is keeping cards small and sourced.</h2><p>You have six draft cards waiting for review. Take two minutes to keep the useful ones and remove the rest.</p><button className="text-button">Review cards →</button></article><button className="home-library" style={{ border: 0, textAlign: "left" }} onClick={onOpenLibrary}><div><p className="eyebrow">Your library</p><h2>3 private sources</h2><p>Textbooks and lecture PDFs stay linked to the topics where you study them.</p></div><span className="library-stack"><i /><i /><i /></span></button></section>
      <style jsx>{`
        .student-home { max-width: 1180px; margin: 0 auto; padding: 55px 58px 90px; }.home-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 33px; }.home-header h1 { margin: 0 0 8px; color: #1b2428; font: 45px Georgia, serif; font-weight: 500; letter-spacing: -1.6px; }.home-header > div > p:not(.eyebrow) { margin: 0; color: #66747a; font-size: 14px; }.home-hero { display: grid; grid-template-columns: 1.2fr .8fr; border: 1px solid #d4e1d6; border-radius: 13px; overflow: hidden; background: #e4eee6; }.hero-course { display: flex; align-items: center; gap: 13px; padding: 27px; border-right: 1px solid #d1ded3; }.hero-course-dot { width: 12px; height: 12px; border-radius: 50%; background: #c99841; box-shadow: 0 0 0 5px rgba(201,152,65,.14); }.hero-course h2, .hero-progress strong { margin: 0; color: #263d37; font: 25px Georgia, serif; font-weight: 500; letter-spacing: -.4px; }.hero-course p:not(.eyebrow) { margin: 5px 0 0; color: #5d7169; font-size: 12px; }.hero-course button { margin-left: auto; border: 0; background: transparent; color: #397369; font-size: 12px; font-weight: 700; white-space: nowrap; }.hero-progress { padding: 23px 27px; }.hero-progress > span { display: block; margin-bottom: 5px; color: #61766d; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }.hero-progress small { color: #62766e; font-size: 10px; }.progress-bar { height: 5px; margin: 14px 0 7px; overflow: hidden; border-radius: 10px; background: #c7d8c9; }.progress-bar i { display: block; width: 63%; height: 100%; border-radius: inherit; background: #5e9074; }.home-section { margin-top: 39px; }.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 13px; }.section-heading h2 { margin: 0; font: 22px Georgia, serif; font-weight: 500; }.continue-study { width: 100%; display: flex; align-items: center; gap: 15px; padding: 15px; border: 1px solid #dde3de; border-radius: 10px; background: #fffefa; text-align: left; }.continue-study:hover { border-color: #abc8b3; }.continue-number { display: grid; place-items: center; width: 39px; height: 49px; color: #4f6d62; background: #eef3ed; border-radius: 5px; font: 15px Georgia, serif; }.continue-study strong, .continue-study small { display: block; }.continue-study strong { font-size: 13px; }.continue-study small { margin-top: 4px; color: #6c7a76; font-size: 11px; }.continue-tag { margin-left: auto; color: #467b69; background: #e9f3ea; border-radius: 99px; padding: 5px 8px; font-size: 10px; font-weight: 700; }.activity-arrow { margin-left: 3px; color: #3d786c; }.topic-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }.topic-card { min-height: 180px; display: flex; flex-direction: column; align-items: flex-start; padding: 19px; border: 1px solid #dfe4df; border-radius: 10px; background: #fffefa; text-align: left; color: #263334; }.topic-card:hover, .topic-card.active { border-color: #a8c8b1; box-shadow: 0 7px 22px rgba(42,70,57,.06); }.topic-status { color: #39775e; background: #e5f1e7; border-radius: 99px; padding: 4px 7px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }.topic-status.muted { color: #78847d; background: #f0f2ee; }.topic-card h3 { margin: 17px 0 7px; font: 21px Georgia, serif; font-weight: 500; }.topic-card p { margin: 0; color: #718078; font-size: 11px; }.topic-card-footer { width: 100%; margin-top: auto; display: flex; justify-content: space-between; color: #87928c; font-size: 10px; }.topic-card-footer strong { color: #3f776a; }.home-bottom-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 14px; margin-top: 38px; }.home-insight, .home-library { min-height: 185px; padding: 23px; border-radius: 11px; }.home-insight { color: #f4f6f2; background: #263b3d; }.home-insight .eyebrow { color: #a7c1b5; }.home-insight h2 { max-width: 460px; margin: 0; font: 22px/1.2 Georgia, serif; font-weight: 500; }.home-insight p:not(.eyebrow) { margin: 11px 0; color: #ced8d4; font-size: 12px; line-height: 1.5; }.home-insight .text-button { color: #a8d5bd; }.home-library { display: flex; justify-content: space-between; background: #f0e9db; color: #625235; }.home-library h2 { margin: 0; font: 23px Georgia, serif; font-weight: 500; }.home-library p:not(.eyebrow) { max-width: 220px; color: #75664d; font-size: 12px; line-height: 1.5; }.library-stack { position: relative; display: block; width: 62px; height: 88px; margin: 14px 8px 0; }.library-stack i { position: absolute; width: 43px; height: 64px; border: 1px solid rgba(91,75,44,.2); border-radius: 4px 6px 6px 4px; background: #d0b987; }.library-stack i:nth-child(1) { top: 10px; left: 15px; background: #b78c51; }.library-stack i:nth-child(2) { top: 5px; left: 8px; background: #d3c4a2; }.library-stack i:nth-child(3) { top: 0; left: 0; background: #6d8f83; } @media (max-width: 850px) { .student-home { padding: 40px 32px 80px; }.home-hero, .home-bottom-grid { grid-template-columns: 1fr; }.hero-course { border-right: 0; border-bottom: 1px solid #d1ded3; }.topic-cards { grid-template-columns: 1fr; }.topic-card { min-height: 140px; } } @media (max-width: 600px) { .student-home { padding: 30px 18px 70px; }.home-header { display: grid; }.home-header h1 { font-size: 36px; }.home-header .button { justify-self: start; }.continue-study { align-items: flex-start; }.continue-tag { display: none; } }
      `}</style>
    </div>
  );
}

export function Library({ onOpenReader, onOpenUpload }: { onOpenReader: () => void; onOpenUpload: () => void }) {
  return (
    <div className="library-page">
      <header className="library-header"><div><p className="eyebrow">Your sources</p><h1>Textbooks &amp; PDFs</h1><p>Private study material, organised around the topics where you use it.</p></div><button className="button primary" onClick={onOpenUpload}>+ Add source</button></header>
      <div className="library-tools"><div className="library-search">⌕ <input placeholder="Search your textbooks and PDFs" /></div><div className="filter-row"><button className="filter active">All sources <span>3</span></button><button className="filter">Textbooks <span>1</span></button><button className="filter">Lectures <span>2</span></button></div></div>

      <section className="library-section"><div className="library-section-heading"><div><p className="eyebrow">Recently used</p><h2>Continue where you left off</h2></div></div><button className="featured-source" onClick={onOpenReader}><span className="large-cover"><i>GUYTON<br />&amp; HALL</i><small>MEDICAL PHYSIOLOGY</small></span><div className="featured-copy"><span className="private-pill">Private to you</span><h2>Guyton &amp; Hall Textbook of Medical Physiology</h2><p>Chapter 9 · The heart as a pump</p><div className="source-meta"><span>38 pages</span><span>Last opened yesterday</span><span>Linked to Cardiac cycle</span></div></div><span className="open-source">Open reader →</span></button></section>

      <section className="library-section"><div className="library-section-heading"><div><p className="eyebrow">All sources</p><h2>Your study library</h2></div><button className="text-button">Sort: Recently used ▾</button></div><div className="source-list"><button onClick={onOpenReader}><span className="source-document amber">03</span><span><strong>Cardiovascular lecture 03</strong><small>Professor slides · 42 pages</small></span><span className="topic-link">Cardiac cycle</span><span className="source-open">Open →</span></button><button onClick={onOpenReader}><span className="source-document green">04</span><span><strong>Cardiovascular lecture 04</strong><small>Professor slides · 36 pages</small></span><span className="topic-link">Cardiac output</span><span className="source-open">Open →</span></button></div></section>

      <section className="library-notice"><span>⌾</span><div><strong>Your material stays yours.</strong><p>Sources are private by default and remain linked to the pages that support your notes, answers, and cards.</p></div></section>
      <style jsx>{`
        .library-page { max-width: 1180px; margin: 0 auto; padding: 55px 58px 80px; }.library-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }.library-header h1 { margin: 0 0 9px; font: 45px Georgia, serif; font-weight: 500; letter-spacing: -1.5px; }.library-header p:not(.eyebrow) { margin: 0; color: #66747a; font-size: 14px; }.library-tools { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 35px 0; }.library-search { width: min(420px, 100%); display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fffefa; border: 1px solid #dce2dc; border-radius: 7px; color: #7b8981; }.library-search input { min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font-size: 12px; }.filter-row { display: flex; gap: 6px; }.filter { border: 1px solid #dce2dc; border-radius: 99px; padding: 7px 10px; color: #64736d; background: transparent; font-size: 11px; }.filter.active { color: #31715e; background: #e7f1e8; border-color: #cfe0d3; font-weight: 700; }.library-section { margin-top: 35px; }.library-section-heading { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }.library-section-heading h2 { margin: 0; font: 22px Georgia, serif; font-weight: 500; }.featured-source { width: 100%; display: flex; align-items: center; gap: 21px; padding: 20px; border: 1px solid #d9e1db; border-radius: 12px; background: #fffefa; text-align: left; }.featured-source:hover { border-color: #a7c8af; box-shadow: 0 8px 25px rgba(36,70,52,.06); }.large-cover { display: flex; flex-direction: column; justify-content: space-between; width: 82px; height: 116px; padding: 13px 8px; flex: 0 0 auto; border-radius: 3px 7px 7px 3px; color: #e9eadc; background: #3e6577; box-shadow: 3px 4px 0 #315365; }.large-cover i { font: 12px/1.05 Georgia, serif; letter-spacing: .08em; font-style: normal; }.large-cover small { font-size: 6px; letter-spacing: .08em; }.featured-copy h2 { margin: 7px 0 5px; color: #263334; font: 23px Georgia, serif; font-weight: 500; }.featured-copy > p { margin: 0; color: #697973; font-size: 12px; }.private-pill { display: inline-block; color: #39775e; background: #e7f2e8; border-radius: 99px; padding: 4px 7px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }.source-meta { display: flex; flex-wrap: wrap; gap: 13px; margin-top: 15px; color: #78857f; font-size: 10px; }.open-source { margin-left: auto; color: #3b786b; font-size: 12px; font-weight: 700; white-space: nowrap; }.source-list { display: grid; gap: 8px; }.source-list button { width: 100%; display: grid; grid-template-columns: 42px 1fr auto auto; align-items: center; gap: 13px; padding: 12px; border: 1px solid #e0e5e0; border-radius: 9px; background: #fffefa; color: #2d3939; text-align: left; }.source-list button:hover { border-color: #b8d0be; }.source-document { display: grid; place-items: center; width: 31px; height: 39px; color: white; border-radius: 3px 5px 5px 3px; font: 12px Georgia, serif; }.amber { background: #bd8d45; }.green { background: #788d7e; }.source-list strong, .source-list small { display: block; }.source-list strong { font-size: 12px; }.source-list small { margin-top: 4px; color: #718078; font-size: 10px; }.topic-link { color: #5c8174; background: #edf4ee; border-radius: 99px; padding: 5px 7px; font-size: 10px; }.source-open { color: #3d796d; font-size: 11px; font-weight: 700; }.library-notice { display: flex; gap: 12px; margin-top: 35px; padding: 17px; border: 1px solid #d9e8dc; border-radius: 9px; background: #eef6f0; }.library-notice > span { color: #467e65; font-size: 20px; }.library-notice strong { font-size: 12px; }.library-notice p { margin: 4px 0 0; max-width: 600px; color: #62756c; font-size: 11px; line-height: 1.45; } @media (max-width: 750px) { .library-page { padding: 32px 18px 70px; }.library-header { display: grid; }.library-header h1 { font-size: 38px; }.library-header .button { justify-self: start; }.library-tools { display: grid; margin: 28px 0; }.filter-row { overflow: auto; }.featured-source { align-items: flex-start; }.featured-copy h2 { font-size: 19px; }.source-meta, .open-source { display: none; }.source-list button { grid-template-columns: 42px 1fr auto; }.topic-link { display: none; } }
      `}</style>
    </div>
  );
}

export function Dashboard({ onOpenReader, onOpenCards, onOpenNotes, onOpenUpload, notify }: { onOpenReader: () => void; onOpenCards: () => void; onOpenNotes: () => void; onOpenUpload: () => void; notify: (message: string) => void }) {
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

export function Notes({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
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

export function Reader({ onBack, onOpenCards, onOpenNotes, notify }: { onBack: () => void; onOpenCards: () => void; onOpenNotes: () => void; notify: (message: string) => void }) {
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

export function Cards({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
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

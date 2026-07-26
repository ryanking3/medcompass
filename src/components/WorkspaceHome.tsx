"use client";

import type { StudyCourse, StudyDocument, StudyExam, StudyFlashcard, StudyNote, StudyPlanBlock, StudyTopic } from "./types";

type WorkspaceHomeProps = {
  courses: StudyCourse[];
  documents: StudyDocument[];
  notes: StudyNote[];
  flashcards: StudyFlashcard[];
  planBlocks: StudyPlanBlock[];
  exams: StudyExam[];
  onCreateTopic: () => void;
  onOpenTopic: (topic: StudyTopic) => void;
  onOpenLibrary: () => void;
  onOpenPlanner: () => void;
};

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function todayString() {
  const today = new Date();
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`;
}

function parsePlainDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(parsePlainDate(value));
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function WorkspaceHome({ courses, documents, notes, flashcards, planBlocks, exams, onCreateTopic, onOpenTopic, onOpenLibrary, onOpenPlanner }: WorkspaceHomeProps) {
  const topics = courses.flatMap((course) => course.modules.flatMap((module) => module.topics));
  const firstTopic = topics[0] ?? null;
  const keptCards = flashcards.filter((card) => card.isKept).length;
  const examById = new Map(exams.map((exam) => [exam.id, exam]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const today = todayString();
  const nextWeek = toDateString(addDays(parsePlainDate(today), 7));
  const plannedBlocks = planBlocks.filter((block) => block.status === "planned").sort((first, second) => first.startsOn.localeCompare(second.startsOn));
  const todayBlocks = plannedBlocks.filter((block) => block.startsOn === today);
  const upcomingBlocks = plannedBlocks.filter((block) => block.startsOn > today).slice(0, 5);
  const weekBlocks = plannedBlocks.filter((block) => block.startsOn >= today && block.startsOn <= nextWeek);
  const nextBlock = todayBlocks[0] ?? upcomingBlocks[0] ?? null;
  const todayMinutes = todayBlocks.reduce((total, block) => total + block.durationMinutes, 0);
  const weekMinutes = weekBlocks.reduce((total, block) => total + block.durationMinutes, 0);
  const soonestExam = exams.find((exam) => exam.examDate >= today) ?? null;
  const openBlockTopic = (block: StudyPlanBlock) => {
    const topic = topicById.get(block.topicId);
    if (topic) {
      onOpenTopic(topic);
      return;
    }
    onOpenPlanner();
  };

  if (!topics.length) {
    return <div className="workspace-empty">
      <header><p className="eyebrow">Your private study workspace</p><h1>Start with one topic.</h1><p>MedCompass keeps your sources, notes, and cards together around the material you are studying.</p><button className="button primary" onClick={onCreateTopic}>Create your first topic →</button></header>
      <section className="empty-steps"><article><span>1</span><div><h2>Create a topic</h2><p>Add your course, module, and a focused area of study.</p></div></article><article><span>2</span><div><h2>Add a source</h2><p>Upload a permitted textbook chapter or lecture PDF.</p></div></article><article><span>3</span><div><h2>Make it useful</h2><p>Save notes, build cards, and keep each one connected to its source.</p></div></article></section>
      <aside className="workspace-note"><span>⌾</span><p><strong>Study material stays private.</strong> Upload only material you are permitted to use, and never add patient-identifiable information.</p></aside>
      <style jsx>{`.workspace-empty { max-width: 900px; margin: 0 auto; padding: 88px 58px; }.workspace-empty header { max-width: 620px; }.workspace-empty h1 { margin: 0 0 14px; color: #202b2e; font: 52px/1.05 Georgia, serif; font-weight: 500; letter-spacing: -1.8px; }.workspace-empty header > p:not(.eyebrow) { margin: 0; color: #64736f; font-size: 15px; line-height: 1.6; }.workspace-empty header .button { margin-top: 25px; }.empty-steps { display: grid; gap: 10px; margin-top: 52px; }.empty-steps article { display: flex; align-items: flex-start; gap: 15px; padding: 18px; border: 1px solid #dfe6df; border-radius: 10px; background: #fffefa; }.empty-steps span { display: grid; flex: 0 0 auto; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: #39765e; background: #e5f1e7; font: 14px Georgia, serif; }.empty-steps h2 { margin: 1px 0 5px; font: 19px Georgia, serif; font-weight: 500; }.empty-steps p { margin: 0; color: #6b7974; font-size: 12px; line-height: 1.5; }.workspace-note { display: flex; gap: 11px; margin-top: 28px; padding: 15px; border-radius: 8px; background: #eef6f0; color: #5c6e66; font-size: 11px; line-height: 1.5; }.workspace-note > span { color: #39765e; font-size: 18px; }.workspace-note p { margin: 0; } @media (max-width: 700px) { .workspace-empty { padding: 54px 22px; }.workspace-empty h1 { font-size: 40px; } }`}</style>
    </div>;
  }

  return <div className="workspace-home">
    <header className="workspace-header"><div><p className="eyebrow">Your private study workspace</p><h1>Keep your work in context.</h1><p>{topics.length} {topics.length === 1 ? "topic" : "topics"} across {courses.length} {courses.length === 1 ? "course" : "courses"}.</p></div><button className="button primary" onClick={onCreateTopic}>+ New topic</button></header>
    <section className="study-dashboard">
      <article className="tonight-card">
        <div className="study-card-heading"><div><p className="eyebrow">{todayBlocks.length ? "Tonight’s study" : "Next study block"}</p><h2>{todayBlocks.length ? `${minutesLabel(todayMinutes)} planned today` : nextBlock ? `${minutesLabel(nextBlock.durationMinutes)} on ${formatShortDate(nextBlock.startsOn)}` : "No study blocks yet"}</h2></div><button className="text-button" onClick={onOpenPlanner}>Open calendar →</button></div>
        <p>{todayBlocks.length ? "These are the blocks waiting for you today." : nextBlock ? "Nothing due today — here’s the next thing on deck." : "Open the planner to turn upcoming exams into a calendar."}</p>
        {todayBlocks.length ? <div className="study-block-list">{todayBlocks.slice(0, 4).map((block) => <button key={block.id} onClick={() => openBlockTopic(block)}><span>{minutesLabel(block.durationMinutes)}</span><strong>{block.title}</strong><small>{examById.get(block.examId)?.title ?? "Exam"} · {block.topicName}</small></button>)}</div> : nextBlock ? <button className="next-block" onClick={() => openBlockTopic(nextBlock)}><span>{formatShortDate(nextBlock.startsOn)}</span><strong>{nextBlock.title}</strong><small>{minutesLabel(nextBlock.durationMinutes)} · {examById.get(nextBlock.examId)?.title ?? "Exam"}</small></button> : <button className="button ghost" onClick={onOpenPlanner}>Open planner</button>}
      </article>
      <aside className="study-week-card">
        <p className="eyebrow">Coming up</p>
        <h2>{weekBlocks.length ? `${minutesLabel(weekMinutes)} this week` : "Plan your week"}</h2>
        <p>{soonestExam ? `Next exam: ${soonestExam.title} on ${formatShortDate(soonestExam.examDate)}.` : "No upcoming exams yet."}</p>
        {upcomingBlocks.length ? <div className="upcoming-list">{upcomingBlocks.slice(0, 3).map((block) => <button key={block.id} onClick={() => openBlockTopic(block)}><time>{formatShortDate(block.startsOn)}</time><span>{block.title}</span></button>)}</div> : <button className="small-pill" onClick={onOpenPlanner}>Create blocks</button>}
      </aside>
    </section>
    <section className="workspace-focus"><div><p className="eyebrow">Continue studying</p><h2>{firstTopic.name}</h2><p>{firstTopic.learningObjectives[0]?.body ?? "Open this topic to add sources, notes, and cards."}</p><button className="button dark" onClick={() => onOpenTopic(firstTopic)}>Open topic →</button></div><dl><div><dt>Sources</dt><dd>{documents.length}</dd></div><div><dt>Notes</dt><dd>{notes.length}</dd></div><div><dt>Kept cards</dt><dd>{keptCards}</dd></div></dl></section>
    <section className="workspace-section"><div className="section-heading"><div><p className="eyebrow">Your topics</p><h2>Study spaces</h2></div><button className="text-button" onClick={onCreateTopic}>+ Add topic</button></div><div className="workspace-topic-grid">{topics.map((topic) => { const topicSources = documents.filter((document) => document.linkedTopics.some((linkedTopic) => linkedTopic.id === topic.id)).length; const topicNotes = notes.filter((note) => note.topicId === topic.id).length; const topicCards = flashcards.filter((card) => card.topicId === topic.id && card.isKept).length; return <button className="workspace-topic-card" key={topic.id} onClick={() => onOpenTopic(topic)}><span>{topic.learningObjectives.length ? "In progress" : "Ready to start"}</span><h3>{topic.name}</h3><p>{topicSources} {topicSources === 1 ? "source" : "sources"} · {topicNotes} {topicNotes === 1 ? "note" : "notes"} · {topicCards} kept cards</p><strong>Open topic →</strong></button>; })}</div></section>
    <section className="workspace-links"><article><div><p className="eyebrow">Your library</p><h2>{documents.length ? `${documents.length} private ${documents.length === 1 ? "source" : "sources"}` : "Add your first source"}</h2><p>{documents.length ? "Your PDFs remain linked to the places where you study them." : "Upload a permitted PDF when you are ready to begin reading."}</p></div><button className="text-button" onClick={onOpenLibrary}>Open library →</button></article><article><div><p className="eyebrow">Study planner</p><h2>Turn exams into a calendar</h2><p>Add exam dates and availability, then schedule topic-linked study blocks.</p></div><button className="text-button" onClick={onOpenPlanner}>Open planner →</button></article></section>
    <style jsx>{`.workspace-home { max-width: 1180px; margin: 0 auto; padding: 55px 58px 90px; }.workspace-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }.workspace-header h1 { margin: 0 0 9px; color: #202b2e; font: 45px Georgia, serif; font-weight: 500; letter-spacing: -1.6px; }.workspace-header p:not(.eyebrow) { margin: 0; color: #65746f; font-size: 14px; }.study-dashboard { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 14px; margin-top: 34px; }.tonight-card, .study-week-card { border: 1px solid #dbe6dc; border-radius: 12px; background: #fffefa; box-shadow: 0 8px 24px rgba(32,52,42,.032); }.tonight-card { padding: 24px; }.study-week-card { padding: 20px; background: #e7efe8; }.study-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }.tonight-card h2, .study-week-card h2 { margin: 0; font: 25px Georgia, serif; font-weight: 500; color: #263d37; }.tonight-card > p, .study-week-card > p { margin: 8px 0 0; color: #66766f; font-size: 12px; line-height: 1.5; }.study-block-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin-top: 18px; }.study-block-list button, .next-block, .upcoming-list button { border: 1px solid #dce6de; border-radius: 9px; background: #eef6f0; color: #2f5047; text-align: left; }.study-block-list button { display: grid; grid-template-columns: 58px minmax(0, 1fr); column-gap: 11px; row-gap: 3px; padding: 12px; }.study-block-list span { grid-row: 1 / 3; display: grid; place-items: center; align-self: stretch; border-radius: 7px; background: #fffefa; color: #4b7066; font: 16px Georgia, serif; }.study-block-list strong, .next-block strong { font-size: 12px; line-height: 1.3; }.study-block-list small, .next-block small { color: #65756e; font-size: 10px; }.next-block { display: grid; gap: 5px; width: 100%; margin-top: 18px; padding: 14px; }.next-block span { color: #668078; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }.upcoming-list { display: grid; gap: 7px; margin-top: 16px; }.upcoming-list button { display: grid; gap: 4px; padding: 10px 11px; background: rgba(255,254,250,.68); }.upcoming-list time { color: #668078; font-size: 10px; font-weight: 800; }.upcoming-list span { font-size: 11px; font-weight: 800; }.small-pill { margin-top: 16px; border: 1px solid #cbdccb; border-radius: 999px; padding: 8px 11px; color: #3e766b; background: #fffefa; font-size: 11px; font-weight: 800; }.workspace-focus { display: flex; justify-content: space-between; gap: 35px; margin-top: 22px; padding: 30px; border: 1px solid #d4e1d6; border-radius: 13px; background: #e4eee6; }.workspace-focus h2 { margin: 0 0 8px; color: #263d37; font: 29px Georgia, serif; font-weight: 500; }.workspace-focus p:not(.eyebrow) { max-width: 590px; margin: 0 0 19px; color: #5b6f67; font-size: 13px; line-height: 1.5; }.workspace-focus dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; min-width: 280px; margin: 0; align-content: center; }.workspace-focus dl div { padding-left: 14px; border-left: 1px solid #c9d9cd; }.workspace-focus dt { color: #63766d; font-size: 10px; text-transform: uppercase; letter-spacing: .07em; }.workspace-focus dd { margin: 6px 0 0; color: #315a4f; font: 24px Georgia, serif; }.workspace-section { margin-top: 42px; }.section-heading { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }.section-heading h2 { margin: 0; font: 22px Georgia, serif; font-weight: 500; }.workspace-topic-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px; }.workspace-topic-card { min-height: 175px; display: flex; flex-direction: column; align-items: flex-start; padding: 19px; border: 1px solid #dfe5df; border-radius: 10px; background: #fffefa; color: #283737; text-align: left; }.workspace-topic-card:hover, .study-block-list button:hover, .next-block:hover, .upcoming-list button:hover { border-color: #a8c8b1; box-shadow: 0 7px 22px rgba(42,70,57,.06); }.workspace-topic-card > span { color: #547769; background: #edf3ed; border-radius: 99px; padding: 4px 7px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }.workspace-topic-card h3 { margin: 17px 0 7px; font: 21px Georgia, serif; font-weight: 500; }.workspace-topic-card p { margin: 0; color: #728078; font-size: 11px; line-height: 1.5; }.workspace-topic-card strong { margin-top: auto; color: #3f776a; font-size: 11px; }.workspace-links { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; margin-top: 38px; }.workspace-links article { display: flex; justify-content: space-between; align-items: center; gap: 25px; padding: 22px; border-radius: 10px; background: #f0e9db; color: #625235; }.workspace-links article:nth-child(2) { background: #e7efe8; color: #3b554b; }.workspace-links h2 { margin: 0; font: 23px Georgia, serif; font-weight: 500; }.workspace-links p:not(.eyebrow) { margin: 7px 0 0; color: #75664d; font-size: 12px; }.workspace-links article:nth-child(2) p:not(.eyebrow) { color: #5e7168; }.workspace-links .text-button { color: #5b775b; white-space: nowrap; } @media (max-width: 950px) { .workspace-home { padding: 40px 32px 80px; }.study-dashboard, .workspace-focus { grid-template-columns: 1fr; display: grid; }.study-block-list { grid-template-columns: 1fr; }.workspace-focus dl { min-width: 0; }.workspace-topic-grid, .workspace-links { grid-template-columns: 1fr; } } @media (max-width: 600px) { .workspace-home { padding: 30px 18px 70px; }.workspace-header, .study-card-heading { display: grid; }.workspace-header h1 { font-size: 36px; }.workspace-header .button { justify-self: start; }.workspace-focus { padding: 23px; }.workspace-focus dl { gap: 7px; }.workspace-links article { align-items: flex-start; } }`}</style>
  </div>;
}

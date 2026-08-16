"use client";

import type { StudyDocument, StudyExam, StudyFlashcard, StudyNote, StudyPlanBlock, StudyTopic } from "./types";

type TopicAtlasPanelProps = {
  topic: StudyTopic;
  documents: StudyDocument[];
  notes: StudyNote[];
  flashcards: StudyFlashcard[];
  exams: StudyExam[];
  planBlocks: StudyPlanBlock[];
  onOpenDocument: (document: StudyDocument) => void;
  onOpenNotes: () => void;
  onOpenCards: () => void;
  onOpenPlanner: () => void;
};

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function nextBlockLabel(blocks: StudyPlanBlock[]) {
  const upcoming = blocks
    .filter((block) => block.status !== "skipped")
    .sort((first, second) => first.startsOn.localeCompare(second.startsOn))[0];

  if (!upcoming) return "No planned blocks";
  return `${upcoming.title} · ${Math.round(upcoming.durationMinutes / 60)}h`;
}

export function TopicAtlasPanel({ topic, documents, notes, flashcards, exams, planBlocks, onOpenDocument, onOpenNotes, onOpenCards, onOpenPlanner }: TopicAtlasPanelProps) {
  const topicDocuments = documents.filter((document) => document.linkedTopics.some((linkedTopic) => linkedTopic.id === topic.id));
  const topicNotes = notes.filter((note) => note.topicId === topic.id);
  const topicCards = flashcards.filter((card) => card.topicId === topic.id);
  const keptCards = topicCards.filter((card) => card.isKept);
  const topicExams = exams.filter((exam) => exam.topics.some((examTopic) => examTopic.topicId === topic.id));
  const topicBlocks = planBlocks.filter((block) => block.topicId === topic.id);
  const primarySource = topicDocuments[0] ?? null;
  const primaryExam = topicExams[0] ?? null;
  const examSignal = primaryExam?.topics.find((examTopic) => examTopic.topicId === topic.id);

  return (
    <article className="topic-atlas-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Topic atlas</p>
          <h2>How this topic is connected</h2>
        </div>
        <button className="text-button" onClick={onOpenPlanner}>Open planner →</button>
      </div>

      <div className="topic-atlas-map" aria-label={`${topic.name} topic atlas`}>
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="topic-planet">
          <span>Topic</span>
          <strong>{topic.name}</strong>
          <small>{topic.learningObjectives[0]?.body ?? "No objective yet"}</small>
        </div>

        <button className="satellite source" onClick={() => primarySource ? onOpenDocument(primarySource) : undefined} disabled={!primarySource}>
          <span>Sources</span>
          <strong>{plural(topicDocuments.length, "source")}</strong>
          <small>{primarySource ? primarySource.title : "Add a PDF to anchor this topic"}</small>
        </button>
        <button className="satellite notes" onClick={onOpenNotes}>
          <span>Notes</span>
          <strong>{plural(topicNotes.length, "note")}</strong>
          <small>{topicNotes[0]?.title ?? "Capture key ideas and diagrams"}</small>
        </button>
        <button className="satellite cards" onClick={onOpenCards}>
          <span>Recall</span>
          <strong>{keptCards.length}/{topicCards.length} kept</strong>
          <small>{topicCards.length ? "Review the cards tied to this topic" : "Create the first recall card"}</small>
        </button>
        <button className="satellite exam" onClick={onOpenPlanner}>
          <span>Exam pressure</span>
          <strong>{primaryExam ? primaryExam.title : "No exam yet"}</strong>
          <small>{examSignal ? `Weight ${examSignal.weight}/5 · confidence ${examSignal.confidence}/5` : "Link this topic to an exam plan"}</small>
        </button>
        <button className="satellite plan" onClick={onOpenPlanner}>
          <span>Planned work</span>
          <strong>{plural(topicBlocks.length, "block")}</strong>
          <small>{nextBlockLabel(topicBlocks)}</small>
        </button>
      </div>

      <div className="topic-atlas-signals">
        <span>{topicDocuments.length ? "Evidence attached" : "Needs a source"}</span>
        <span>{topicNotes.length ? "Notes started" : "No notes yet"}</span>
        <span>{keptCards.length ? "Recall active" : "No kept cards"}</span>
      </div>

      <style jsx>{`
        .topic-atlas-panel { grid-column: 1 / -1; padding: 24px; border: 1px solid #dce6de; border-radius: 14px; background: radial-gradient(circle at 50% 35%, #fbfcf4 0, #edf5ee 48%, #e1ece5 100%); box-shadow: 0 10px 28px rgba(35,55,48,.05); overflow: hidden; }
        .topic-atlas-map { position: relative; min-height: 365px; margin-top: 16px; border: 1px solid rgba(206,220,210,.78); border-radius: 15px; background: radial-gradient(circle at center, rgba(255,254,250,.95), rgba(255,254,250,0) 38%), linear-gradient(145deg, rgba(255,254,250,.48), rgba(224,236,227,.55)); }
        .orbit { position: absolute; inset: 50%; border: 1px dashed rgba(116,145,130,.28); border-radius: 999px; transform: translate(-50%, -50%); pointer-events: none; }
        .orbit-one { width: 390px; height: 210px; }
        .orbit-two { width: 620px; height: 290px; }
        .topic-planet { position: absolute; left: 50%; top: 50%; z-index: 2; display: grid; gap: 5px; width: 245px; min-height: 132px; padding: 20px; border: 1px solid rgba(91,142,120,.42); border-radius: 28px; background: radial-gradient(circle at 18% 18%, rgba(255,254,250,.98) 0, rgba(255,254,250,.76) 36%, transparent 37%), linear-gradient(145deg, #fdfef8, #dcefe4); box-shadow: 0 24px 52px rgba(69,118,96,.18), 0 0 0 10px rgba(136,177,154,.08); transform: translate(-50%, -50%); }
        .topic-planet span, .satellite span { color: #66766f; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .09em; }
        .topic-planet strong { color: #263d37; font: 23px Georgia, serif; font-weight: 500; line-height: 1.05; }
        .topic-planet small, .satellite small { color: #64746e; font-size: 10px; line-height: 1.35; }
        .satellite { position: absolute; z-index: 3; display: grid; gap: 5px; width: 190px; min-height: 96px; padding: 13px; border: 1px solid #dce6de; border-radius: 18px; background: rgba(255,254,250,.92); box-shadow: 0 14px 28px rgba(39,60,52,.1), 0 1px 0 rgba(255,255,255,.86) inset; color: #263834; text-align: left; }
        .satellite:hover:not(:disabled) { border-color: rgba(78,125,105,.52); box-shadow: 0 18px 34px rgba(38,75,62,.14), 0 0 0 4px rgba(112,158,133,.12); transform: translateY(-2px); }
        .satellite:disabled { cursor: default; opacity: .68; }
        .satellite strong { overflow: hidden; color: #263d37; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
        .satellite.source { left: 8%; top: 18%; background: linear-gradient(145deg, #fbfcf9, #e8eef2); }
        .satellite.notes { left: 12%; bottom: 15%; background: linear-gradient(145deg, #fffefa, #fff4da); }
        .satellite.cards { right: 11%; top: 17%; background: linear-gradient(145deg, #fff8ed, #f4dcc0); }
        .satellite.exam { right: 6%; bottom: 17%; background: linear-gradient(145deg, #fff9f7, #f2dcd6); }
        .satellite.plan { left: 50%; bottom: 7%; background: linear-gradient(145deg, #f7fffb, #ddefea); transform: translateX(-50%); }
        .satellite.plan:hover:not(:disabled) { transform: translateX(-50%) translateY(-2px); }
        .topic-atlas-signals { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
        .topic-atlas-signals span { border-radius: 999px; padding: 7px 9px; color: #53675f; background: #fffefa; font-size: 10px; font-weight: 800; }
        @media (max-width: 960px) { .topic-atlas-map { display: grid; gap: 9px; min-height: 0; padding: 14px; }.orbit { display: none; }.topic-planet, .satellite, .satellite.source, .satellite.notes, .satellite.cards, .satellite.exam, .satellite.plan { position: static; width: auto; transform: none; }.topic-planet { min-height: 0; }.satellite.plan:hover:not(:disabled) { transform: translateY(-2px); } }
      `}</style>
    </article>
  );
}

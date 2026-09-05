"use client";

import { useMemo, useState } from "react";
import type { AiMockExamResponse, MockExamFormat } from "@/lib/ai/types";
import type { StudyExam } from "./types";

export type GeneratedPracticeExam = AiMockExamResponse & {
  id: string;
  examId: string;
  createdAt: string;
};

type PracticeExamsProps = {
  exams: StudyExam[];
  generatedExams: GeneratedPracticeExam[];
  onGeneratedExamCreated: (exam: GeneratedPracticeExam) => void;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function PracticeExams({ exams, generatedExams, onGeneratedExamCreated }: PracticeExamsProps) {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(exams[0]?.id ?? "");
  const [format, setFormat] = useState<MockExamFormat>("mixed");
  const [questionCount, setQuestionCount] = useState(6);
  const [selectedGeneratedId, setSelectedGeneratedId] = useState<string | null>(generatedExams[0]?.id ?? null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedGenerated = generatedExams.find((exam) => exam.id === selectedGeneratedId) ?? generatedExams[0] ?? null;
  const sourceExam = useMemo(() => exams.find((exam) => exam.id === selectedExamId) ?? exams[0] ?? null, [exams, selectedExamId]);
  const upcomingExams = useMemo(() => [...exams].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()).slice(0, 3), [exams]);
  const selectedSourceDate = sourceExam ? new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(sourceExam.examDate)) : "";

  const openGenerator = () => {
    setSelectedExamId(exams[0]?.id ?? "");
    setFormat("mixed");
    setQuestionCount(6);
    setFeedback("");
    setGeneratorOpen(true);
  };

  const generatePracticeExam = async () => {
    if (!selectedExamId || busy) return;
    setBusy(true);
    setFeedback("");
    const response = await fetch("/api/ai/mock-exam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: selectedExamId, format, questionCount }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setFeedback(payload.error ?? "We couldn't generate that mock exam.");
      return;
    }
    const generatedExam: GeneratedPracticeExam = {
      ...(payload as AiMockExamResponse),
      id: crypto.randomUUID(),
      examId: selectedExamId,
      createdAt: new Date().toISOString(),
    };
    onGeneratedExamCreated(generatedExam);
    setSelectedGeneratedId(generatedExam.id);
    setGeneratorOpen(false);
  };

  return (
    <div className="practice-page">
      <header className="practice-header">
        <div>
          <p className="eyebrow">Practice exams</p>
          <h1>Turn revision plans into practice papers.</h1>
          <p>Mock exams live here, separate from the planner. Pick a planned exam, generate a paper, then come back to practise from your growing exam library.</p>
        </div>
        <button className="button primary" onClick={openGenerator}>Generate mock exam</button>
      </header>

      <section className="practice-overview" aria-label="Practice exam overview">
        <article>
          <span>Generated</span>
          <strong>{generatedExams.length}</strong>
          <p>{generatedExams.length === 1 ? "practice paper" : "practice papers"} saved in this session</p>
        </article>
        <article>
          <span>Planner source</span>
          <strong>{exams.length}</strong>
          <p>{exams.length === 1 ? "exam" : "exams"} available for generation</p>
        </article>
        <article className="wide">
          <span>Next exam</span>
          <strong>{upcomingExams[0]?.title ?? "None planned"}</strong>
          <p>{upcomingExams[0] ? new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(upcomingExams[0].examDate)) : "Add an exam in Planner to unlock generation"}</p>
        </article>
      </section>

      <section className="practice-shell">
        <aside className="practice-list">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Paper library</p>
              <h2>{generatedExams.length ? "Generated papers" : "No papers yet"}</h2>
            </div>
            <button className="mini-generate" onClick={openGenerator} aria-label="Generate mock exam">+</button>
          </div>
          {generatedExams.length ? generatedExams.map((exam) => <button key={exam.id} className={selectedGenerated?.id === exam.id ? "practice-row active" : "practice-row"} onClick={() => setSelectedGeneratedId(exam.id)}>
            <span>{exam.format.toUpperCase()} · {exam.questions.length} Qs</span>
            <strong>{exam.title}</strong>
            <small>{formatDateTime(exam.createdAt)}</small>
          </button>) : <div className="practice-empty-list">
            <strong>Build your first paper</strong>
            <p>Use a planned exam as the scope, choose a format, and MedCompass will create a fake paper until the real AI provider is connected.</p>
            <button className="button ghost" onClick={openGenerator} disabled={!exams.length}>{exams.length ? "Open generator" : "Add an exam first"}</button>
          </div>}
        </aside>

        <main className="practice-paper">
          {selectedGenerated ? <>
            <div className="paper-heading">
              <div>
                <p className="eyebrow">Practice paper</p>
                <h2>{selectedGenerated.title}</h2>
                <p>{selectedGenerated.format} · {selectedGenerated.questions.length} questions · fake AI mode</p>
              </div>
              <div className="paper-actions">
                <button className="button ghost" disabled>Timed attempt soon</button>
                <button className="button ghost" onClick={openGenerator}>Generate another</button>
              </div>
            </div>
            <div className="standards-row">{selectedGenerated.standards.map((standard) => <span key={standard}>{standard}</span>)}</div>
            <div className="question-stack">{selectedGenerated.questions.map((question, index) => <article key={question.id}>
              <div className="question-meta">
                <span>{question.type === "mcq" ? "MCQ" : "Written"}</span>
                <small>{question.topicName}</small>
              </div>
              <h3>{index + 1}. {question.prompt}</h3>
              {question.options && <ol>{question.options.map((option) => <li key={option}>{option}</li>)}</ol>}
              <details>
                <summary>Show answer</summary>
                <p><strong>Answer:</strong> {question.answer}</p>
                <p><strong>Rationale:</strong> {question.rationale}</p>
              </details>
            </article>)}</div>
          </> : <div className="practice-empty">
            <span>□</span>
            <h2>No practice paper selected</h2>
            <p>Generate a mock exam from an existing planner exam, then it will appear here as a paper you can click back into.</p>
            <button className="button primary" onClick={openGenerator} disabled={!exams.length}>{exams.length ? "Generate mock exam" : "Add an exam in planner first"}</button>
          </div>}
        </main>
      </section>

      {generatorOpen && <div className="practice-drawer-backdrop" onMouseDown={() => setGeneratorOpen(false)}>
        <section className="practice-drawer" role="dialog" aria-modal="true" aria-labelledby="practice-generator-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading">
            <div>
              <p className="eyebrow">Mock exam generator</p>
              <h2 id="practice-generator-title">Build a practice paper</h2>
            </div>
            <button className="modal-close" onClick={() => setGeneratorOpen(false)} aria-label="Close generator">×</button>
          </div>
          {exams.length ? <div className="generator-form">
            <label>Exam scope<select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></label>
            {sourceExam && <div className="generator-context">
              <span>Using planner context</span>
              <strong>{sourceExam.title}</strong>
              <p>{selectedSourceDate} · {sourceExam.topics.length} topics · target {Math.round(sourceExam.targetMinutes / 60)}h study time</p>
            </div>}
            <div className="segmented-field">
              <span>Question style</span>
              <div>
                {(["mixed", "mcq", "written"] as MockExamFormat[]).map((option) => <button key={option} className={format === option ? "selected" : ""} onClick={() => setFormat(option)}>{option === "mcq" ? "MCQ" : option === "written" ? "Written" : "Mixed"}</button>)}
              </div>
            </div>
            <div className="count-field">
              <label>Questions<input type="number" min="1" max="20" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} /></label>
              <div className="count-shortcuts">
                {[6, 10, 15].map((count) => <button key={count} className={questionCount === count ? "selected" : ""} onClick={() => setQuestionCount(count)}>{count}</button>)}
              </div>
            </div>
            {feedback && <p className="generator-error" role="alert">{feedback}</p>}
            <div className="modal-actions"><button className="button ghost" onClick={() => setGeneratorOpen(false)}>Cancel</button><button className="button primary" onClick={generatePracticeExam} disabled={busy}>{busy ? "Generating…" : "Generate paper"}</button></div>
          </div> : <div className="practice-empty-list">Create an exam in the planner before generating a mock exam.</div>}
        </section>
      </div>}

      <style jsx>{`
        .practice-page { max-width: 1280px; margin: 0 auto; padding: 55px 58px 100px; }
        .practice-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 30px; }
        .practice-header h1 { max-width: 660px; margin: 0 0 10px; color: #202b2e; font: 48px Georgia, serif; font-weight: 500; letter-spacing: -1.7px; }
        .practice-header p:not(.eyebrow) { max-width: 680px; margin: 0; color: #66746f; font-size: 14px; line-height: 1.6; }
        .practice-overview { display: grid; grid-template-columns: .8fr .8fr 1.4fr; gap: 12px; margin-bottom: 18px; }
        .practice-overview article { min-height: 118px; padding: 18px; border: 1px solid #e1e6e1; border-radius: 15px; background: linear-gradient(145deg, #fffefa, #f3f7f2); box-shadow: 0 8px 24px rgba(32,52,42,.032); }
        .practice-overview span { color: #718078; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .practice-overview strong { display: block; margin-top: 10px; color: #263d37; font: 28px Georgia, serif; font-weight: 500; }
        .practice-overview p { margin: 5px 0 0; color: #6b7974; font-size: 12px; line-height: 1.45; }
        .practice-shell { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 18px; align-items: start; }
        .practice-list, .practice-paper { border: 1px solid #e1e6e1; border-radius: 16px; background: #fffefa; box-shadow: 0 8px 24px rgba(32,52,42,.032); }
        .practice-list { position: sticky; top: 24px; display: grid; gap: 9px; padding: 18px; }
        .panel-heading, .modal-heading, .paper-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .panel-heading h2, .modal-heading h2, .paper-heading h2 { margin: 0; color: #263d37; font: 23px Georgia, serif; font-weight: 500; }
        .mini-generate { display: grid; place-items: center; width: 31px; height: 31px; border: 1px solid #d9e3db; border-radius: 10px; color: #3f7764; background: #f3f7f2; font-size: 20px; line-height: 1; }
        .practice-row { display: grid; gap: 5px; border: 1px solid #e2e8e2; border-radius: 12px; padding: 13px; color: #2f3d3b; background: #fbfcf9; text-align: left; transition: border-color .16s ease, transform .16s ease, background .16s ease; }
        .practice-row:hover { border-color: #bfd4c5; transform: translateY(-1px); }
        .practice-row.active { border-color: #bad1bf; background: #eef6f0; box-shadow: inset 3px 0 0 #4d806d; }
        .practice-row span, .practice-row small { color: #6c7b75; font-size: 10px; }
        .practice-row strong { font-size: 12px; line-height: 1.35; }
        .practice-empty-list { padding: 16px; border: 1px dashed #c1cdc4; border-radius: 10px; color: #718078; font-size: 12px; line-height: 1.5; }
        .practice-empty-list strong { display: block; color: #2f4740; font-size: 13px; margin-bottom: 5px; }
        .practice-empty-list p { margin: 0 0 12px; }
        .practice-paper { min-height: 640px; padding: 30px; }
        .paper-heading { align-items: center; margin-bottom: 14px; padding-bottom: 20px; border-bottom: 1px solid #edf0ec; }
        .paper-heading p:not(.eyebrow) { margin: 6px 0 0; color: #6b7974; font-size: 12px; }
        .paper-actions { display: flex; gap: 8px; }
        .standards-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 18px; }
        .standards-row span { border-radius: 999px; padding: 6px 8px; color: #53675f; background: #edf4ee; font-size: 10px; font-weight: 800; }
        .question-stack { display: grid; gap: 13px; }
        .question-stack article { padding: 19px; border: 1px solid #e0e8e2; border-radius: 13px; background: #fbfcf9; }
        .question-meta { display: flex; align-items: center; gap: 8px; }
        .question-meta span { border-radius: 999px; padding: 5px 7px; color: #2f6556; background: #e2efe6; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
        .question-meta small { color: #6d7d75; font-size: 11px; font-weight: 700; }
        .question-stack h3 { margin: 11px 0 12px; color: #263d37; font: 20px Georgia, serif; font-weight: 500; line-height: 1.35; }
        .question-stack li, .question-stack p { color: #53635e; font-size: 12px; line-height: 1.55; }
        .question-stack summary { cursor: pointer; color: #3d796d; font-size: 12px; font-weight: 800; }
        .practice-empty { min-height: 560px; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; color: #718078; }
        .practice-empty span { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 16px; color: #3f7764; background: #e3efe6; font: 25px Georgia, serif; }
        .practice-empty h2 { margin: 0; color: #263d37; font: 28px Georgia, serif; font-weight: 500; }
        .practice-empty p { max-width: 420px; margin: 0; font-size: 13px; line-height: 1.55; }
        .practice-drawer-backdrop { position: fixed; inset: 0; z-index: 90; display: flex; justify-content: flex-end; background: rgba(22,36,31,.24); backdrop-filter: blur(4px); }
        .practice-drawer { width: min(470px, 100%); height: 100%; overflow: auto; padding: 28px; border-left: 1px solid #dce6de; background: #fffefa; box-shadow: -24px 0 60px rgba(24,43,36,.15); }
        .modal-close { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid #d9e3db; border-radius: 999px; color: #546761; background: #fbfcf9; font-size: 21px; line-height: 1; }
        .generator-form { display: grid; gap: 15px; margin-top: 24px; }
        .generator-form label { display: grid; gap: 7px; color: #3f504d; font-size: 12px; font-weight: 700; }
        .generator-form input, .generator-form select { min-height: 42px; border: 1px solid #d5ddd6; border-radius: 8px; padding: 0 11px; color: #20343a; background: #fffefa; outline-color: #497970; }
        .generator-context { padding: 13px; border: 1px solid #dce8df; border-radius: 10px; background: #eef6f0; }
        .generator-context span, .segmented-field > span { color: #718078; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .generator-context strong { display: block; margin-top: 6px; color: #29453e; font-size: 14px; }
        .generator-context p { margin: 5px 0 0; color: #6b7974; font-size: 12px; }
        .segmented-field { display: grid; gap: 8px; }
        .segmented-field div, .count-shortcuts { display: flex; gap: 7px; }
        .segmented-field button, .count-shortcuts button { flex: 1; min-height: 38px; border: 1px solid #dce5dd; border-radius: 9px; color: #3d5751; background: #f7f9f6; font-size: 12px; font-weight: 800; }
        .segmented-field button.selected, .count-shortcuts button.selected { border-color: #4d806d; color: #fffefa; background: #4d806d; }
        .count-field { display: grid; grid-template-columns: 1fr auto; gap: 11px; align-items: end; }
        .count-shortcuts { min-width: 150px; }
        .generator-error { margin: 0; color: #9a4a4a; font-size: 12px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
        @media (max-width: 980px) { .practice-page { padding: 40px 34px 90px; }.practice-overview, .practice-shell { grid-template-columns: 1fr; }.practice-list { position: static; }.practice-header, .paper-heading { display: grid; }.paper-actions { flex-wrap: wrap; } }
        @media (max-width: 620px) { .practice-page { padding: 30px 18px 80px; }.practice-header h1 { font-size: 38px; }.modal-actions, .count-field { display: grid; }.count-shortcuts { min-width: 0; } }
      `}</style>
    </div>
  );
}

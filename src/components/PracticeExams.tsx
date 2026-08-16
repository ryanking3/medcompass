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
          <h1>Generate, store, and sit mock exams.</h1>
          <p>Practice papers live here, away from the planner. Generate from an existing exam, then open the paper when you are ready to test yourself.</p>
        </div>
        <button className="button primary" onClick={openGenerator}>Generate mock exam</button>
      </header>

      <section className="practice-shell">
        <aside className="practice-list">
          <div className="panel-heading"><div><p className="eyebrow">Generated</p><h2>{generatedExams.length} papers</h2></div></div>
          {generatedExams.length ? generatedExams.map((exam) => <button key={exam.id} className={selectedGenerated?.id === exam.id ? "practice-row active" : "practice-row"} onClick={() => setSelectedGeneratedId(exam.id)}>
            <span>{exam.format.toUpperCase()} · {exam.questions.length} questions</span>
            <strong>{exam.title}</strong>
            <small>{formatDateTime(exam.createdAt)}</small>
          </button>) : <div className="practice-empty-list">No generated exams yet. Use the button above to create a fake one from your planner data.</div>}
        </aside>

        <main className="practice-paper">
          {selectedGenerated ? <>
            <div className="paper-heading">
              <div>
                <p className="eyebrow">Practice paper</p>
                <h2>{selectedGenerated.title}</h2>
                <p>{selectedGenerated.format} · {selectedGenerated.questions.length} questions · fake AI mode</p>
              </div>
              <button className="button ghost" onClick={openGenerator}>Generate another</button>
            </div>
            <div className="standards-row">{selectedGenerated.standards.map((standard) => <span key={standard}>{standard}</span>)}</div>
            <div className="question-stack">{selectedGenerated.questions.map((question, index) => <article key={question.id}>
              <span>{question.type === "mcq" ? "MCQ" : "Written"} · {question.topicName}</span>
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

      {generatorOpen && <div className="practice-modal-backdrop">
        <section className="practice-modal" role="dialog" aria-modal="true" aria-labelledby="practice-generator-title">
          <div className="modal-heading">
            <div>
              <p className="eyebrow">Mock exam generator</p>
              <h2 id="practice-generator-title">Choose what to generate</h2>
            </div>
            <button className="modal-close" onClick={() => setGeneratorOpen(false)} aria-label="Close generator">×</button>
          </div>
          {exams.length ? <div className="generator-form">
            <label>Exam<select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></label>
            <label>Format<select value={format} onChange={(event) => setFormat(event.target.value as MockExamFormat)}><option value="mixed">Mixed</option><option value="mcq">Multiple choice</option><option value="written">Written answers</option></select></label>
            <label>Questions<input type="number" min="1" max="20" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} /></label>
            {sourceExam && <div className="generator-context"><strong>{sourceExam.title}</strong><p>{sourceExam.topics.length} topics · target {Math.round(sourceExam.targetMinutes / 60)}h study time</p></div>}
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
        .practice-shell { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
        .practice-list, .practice-paper { border: 1px solid #e1e6e1; border-radius: 14px; background: #fffefa; box-shadow: 0 8px 24px rgba(32,52,42,.032); }
        .practice-list { position: sticky; top: 24px; display: grid; gap: 8px; padding: 18px; }
        .panel-heading, .modal-heading, .paper-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .panel-heading h2, .modal-heading h2, .paper-heading h2 { margin: 0; color: #263d37; font: 23px Georgia, serif; font-weight: 500; }
        .practice-row { display: grid; gap: 4px; border: 1px solid #e2e8e2; border-radius: 10px; padding: 12px; color: #2f3d3b; background: #fbfcf9; text-align: left; }
        .practice-row.active { border-color: #c8dbc9; background: #eef6f0; }
        .practice-row span, .practice-row small { color: #6c7b75; font-size: 10px; }
        .practice-row strong { font-size: 12px; line-height: 1.35; }
        .practice-empty-list { padding: 16px; border: 1px dashed #c1cdc4; border-radius: 10px; color: #718078; font-size: 12px; line-height: 1.5; }
        .practice-paper { min-height: 620px; padding: 26px; }
        .paper-heading { margin-bottom: 14px; }
        .paper-heading p:not(.eyebrow) { margin: 6px 0 0; color: #6b7974; font-size: 12px; }
        .standards-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 18px; }
        .standards-row span { border-radius: 999px; padding: 6px 8px; color: #53675f; background: #edf4ee; font-size: 10px; font-weight: 800; }
        .question-stack { display: grid; gap: 11px; }
        .question-stack article { padding: 17px; border: 1px solid #e0e8e2; border-radius: 11px; background: #fbfcf9; }
        .question-stack article > span { color: #6d7d75; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
        .question-stack h3 { margin: 8px 0 10px; color: #263d37; font: 20px Georgia, serif; font-weight: 500; }
        .question-stack li, .question-stack p { color: #53635e; font-size: 12px; line-height: 1.55; }
        .question-stack summary { cursor: pointer; color: #3d796d; font-size: 12px; font-weight: 800; }
        .practice-empty { min-height: 560px; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; color: #718078; }
        .practice-empty span { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 16px; color: #3f7764; background: #e3efe6; font: 25px Georgia, serif; }
        .practice-empty h2 { margin: 0; color: #263d37; font: 28px Georgia, serif; font-weight: 500; }
        .practice-empty p { max-width: 420px; margin: 0; font-size: 13px; line-height: 1.55; }
        .practice-modal-backdrop { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 24px; background: rgba(22,36,31,.28); backdrop-filter: blur(4px); }
        .practice-modal { width: min(640px, 100%); max-height: calc(100vh - 48px); overflow: auto; padding: 26px; border: 1px solid #dce6de; border-radius: 16px; background: #fffefa; box-shadow: 0 24px 70px rgba(24,43,36,.18); }
        .modal-close { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid #d9e3db; border-radius: 999px; color: #546761; background: #fbfcf9; font-size: 21px; line-height: 1; }
        .generator-form { display: grid; gap: 12px; }
        .generator-form label { display: grid; gap: 7px; color: #3f504d; font-size: 12px; font-weight: 700; }
        .generator-form input, .generator-form select { min-height: 42px; border: 1px solid #d5ddd6; border-radius: 8px; padding: 0 11px; color: #20343a; background: #fffefa; outline-color: #497970; }
        .generator-context { padding: 13px; border: 1px solid #dce8df; border-radius: 10px; background: #eef6f0; }
        .generator-context p { margin: 5px 0 0; color: #6b7974; font-size: 12px; }
        .generator-error { margin: 0; color: #9a4a4a; font-size: 12px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
        @media (max-width: 980px) { .practice-page { padding: 40px 34px 90px; }.practice-shell { grid-template-columns: 1fr; }.practice-list { position: static; }.practice-header { display: grid; } }
        @media (max-width: 620px) { .practice-page { padding: 30px 18px 80px; }.practice-header h1 { font-size: 38px; }.modal-actions { display: grid; } }
      `}</style>
    </div>
  );
}

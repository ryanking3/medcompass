"use client";

import { useMemo, useState } from "react";
import type { MockExamFormat } from "@/lib/ai/types";
import type { ChatLaunchContext, StudyExam, StudyPracticeExam, StudyPracticeExamAttempt } from "./types";

type PracticeExamsProps = {
  exams: StudyExam[];
  generatedExams: StudyPracticeExam[];
  onGeneratedExamCreated: (exam: StudyPracticeExam) => void;
  onAttemptSaved: (practiceExamId: string, attempt: StudyPracticeExamAttempt) => void;
  onStartTimer: (title: string, minutes: number) => void;
  onOpenChatWithContext: (context: ChatLaunchContext) => void;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function estimateAttemptMinutes(exam: StudyPracticeExam) {
  const minutes = exam.questions.reduce((total, question) => total + (question.type === "written" ? 7 : 2), 0);
  return Math.max(15, Math.min(180, minutes));
}

function formatDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function PracticeExams({ exams, generatedExams, onGeneratedExamCreated, onAttemptSaved, onStartTimer, onOpenChatWithContext }: PracticeExamsProps) {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(exams[0]?.id ?? "");
  const [format, setFormat] = useState<MockExamFormat>("mixed");
  const [questionCount, setQuestionCount] = useState(6);
  const [selectedGeneratedId, setSelectedGeneratedId] = useState<string | null>(generatedExams[0]?.id ?? null);
  const [attemptMode, setAttemptMode] = useState(false);
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const selectedGenerated = generatedExams.find((exam) => exam.id === selectedGeneratedId) ?? generatedExams[0] ?? null;
  const sourceExam = useMemo(() => exams.find((exam) => exam.id === selectedExamId) ?? exams[0] ?? null, [exams, selectedExamId]);
  const upcomingExams = useMemo(() => [...exams].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()).slice(0, 3), [exams]);
  const selectedSourceDate = sourceExam ? new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(sourceExam.examDate)) : "";
  const answeredCount = selectedGenerated ? selectedGenerated.questions.filter((question) => answers[question.id]?.trim()).length : 0;
  const attemptMinutes = selectedGenerated ? estimateAttemptMinutes(selectedGenerated) : 0;
  const totalAttempts = generatedExams.reduce((total, exam) => total + exam.attempts.length, 0);
  const lastAttempt = selectedGenerated?.attempts[0] ?? null;
  const selectedHistoryAttempt = selectedGenerated?.attempts.find((attempt) => attempt.id === selectedAttemptId) ?? lastAttempt;

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
    const generatedExam = payload.practiceExam as StudyPracticeExam | undefined;
    if (!generatedExam) {
      setFeedback("The generated paper came back in an unexpected shape.");
      return;
    }
    onGeneratedExamCreated(generatedExam);
    setSelectedGeneratedId(generatedExam.id);
    setGeneratorOpen(false);
  };

  const selectGeneratedExam = (examId: string) => {
    setSelectedGeneratedId(examId);
    setAttemptMode(false);
    setAttemptStartedAt(null);
    setAnswers({});
    setSelectedAttemptId(null);
    setRevealedAnswers({});
  };

  const startAttempt = () => {
    if (!selectedGenerated) return;
    setAttemptMode(true);
    setAttemptStartedAt(new Date().toISOString());
    setFeedback("");
    setRevealedAnswers({});
    onStartTimer(`Practice exam: ${selectedGenerated.title}`, estimateAttemptMinutes(selectedGenerated));
  };

  const finishAttempt = async () => {
    if (!selectedGenerated || savingAttempt) return;
    setSavingAttempt(true);
    setFeedback("");
    const response = await fetch(`/api/practice-exams/${selectedGenerated.id}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: attemptStartedAt ?? new Date().toISOString(), answers }),
    });
    const payload = await response.json().catch(() => ({}));
    setSavingAttempt(false);
    if (!response.ok) {
      setFeedback(payload.error ?? "We couldn't save that attempt yet.");
      return;
    }
    const attempt = payload.attempt as StudyPracticeExamAttempt | undefined;
    if (attempt) {
      onAttemptSaved(selectedGenerated.id, attempt);
      setSelectedAttemptId(attempt.id);
    }
    setAttemptMode(false);
    setAttemptStartedAt(null);
    setRevealedAnswers(Object.fromEntries((selectedGenerated?.questions ?? []).map((question) => [question.id, true])));
    setFeedback("Attempt saved. Marking guides are now visible.");
  };

  const resetAttemptAnswers = () => {
    setAnswers({});
    setRevealedAnswers({});
    setFeedback("Attempt answers cleared for this paper.");
  };

  const revealAllGuides = () => {
    setRevealedAnswers(Object.fromEntries((selectedGenerated?.questions ?? []).map((question) => [question.id, true])));
  };

  const openPracticeReviewChat = (attempt?: StudyPracticeExamAttempt | null) => {
    if (!selectedGenerated) return;
    const answeredSummary = attempt ? selectedGenerated.questions.map((question, index) => {
      const submitted = attempt.answers[question.id]?.trim() || "No answer saved";
      return `${index + 1}. ${question.prompt}\nStudent answer: ${submitted}\nMarking guide: ${question.answer}`;
    }).join("\n\n") : selectedGenerated.questions.map((question, index) => `${index + 1}. ${question.prompt}`).join("\n");

    onOpenChatWithContext({
      id: crypto.randomUUID(),
      source: "practice",
      prompt: [
        `Help me review this practice paper: ${selectedGenerated.title}.`,
        attempt ? `Attempt completed ${formatDateTime(attempt.completedAt)} with ${attempt.answeredCount}/${attempt.questionCount} answered.` : "No completed attempt selected yet.",
        "Identify the biggest weak spots, explain the likely misconceptions, and suggest what to revise next.",
        "",
        answeredSummary,
      ].join("\n"),
    });
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
          <span>Attempts</span>
          <strong>{totalAttempts}</strong>
          <p>{totalAttempts === 1 ? "completed sit" : "completed sits"} saved for review</p>
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
          {generatedExams.length ? generatedExams.map((exam) => <button key={exam.id} className={selectedGenerated?.id === exam.id ? "practice-row active" : "practice-row"} onClick={() => selectGeneratedExam(exam.id)}>
            <span>{exam.format.toUpperCase()} · {exam.questions.length} Qs</span>
            <strong>{exam.title}</strong>
            <small>{exam.attempts[0] ? `Last attempt ${formatDateTime(exam.attempts[0].completedAt)}` : `Generated ${formatDateTime(exam.createdAt)}`}</small>
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
                <p>{selectedGenerated.format} · {selectedGenerated.questions.length} questions · {selectedGenerated.attempts.length} saved attempts · fake AI mode</p>
              </div>
              <div className="paper-actions">
                {selectedGenerated.attempts.length > 0 && <button className="button ghost" onClick={() => setHistoryOpen(true)}>Attempt history</button>}
                <button className="button ghost" onClick={() => openPracticeReviewChat(lastAttempt)}>Review with Chat</button>
                {attemptMode ? <button className="button dark" onClick={finishAttempt} disabled={savingAttempt}>{savingAttempt ? "Saving…" : "Finish attempt"}</button> : <button className="button ghost" onClick={startAttempt}>Start timed attempt · {attemptMinutes}m</button>}
                <button className="button ghost" onClick={openGenerator}>Generate another</button>
              </div>
            </div>
            {lastAttempt && !attemptMode && <div className="attempt-banner calm">
              <div>
                <span>Last attempt</span>
                <strong>{lastAttempt.answeredCount}/{lastAttempt.questionCount} answered</strong>
              </div>
              <p>Completed {formatDateTime(lastAttempt.completedAt)} in {formatDuration(lastAttempt.durationSeconds)}. Later this becomes scoring, weak-topic detection, and AI feedback.</p>
              <button className="attempt-chat-button" onClick={() => openPracticeReviewChat(lastAttempt)}>Review answers →</button>
            </div>}
            {attemptMode && <div className="attempt-banner">
              <div>
                <span>Attempt mode</span>
                <strong>{answeredCount}/{selectedGenerated.questions.length} answered</strong>
              </div>
              <p>Answers save when you finish. Use reset if you want a clean restart, or reveal guides for a quick open-book review.</p>
              <div className="attempt-controls">
                <button onClick={resetAttemptAnswers} disabled={!answeredCount}>Reset answers</button>
                <button onClick={revealAllGuides}>Reveal guides</button>
              </div>
            </div>}
            {feedback && <p className="practice-feedback" role="status">{feedback}</p>}
            <div className="standards-row">{selectedGenerated.standards.map((standard) => <span key={standard}>{standard}</span>)}</div>
            <div className="question-stack">{selectedGenerated.questions.map((question, index) => <article key={question.id}>
              <div className="question-meta">
                <span>{question.type === "mcq" ? "MCQ" : "Written"}</span>
                <small>{question.topicName}</small>
              </div>
              <h3>{index + 1}. {question.prompt}</h3>
              {question.options && <ol>{question.options.map((option) => <li key={option}>{option}</li>)}</ol>}
              {attemptMode && <label className="answer-box">
                Your answer
                <textarea value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={question.type === "mcq" ? "Choose an option and explain why…" : "Write your answer before revealing the guide…"} />
              </label>}
              {revealedAnswers[question.id] ? <div className="answer-guide">
                <span>Marking guide</span>
                <p><strong>Answer:</strong> {question.answer}</p>
                <p><strong>Rationale:</strong> {question.rationale}</p>
              </div> : <details>
                <summary>{attemptMode ? "Reveal marking guide" : "Show answer"}</summary>
                <p><strong>Answer:</strong> {question.answer}</p>
                <p><strong>Rationale:</strong> {question.rationale}</p>
              </details>}
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

      {historyOpen && selectedGenerated && <div className="practice-drawer-backdrop" onMouseDown={() => setHistoryOpen(false)}>
        <section className="practice-drawer history-drawer" role="dialog" aria-modal="true" aria-labelledby="practice-history-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-heading">
            <div>
              <p className="eyebrow">Attempt history</p>
              <h2 id="practice-history-title">{selectedGenerated.title}</h2>
            </div>
            <button className="modal-close" onClick={() => setHistoryOpen(false)} aria-label="Close attempt history">×</button>
          </div>
          {selectedGenerated.attempts.length ? <>
            <div className="history-list">
              {selectedGenerated.attempts.map((attempt, index) => <button key={attempt.id} className={selectedHistoryAttempt?.id === attempt.id ? "history-row active" : "history-row"} onClick={() => setSelectedAttemptId(attempt.id)}>
                <span>Attempt {selectedGenerated.attempts.length - index}</span>
                <strong>{attempt.answeredCount}/{attempt.questionCount} answered</strong>
                <p>{formatDateTime(attempt.completedAt)} · {formatDuration(attempt.durationSeconds)}</p>
              </button>)}
            </div>
            {selectedHistoryAttempt && <section className="history-detail">
              <div className="history-detail-heading">
                <div><p className="eyebrow">Answer review</p><h3>{selectedHistoryAttempt.answeredCount}/{selectedHistoryAttempt.questionCount} answered</h3></div>
                <button className="text-button" onClick={() => openPracticeReviewChat(selectedHistoryAttempt)}>Review with Chat →</button>
              </div>
              <div className="history-answer-stack">
                {selectedGenerated.questions.map((question, index) => <article key={question.id}>
                  <span>{index + 1}. {question.topicName}</span>
                  <strong>{question.prompt}</strong>
                  <p><b>Your answer</b>{selectedHistoryAttempt.answers[question.id] || "No answer saved."}</p>
                  <p><b>Guide</b>{question.answer}</p>
                </article>)}
              </div>
            </section>}
          </> : <div className="practice-empty-list">No saved attempts yet. Start a timed attempt and finish it to create history.</div>}
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
        .attempt-banner { display: flex; justify-content: space-between; gap: 18px; margin: 0 0 18px; padding: 14px 16px; border: 1px solid #cfe2d4; border-radius: 13px; background: linear-gradient(135deg, #e9f4ec, #fffefa); }
        .attempt-banner.calm { border-color: #e0e8e2; background: #fbfcf9; }
        .attempt-banner div { display: grid; gap: 3px; }
        .attempt-banner span { color: #4d806d; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .attempt-banner strong { color: #263d37; font: 21px Georgia, serif; font-weight: 500; }
        .attempt-banner p { max-width: 520px; margin: 0; color: #61716b; font-size: 12px; line-height: 1.5; }
        .attempt-controls { display: flex; gap: 7px; align-items: center; }
        .attempt-controls button, .attempt-chat-button { border: 1px solid #d8e3da; border-radius: 999px; padding: 8px 10px; color: #3d6f63; background: #fffefa; font-size: 11px; font-weight: 800; }
        .attempt-chat-button { align-self: center; white-space: nowrap; }
        .practice-feedback { margin: 0 0 14px; color: #2e6b58; font-size: 12px; font-weight: 800; }
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
        .answer-box { display: grid; gap: 8px; margin: 14px 0 10px; color: #3f504d; font-size: 11px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
        .answer-box textarea { min-height: 96px; resize: vertical; border: 1px solid #d5ddd6; border-radius: 10px; padding: 12px; color: #20343a; background: #fffefa; outline-color: #497970; font-size: 13px; line-height: 1.55; text-transform: none; letter-spacing: 0; font-weight: 500; }
        .answer-guide { margin-top: 13px; padding: 13px; border: 1px solid #dce8df; border-radius: 11px; background: #eef6f0; }
        .answer-guide span { color: #397468; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .answer-guide p { margin: 8px 0 0; }
        .practice-empty { min-height: 560px; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; color: #718078; }
        .practice-empty span { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 16px; color: #3f7764; background: #e3efe6; font: 25px Georgia, serif; }
        .practice-empty h2 { margin: 0; color: #263d37; font: 28px Georgia, serif; font-weight: 500; }
        .practice-empty p { max-width: 420px; margin: 0; font-size: 13px; line-height: 1.55; }
        .practice-drawer-backdrop { position: fixed; inset: 0; z-index: 90; display: flex; justify-content: flex-end; background: rgba(22,36,31,.24); backdrop-filter: blur(4px); }
        .practice-drawer { width: min(470px, 100%); height: 100%; overflow: auto; padding: 28px; border-left: 1px solid #dce6de; background: #fffefa; box-shadow: -24px 0 60px rgba(24,43,36,.15); }
        .history-drawer { width: min(620px, 100%); }
        .history-list { display: grid; gap: 10px; margin-top: 24px; }
        .history-row { width: 100%; padding: 15px; border: 1px solid #e0e8e2; border-radius: 12px; background: #fbfcf9; text-align: left; }
        .history-row.active { border-color: #bed6c4; background: #eef6f0; box-shadow: inset 3px 0 0 #4d806d; }
        .history-list span, .history-answer-stack span { color: #4d806d; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .history-list strong { display: block; margin-top: 6px; color: #263d37; font: 22px Georgia, serif; font-weight: 500; }
        .history-list p { margin: 5px 0 0; color: #65756e; font-size: 12px; }
        .history-detail { margin-top: 18px; padding-top: 18px; border-top: 1px solid #e6ece6; }
        .history-detail-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .history-detail h3 { margin: 0; color: #263d37; font: 23px Georgia, serif; font-weight: 500; }
        .history-answer-stack { display: grid; gap: 10px; }
        .history-answer-stack article { padding: 13px; border: 1px solid #e0e8e2; border-radius: 11px; background: #fbfcf9; }
        .history-answer-stack strong { display: block; margin: 7px 0 9px; color: #263d37; font: 17px Georgia, serif; font-weight: 500; line-height: 1.35; }
        .history-answer-stack p { display: grid; gap: 4px; margin: 8px 0 0; color: #53635e; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
        .history-answer-stack b { color: #314a44; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
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
        @media (max-width: 980px) { .practice-page { padding: 40px 34px 90px; }.practice-overview, .practice-shell { grid-template-columns: 1fr; }.practice-list { position: static; }.practice-header, .paper-heading, .attempt-banner { display: grid; }.paper-actions { flex-wrap: wrap; } }
        @media (max-width: 620px) { .practice-page { padding: 30px 18px 80px; }.practice-header h1 { font-size: 38px; }.modal-actions, .count-field { display: grid; }.count-shortcuts { min-width: 0; } }
      `}</style>
    </div>
  );
}

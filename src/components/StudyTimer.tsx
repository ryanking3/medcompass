"use client";

import { type FormEvent, useMemo, useState } from "react";

export type ActiveStudyTimer = {
  title: string;
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
};

type StudyTimerProps = {
  timer: ActiveStudyTimer | null;
  onStart: (title: string, minutes: number) => void;
  onPauseResume: () => void;
  onClear: () => void;
};

function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function StudyTimer({ timer, onStart, onPauseResume, onClear }: StudyTimerProps) {
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(25);
  const progress = useMemo(() => {
    if (!timer) return 0;
    return Math.round(((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100);
  }, [timer]);

  const submitTimer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim() || "Focused study session";
    onStart(cleanTitle, minutes);
  };

  return (
    <div className="timer-page">
      <header className="timer-header">
        <div>
          <p className="eyebrow">Study timer</p>
          <h1>Start one focused block.</h1>
          <p>Write what you’re about to do, choose the time, and MedCompass keeps the timer visible while you read, take notes, or review cards.</p>
        </div>
      </header>

      <section className="timer-layout">
        <form className="timer-card timer-form" onSubmit={submitTimer}>
          <div>
            <p className="eyebrow">Session brief</p>
            <h2>What are you doing now?</h2>
          </div>
          <label>
            Outline the task
            <textarea value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Review preload, afterload, and draw the Frank-Starling curve from memory" />
          </label>
          <label>
            Time block
            <div className="duration-row">
              {[15, 25, 45, 60, 90].map((value) => <button key={value} type="button" className={minutes === value ? "active" : ""} onClick={() => setMinutes(value)}>{value}m</button>)}
            </div>
            <input type="range" min="5" max="120" step="5" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
            <small>{minutes} minutes selected</small>
          </label>
          <button className="button primary" type="submit">{timer ? "Replace current timer" : "Start timer"} →</button>
        </form>

        <article className="timer-card timer-now">
          <p className="eyebrow">Current block</p>
          {timer ? <>
            <h2>{formatSeconds(timer.remainingSeconds)}</h2>
            <p>{timer.title}</p>
            <div className="timer-track"><span style={{ width: `${progress}%` }} /></div>
            <div className="timer-actions">
              <button className="button dark" onClick={onPauseResume}>{timer.running ? "Pause" : "Resume"}</button>
              <button className="button ghost" onClick={onClear}>Clear</button>
            </div>
          </> : <>
            <h2>No active timer</h2>
            <p>Use it as a lightweight commitment device: one task, one timer, then move on.</p>
            <div className="timer-suggestions">
              <button onClick={() => onStart("Read one source section and write 3 bullets", 25)}>25m source read</button>
              <button onClick={() => onStart("Review kept cards without editing", 15)}>15m card sprint</button>
              <button onClick={() => onStart("Make a one-page topic summary", 45)}>45m summary pass</button>
            </div>
          </>}
        </article>
      </section>

      <style jsx>{`
        .timer-page { max-width: 1120px; margin: 0 auto; padding: 55px 58px 115px; }
        .timer-header { margin-bottom: 32px; }
        .timer-header h1 { max-width: 640px; margin: 0 0 12px; color: #202b2e; font: 50px Georgia, serif; font-weight: 500; letter-spacing: -1.8px; }
        .timer-header p:not(.eyebrow) { max-width: 680px; margin: 0; color: #66746f; font-size: 14px; line-height: 1.6; }
        .timer-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
        .timer-card { border: 1px solid #dfe7df; border-radius: 14px; background: #fffefa; box-shadow: 0 8px 24px rgba(32, 52, 42, .032); }
        .timer-form { display: grid; gap: 18px; padding: 25px; }
        .timer-form h2, .timer-now h2 { margin: 0; color: #263d37; font: 27px Georgia, serif; font-weight: 500; }
        .timer-form label { display: grid; gap: 8px; color: #3f504d; font-size: 12px; font-weight: 700; }
        .timer-form textarea { min-height: 120px; resize: vertical; border: 1px solid #d5ddd6; border-radius: 8px; padding: 13px; color: #20343a; background: #fffefa; outline-color: #497970; font-size: 13px; line-height: 1.5; }
        .duration-row { display: flex; flex-wrap: wrap; gap: 7px; }
        .duration-row button { border: 1px solid #d8e2d9; border-radius: 999px; padding: 8px 11px; color: #60706a; background: #fbfcf9; font-size: 11px; font-weight: 800; }
        .duration-row button.active { color: white; border-color: #2f5c55; background: #2f5c55; }
        .timer-form input { width: 100%; accent-color: #497970; }
        .timer-form small { color: #718078; font-size: 11px; }
        .timer-now { position: sticky; top: 24px; padding: 25px; background: linear-gradient(145deg, #e8f1e9, #fffefa); }
        .timer-now h2 { margin-top: 8px; font-size: 46px; letter-spacing: -1.4px; }
        .timer-now p:not(.eyebrow) { margin: 8px 0 18px; color: #5b6d66; font-size: 13px; line-height: 1.5; }
        .timer-track { height: 9px; overflow: hidden; border-radius: 99px; background: #dce8df; }
        .timer-track span { display: block; height: 100%; border-radius: inherit; background: #4f8276; transition: width .25s ease; }
        .timer-actions { display: flex; gap: 8px; margin-top: 18px; }
        .timer-suggestions { display: grid; gap: 8px; margin-top: 18px; }
        .timer-suggestions button { border: 1px solid #dce6de; border-radius: 9px; padding: 11px; color: #31574f; background: rgba(255,254,250,.78); text-align: left; font-size: 12px; font-weight: 800; }
        .timer-suggestions button:hover { border-color: #b8d0be; background: #f7fbf7; }
        @media (max-width: 900px) { .timer-page { padding: 40px 34px 100px; }.timer-layout { grid-template-columns: 1fr; }.timer-now { position: static; } }
        @media (max-width: 600px) { .timer-page { padding: 30px 18px 90px; }.timer-header h1 { font-size: 38px; }.timer-actions { display: grid; } }
      `}</style>
    </div>
  );
}

export function FloatingStudyTimer({ timer, onOpenTimer, onPauseResume, onClear }: { timer: ActiveStudyTimer; onOpenTimer: () => void; onPauseResume: () => void; onClear: () => void }) {
  const progress = Math.round(((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100);

  return (
    <div className="floating-timer" role="status" aria-label="Active study timer">
      <button className="floating-main" onClick={onOpenTimer}>
        <span>{timer.running ? "Focus timer" : "Timer paused"}</span>
        <strong>{formatSeconds(timer.remainingSeconds)}</strong>
        <small>{timer.title}</small>
        <i><b style={{ width: `${progress}%` }} /></i>
      </button>
      <button className="floating-action" onClick={onPauseResume}>{timer.running ? "Ⅱ" : "▶"}</button>
      <button className="floating-action" onClick={onClear}>×</button>
      <style jsx>{`
        .floating-timer { position: fixed; right: 24px; bottom: 24px; z-index: 11; display: grid; grid-template-columns: minmax(220px, 280px) 36px 36px; gap: 7px; align-items: stretch; }
        .floating-main, .floating-action { border: 1px solid rgba(28,55,52,.16); background: rgba(255,254,250,.94); box-shadow: 0 14px 36px rgba(18,37,34,.18); backdrop-filter: blur(14px); }
        .floating-main { display: grid; gap: 3px; padding: 12px 13px; border-radius: 14px; color: #263d37; text-align: left; }
        .floating-main span { color: #63766e; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .09em; }
        .floating-main strong { font: 25px Georgia, serif; font-weight: 500; }
        .floating-main small { overflow: hidden; color: #61716b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        .floating-main i { height: 5px; overflow: hidden; border-radius: 99px; background: #e0e9e2; }
        .floating-main b { display: block; height: 100%; border-radius: inherit; background: #4f8276; }
        .floating-action { border-radius: 12px; color: #31574f; font-size: 16px; font-weight: 800; }
        .floating-action:hover, .floating-main:hover { border-color: rgba(78,125,105,.42); }
        @media (max-width: 760px) { .floating-timer { left: 12px; right: 12px; bottom: 12px; grid-template-columns: minmax(0, 1fr) 36px 36px; } }
      `}</style>
    </div>
  );
}

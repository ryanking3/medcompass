"use client";

import { useMemo, useState } from "react";
import type { StudyAvailabilityRule, StudyCourse, StudyExam, StudyPlanBlock, StudyPlanBlockStatus, StudyTopic } from "@/components/types";

type StudyPlannerProps = {
  courses: StudyCourse[];
  initialExams: StudyExam[];
  initialAvailability: StudyAvailabilityRule[];
  initialPlanBlocks: StudyPlanBlock[];
  onCreateTopic: () => void;
  onOpenTopic: (topic: StudyTopic) => void;
};

const weekdays = [
  { dayOfWeek: 0, label: "Sun" },
  { dayOfWeek: 1, label: "Mon" },
  { dayOfWeek: 2, label: "Tue" },
  { dayOfWeek: 3, label: "Wed" },
  { dayOfWeek: 4, label: "Thu" },
  { dayOfWeek: 5, label: "Fri" },
  { dayOfWeek: 6, label: "Sat" },
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function buildInitialAvailability(rules: StudyAvailabilityRule[]) {
  return weekdays.map(({ dayOfWeek }) => {
    const savedRule = rules.find((rule) => rule.dayOfWeek === dayOfWeek);
    const defaultMinutes = dayOfWeek === 0 || dayOfWeek === 6 ? 0 : 60;
    return { dayOfWeek, minutesAvailable: savedRule?.minutesAvailable ?? defaultMinutes };
  });
}

export function StudyPlanner({ courses, initialExams, initialAvailability, initialPlanBlocks, onCreateTopic, onOpenTopic }: StudyPlannerProps) {
  const topics = useMemo(() => courses.flatMap((course) => course.modules.flatMap((module) => module.topics.map((topic) => ({ ...topic, courseId: course.id, courseName: course.name, moduleName: module.name })))), [courses]);
  const [exams, setExams] = useState(initialExams);
  const [availability, setAvailability] = useState(buildInitialAvailability(initialAvailability));
  const [planBlocks, setPlanBlocks] = useState(initialPlanBlocks);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [selectedExamId, setSelectedExamId] = useState(initialExams[0]?.id ?? "");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(topics.slice(0, 3).map((topic) => topic.id));
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetHours, setTargetHours] = useState(12);
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"exam" | "availability" | "generate" | "block" | null>(null);

  const selectedCourseTopics = topics.filter((topic) => !selectedCourseId || topic.courseId === selectedCourseId);
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? exams[0] ?? null;
  const selectedExamBlocks = selectedExam ? planBlocks.filter((block) => block.examId === selectedExam.id) : [];
  const doneMinutes = selectedExamBlocks.filter((block) => block.status === "done").reduce((total, block) => total + block.durationMinutes, 0);
  const scheduledMinutes = selectedExamBlocks.reduce((total, block) => total + block.durationMinutes, 0);
  const upcomingDates = Array.from({ length: 21 }, (_, index) => addDays(new Date(`${todayString()}T00:00:00`), index).toISOString().slice(0, 10));

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));

  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 3200);
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((current) => current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId]);
  };

  const createExam = async () => {
    setBusy("exam");
    const response = await fetch("/api/planner/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, examDate, courseId: selectedCourseId || null, targetMinutes: Math.round(targetHours * 60), notes, topicIds: selectedTopicIds }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      notify(payload.error ?? "We couldn't create that exam.");
      return;
    }
    setExams((current) => [payload.exam, ...current].sort((first, second) => first.examDate.localeCompare(second.examDate)));
    setSelectedExamId(payload.exam.id);
    setTitle("");
    setExamDate("");
    setNotes("");
    notify("Exam added to your planner.");
  };

  const saveAvailability = async () => {
    setBusy("availability");
    const response = await fetch("/api/planner/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: availability }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      notify(payload.error ?? "We couldn't save your availability.");
      return;
    }
    setAvailability(payload.availability.map((rule: StudyAvailabilityRule) => ({ dayOfWeek: rule.dayOfWeek, minutesAvailable: rule.minutesAvailable })));
    notify("Availability saved.");
  };

  const generatePlan = async () => {
    if (!selectedExam) return;
    setBusy("generate");
    const response = await fetch("/api/planner/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: selectedExam.id }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      notify(payload.error ?? "We couldn't generate that plan.");
      return;
    }
    setPlanBlocks((current) => [...current.filter((block) => block.examId !== selectedExam.id), ...payload.blocks].sort((first, second) => first.startsOn.localeCompare(second.startsOn)));
    notify(`Plan generated: ${minutesLabel(payload.scheduledMinutes ?? 0)} scheduled.`);
  };

  const updateBlockStatus = async (block: StudyPlanBlock, status: StudyPlanBlockStatus) => {
    setBusy("block");
    const response = await fetch(`/api/planner/blocks/${block.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      notify(payload.error ?? "We couldn't update that study block.");
      return;
    }
    setPlanBlocks((current) => current.map((entry) => entry.id === block.id ? payload.block : entry));
  };

  if (!topics.length) {
    return <div className="planner-empty"><section><p className="eyebrow">Study planner</p><h1>Plan around topics.</h1><p>Create at least one topic first, then MedCompass can turn your exam dates and availability into a source-aware study calendar.</p><button className="button primary" onClick={onCreateTopic}>Create your first topic</button></section><style jsx>{`.planner-empty { min-height: 100vh; display: grid; place-items: center; padding: 42px; }.planner-empty section { width: min(560px, 100%); padding: 42px; border: 1px solid #dce6de; border-radius: 14px; background: #fffefa; box-shadow: 0 18px 40px rgba(37,58,47,.05); }.planner-empty h1 { margin: 0 0 10px; font: 42px Georgia, serif; font-weight: 500; letter-spacing: -1.2px; }.planner-empty p:not(.eyebrow) { margin: 0 0 24px; color: #66746f; font-size: 14px; line-height: 1.6; }`}</style></div>;
  }

  return <div className="planner-page">
    <header className="planner-header"><div><p className="eyebrow">Study planner</p><h1>Build a calendar from your exams.</h1><p>Set the exams, choose the topics, add your weekly availability, then generate study blocks that stay connected to your MedCompass workspace.</p></div>{feedback && <p className="planner-feedback" role="status">{feedback}</p>}</header>

    <section className="planner-overview">
      <article><p className="eyebrow">Active exam</p><h2>{selectedExam?.title ?? "No exam yet"}</h2><p>{selectedExam ? `${formatShortDate(selectedExam.examDate)} · ${minutesLabel(selectedExam.targetMinutes)} target` : "Add an exam to begin planning."}</p></article>
      <article><p className="eyebrow">Scheduled</p><h2>{minutesLabel(scheduledMinutes)}</h2><p>{selectedExamBlocks.length} planned study {selectedExamBlocks.length === 1 ? "block" : "blocks"}</p></article>
      <article><p className="eyebrow">Completed</p><h2>{minutesLabel(doneMinutes)}</h2><p>{scheduledMinutes ? `${Math.round((doneMinutes / scheduledMinutes) * 100)}% of scheduled time` : "No completed blocks yet"}</p></article>
    </section>

    <div className="planner-grid">
      <section className="planner-panel exam-panel">
        <div className="panel-heading"><div><p className="eyebrow">Exam setup</p><h2>Add an exam</h2></div></div>
        <div className="planner-form">
          <label>Exam name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Cardiovascular systems exam" /></label>
          <label>Date<input type="date" min={todayString()} value={examDate} onChange={(event) => setExamDate(event.target.value)} /></label>
          <label>Course<select value={selectedCourseId} onChange={(event) => { setSelectedCourseId(event.target.value); setSelectedTopicIds([]); }}>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
          <label>Target study hours<input type="number" min="1" max="200" value={targetHours} onChange={(event) => setTargetHours(Number(event.target.value))} /></label>
          <label className="wide">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional: exam format, high-yield reminders, lecturer emphasis..." /></label>
        </div>
        <div className="topic-picker"><p className="eyebrow">Topics to cover</p>{selectedCourseTopics.map((topic) => <button key={topic.id} className={selectedTopicIds.includes(topic.id) ? "topic-chip active" : "topic-chip"} onClick={() => toggleTopic(topic.id)}>{topic.name}</button>)}</div>
        <button className="button primary" onClick={createExam} disabled={busy === "exam" || !title.trim() || !examDate || !selectedTopicIds.length}>{busy === "exam" ? "Adding..." : "Add exam"}</button>
      </section>

      <section className="planner-panel availability-panel">
        <div className="panel-heading"><div><p className="eyebrow">Availability</p><h2>Your study week</h2></div><button className="text-button" onClick={saveAvailability} disabled={busy === "availability"}>{busy === "availability" ? "Saving..." : "Save"}</button></div>
        <div className="availability-list">{weekdays.map((weekday) => {
          const rule = availability.find((entry) => entry.dayOfWeek === weekday.dayOfWeek) ?? { dayOfWeek: weekday.dayOfWeek, minutesAvailable: 0 };
          return <label key={weekday.dayOfWeek}>{weekday.label}<input type="number" min="0" max="720" step="15" value={rule.minutesAvailable} onChange={(event) => setAvailability((current) => current.map((entry) => entry.dayOfWeek === weekday.dayOfWeek ? { ...entry, minutesAvailable: Number(event.target.value) } : entry))} /><span>min</span></label>;
        })}</div>
      </section>

      <section className="planner-panel exams-panel">
        <div className="panel-heading"><div><p className="eyebrow">Exam list</p><h2>Upcoming exams</h2></div></div>
        {exams.length ? <div className="exam-list">{exams.map((exam) => <button key={exam.id} className={selectedExam?.id === exam.id ? "exam-row active" : "exam-row"} onClick={() => setSelectedExamId(exam.id)}><span>{formatShortDate(exam.examDate)}</span><strong>{exam.title}</strong><small>{exam.topics.length} {exam.topics.length === 1 ? "topic" : "topics"} · {minutesLabel(exam.targetMinutes)}</small></button>)}</div> : <div className="planner-soft-empty">Add your first exam to generate a calendar.</div>}
        <button className="button dark" onClick={generatePlan} disabled={!selectedExam || busy === "generate"}>{busy === "generate" ? "Generating..." : "Generate study calendar"}</button>
      </section>
    </div>

    <section className="calendar-panel">
      <div className="section-heading"><div><p className="eyebrow">Calendar</p><h2>Next 21 days</h2></div>{selectedExam && <span>{selectedExam.title}</span>}</div>
      <div className="calendar-grid">{upcomingDates.map((date) => {
        const blocks = selectedExamBlocks.filter((block) => block.startsOn === date);
        return <article key={date} className={blocks.length ? "calendar-day has-blocks" : "calendar-day"}><time>{formatShortDate(date)}</time>{blocks.length ? blocks.map((block) => {
          const topic = topicById.get(block.topicId);
          return <div key={block.id} className={`plan-block ${block.status}`}><button onClick={() => topic && onOpenTopic(topic)}><strong>{block.title}</strong><small>{minutesLabel(block.durationMinutes)}</small></button><div><button onClick={() => updateBlockStatus(block, block.status === "done" ? "planned" : "done")} disabled={busy === "block"}>{block.status === "done" ? "Undo" : "Done"}</button><button onClick={() => updateBlockStatus(block, block.status === "skipped" ? "planned" : "skipped")} disabled={busy === "block"}>{block.status === "skipped" ? "Plan" : "Skip"}</button></div></div>;
        }) : <span className="calendar-empty">No study planned</span>}</article>;
      })}</div>
    </section>

    <style jsx>{`.planner-page { max-width: 1220px; margin: 0 auto; padding: 55px 58px 100px; }.planner-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 32px; }.planner-header h1 { max-width: 650px; margin: 0 0 12px; color: #202b2e; font: 47px Georgia, serif; font-weight: 500; letter-spacing: -1.7px; }.planner-header p:not(.eyebrow):not(.planner-feedback) { max-width: 680px; margin: 0; color: #66746f; font-size: 14px; line-height: 1.6; }.planner-feedback { margin: 0; padding: 10px 12px; border-radius: 8px; color: #2e6b58; background: #e7f2e9; font-size: 12px; }.planner-overview { display: grid; grid-template-columns: 1.3fr .85fr .85fr; gap: 12px; margin-bottom: 18px; }.planner-overview article { padding: 18px; border: 1px solid #dbe5dc; border-radius: 10px; background: #fffefa; }.planner-overview h2 { margin: 0 0 7px; font: 25px Georgia, serif; font-weight: 500; }.planner-overview p:not(.eyebrow) { margin: 0; color: #6b7974; font-size: 12px; }.planner-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr); gap: 16px; }.planner-panel, .calendar-panel { border: 1px solid #e1e6e1; border-radius: 12px; background: #fffefa; box-shadow: 0 8px 24px rgba(32, 52, 42, .032); }.planner-panel { padding: 22px; }.exam-panel { grid-row: span 2; }.panel-heading, .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }.panel-heading h2, .section-heading h2 { margin: 0; font: 22px Georgia, serif; font-weight: 500; }.planner-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.planner-form label, .availability-list label { display: grid; gap: 7px; color: #3f504d; font-size: 12px; font-weight: 700; }.planner-form input, .planner-form select, .planner-form textarea, .availability-list input { width: 100%; min-height: 42px; border: 1px solid #d5ddd6; border-radius: 7px; padding: 0 11px; color: #20343a; background: #fffefa; outline-color: #497970; }.planner-form textarea { min-height: 88px; padding: 11px; resize: vertical; }.planner-form .wide { grid-column: 1 / -1; }.topic-picker { display: flex; flex-wrap: wrap; gap: 7px; margin: 18px 0; }.topic-picker .eyebrow { flex: 0 0 100%; }.topic-chip { border: 1px solid #d8e0d8; border-radius: 99px; padding: 7px 10px; color: #60706a; background: #fbfcf9; font-size: 11px; }.topic-chip.active { color: #31715e; background: #e6f1e8; border-color: #cfe0d3; font-weight: 700; }.availability-list { display: grid; gap: 9px; }.availability-list label { grid-template-columns: 42px 1fr 28px; align-items: center; }.availability-list input { min-height: 35px; }.availability-list span { color: #7b8881; font-size: 10px; font-weight: 700; }.exam-list { display: grid; gap: 7px; margin-bottom: 16px; }.exam-row { display: grid; gap: 3px; width: 100%; padding: 12px; border: 1px solid #e1e7e1; border-radius: 8px; color: #2f3d3b; background: #fffefa; text-align: left; }.exam-row.active { border-color: #c8dbc9; background: #eef6f0; }.exam-row span, .exam-row small { color: #6c7b75; font-size: 10px; }.exam-row strong { font-size: 12px; }.planner-soft-empty { margin-bottom: 16px; padding: 16px; border: 1px dashed #c1cdc4; border-radius: 8px; color: #718078; font-size: 12px; }.calendar-panel { margin-top: 18px; padding: 22px; }.section-heading span { color: #6d7b75; font-size: 12px; }.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }.calendar-day { min-height: 145px; padding: 10px; border: 1px solid #e4e8e4; border-radius: 9px; background: #fbfcf9; }.calendar-day.has-blocks { background: #fffefa; }.calendar-day time { display: block; margin-bottom: 9px; color: #61736b; font-size: 10px; font-weight: 700; }.calendar-empty { color: #a0aaa4; font-size: 10px; }.plan-block { display: grid; gap: 7px; padding: 8px; border-radius: 8px; background: #e7f1e8; }.plan-block + .plan-block { margin-top: 7px; }.plan-block.done { background: #dcecdf; }.plan-block.skipped { background: #f3e7e2; }.plan-block > button { display: grid; gap: 3px; border: 0; padding: 0; color: #2f5047; background: transparent; text-align: left; }.plan-block strong { font-size: 11px; line-height: 1.25; }.plan-block small { color: #64766e; font-size: 10px; }.plan-block div { display: flex; gap: 6px; }.plan-block div button { border: 0; padding: 0; color: #3d796d; background: transparent; font-size: 10px; font-weight: 700; } @media (max-width: 1050px) { .planner-page { padding: 40px 34px 90px; }.planner-overview, .planner-grid { grid-template-columns: 1fr; }.exam-panel { grid-row: auto; }.calendar-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } } @media (max-width: 650px) { .planner-page { padding: 30px 18px 80px; }.planner-header { display: grid; }.planner-header h1 { font-size: 38px; }.planner-form { grid-template-columns: 1fr; }.calendar-grid { grid-template-columns: 1fr; } }`}</style>
  </div>;
}

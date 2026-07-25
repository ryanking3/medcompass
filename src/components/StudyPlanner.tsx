"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { StudyAvailabilityRule, StudyCourse, StudyExam, StudyPlanBlock, StudyPlanBlockStatus, StudyTopic } from "@/components/types";

type StudyPlannerProps = {
  courses: StudyCourse[];
  exams: StudyExam[];
  availability: Array<{ dayOfWeek: number; minutesAvailable: number }>;
  planBlocks: StudyPlanBlock[];
  onExamsChange: Dispatch<SetStateAction<StudyExam[]>>;
  onAvailabilityChange: Dispatch<SetStateAction<StudyAvailabilityRule[]>>;
  onPlanBlocksChange: Dispatch<SetStateAction<StudyPlanBlock[]>>;
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

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function todayString() {
  const today = new Date();
  return `${today.getFullYear()}-${padDatePart(today.getMonth() + 1)}-${padDatePart(today.getDate())}`;
}

function tomorrowString() {
  return toDateString(addDays(parsePlainDate(todayString()), 1));
}

function parsePlainDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
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

function buildInitialAvailability(rules: StudyAvailabilityRule[]) {
  return weekdays.map(({ dayOfWeek }) => {
    const savedRule = rules.find((rule) => rule.dayOfWeek === dayOfWeek);
    const defaultMinutes = dayOfWeek === 0 || dayOfWeek === 6 ? 0 : 60;
    return { dayOfWeek, minutesAvailable: savedRule?.minutesAvailable ?? defaultMinutes };
  });
}

function availabilityMinutesBetween(startDate: string, endDate: string, availability: Array<{ dayOfWeek: number; minutesAvailable: number }>, blocks: StudyPlanBlock[], excludedExamId?: string) {
  const start = parsePlainDate(startDate);
  const end = parsePlainDate(endDate);
  const availabilityByDay = new Map(availability.map((rule) => [rule.dayOfWeek, rule.minutesAvailable]));
  let total = 0;
  for (let cursor = start; cursor < end; cursor = addDays(cursor, 1)) {
    const date = toDateString(cursor);
    const committedMinutes = blocks
      .filter((block) => block.startsOn === date && block.examId !== excludedExamId && block.status !== "skipped")
      .reduce((sum, block) => sum + block.durationMinutes, 0);
    total += Math.max(0, (availabilityByDay.get(cursor.getUTCDay()) ?? 0) - committedMinutes);
  }
  return total;
}

export function StudyPlanner({ courses, exams, availability, planBlocks, onExamsChange, onAvailabilityChange, onPlanBlocksChange, onCreateTopic, onOpenTopic }: StudyPlannerProps) {
  const topics = useMemo(() => courses.flatMap((course) => course.modules.flatMap((module) => module.topics.map((topic) => ({ ...topic, courseId: course.id, courseName: course.name, moduleName: module.name })))), [courses]);
  const availabilityRules = useMemo(() => buildInitialAvailability(availability as StudyAvailabilityRule[]), [availability]);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [selectedExamId, setSelectedExamId] = useState(exams[0]?.id ?? "");
  const [calendarStart, setCalendarStart] = useState(todayString());
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
  const selectedActiveBlocks = selectedExamBlocks.filter((block) => block.status !== "skipped");
  const activePlanBlocks = planBlocks.filter((block) => block.status !== "skipped");
  const scheduledMinutes = selectedActiveBlocks.reduce((total, block) => total + block.durationMinutes, 0);
  const calendarDates = Array.from({ length: 42 }, (_, index) => toDateString(addDays(parsePlainDate(calendarStart), index)));
  const calendarEnd = calendarDates[calendarDates.length - 1];
  const examById = new Map(exams.map((exam) => [exam.id, exam]));
  const totalPlannedMinutes = activePlanBlocks.reduce((total, block) => total + block.durationMinutes, 0);
  const selectedCapacity = selectedExam ? availabilityMinutesBetween(todayString(), selectedExam.examDate, availabilityRules, planBlocks, selectedExam.id) : 0;
  const selectedCapacityGap = selectedExam ? selectedExam.targetMinutes - selectedCapacity : 0;
  const draftCapacity = examDate ? availabilityMinutesBetween(todayString(), examDate, availabilityRules, planBlocks) : 0;
  const draftTargetMinutes = Math.round(targetHours * 60);
  const draftCapacityGap = examDate ? draftTargetMinutes - draftCapacity : 0;

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
    onExamsChange((current) => [payload.exam, ...current].sort((first, second) => first.examDate.localeCompare(second.examDate)));
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
      body: JSON.stringify({ rules: availabilityRules }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      notify(payload.error ?? "We couldn't save your availability.");
      return;
    }
    onAvailabilityChange(payload.availability.map((rule: StudyAvailabilityRule) => ({ id: rule.id, dayOfWeek: rule.dayOfWeek, minutesAvailable: rule.minutesAvailable })));
    notify("Availability saved.");
  };

  const generatePlan = async () => {
    if (!selectedExam) return;
    setBusy("generate");
    const response = await fetch("/api/planner/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: selectedExam.id, availability: availabilityRules }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      notify(payload.error ?? "We couldn't generate that plan.");
      return;
    }
    onPlanBlocksChange((current) => [...current.filter((block) => block.examId !== selectedExam.id), ...payload.blocks].sort((first, second) => first.startsOn.localeCompare(second.startsOn)));
    notify(payload.unscheduledMinutes > 0 ? `Plan generated, but ${minutesLabel(payload.unscheduledMinutes)} could not fit. Adjust availability or target hours.` : `Plan generated: ${minutesLabel(payload.scheduledMinutes ?? 0)} scheduled.`);
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
    onPlanBlocksChange((current) => current.map((entry) => entry.id === block.id ? payload.block : entry));
  };

  if (!topics.length) {
    return <div className="planner-empty"><section><p className="eyebrow">Study planner</p><h1>Plan around topics.</h1><p>Create at least one topic first, then MedCompass can turn your exam dates and availability into a source-aware study calendar.</p><button className="button primary" onClick={onCreateTopic}>Create your first topic</button></section><style jsx>{`.planner-empty { min-height: 100vh; display: grid; place-items: center; padding: 42px; }.planner-empty section { width: min(560px, 100%); padding: 42px; border: 1px solid #dce6de; border-radius: 14px; background: #fffefa; box-shadow: 0 18px 40px rgba(37,58,47,.05); }.planner-empty h1 { margin: 0 0 10px; font: 42px Georgia, serif; font-weight: 500; letter-spacing: -1.2px; }.planner-empty p:not(.eyebrow) { margin: 0 0 24px; color: #66746f; font-size: 14px; line-height: 1.6; }`}</style></div>;
  }

  return <div className="planner-page">
    <header className="planner-header"><div><p className="eyebrow">Study planner</p><h1>Build a calendar from your exams.</h1><p>Set the exams, choose the topics, add your weekly availability, then generate study blocks that stay connected to your MedCompass workspace. Plans now share the same calendar, so existing exam blocks reduce the time available for new ones.</p></div>{feedback && <p className="planner-feedback" role="status">{feedback}</p>}</header>

    <section className="planner-overview">
      <article><p className="eyebrow">Active exam</p><h2>{selectedExam?.title ?? "No exam yet"}</h2><p>{selectedExam ? `${formatShortDate(selectedExam.examDate)} · ${minutesLabel(selectedExam.targetMinutes)} target` : "Add an exam to begin planning."}</p></article>
      <article><p className="eyebrow">Scheduled</p><h2>{minutesLabel(scheduledMinutes)}</h2><p>{selectedActiveBlocks.length} active study {selectedActiveBlocks.length === 1 ? "block" : "blocks"}</p></article>
      <article><p className="eyebrow">Across exams</p><h2>{minutesLabel(totalPlannedMinutes)}</h2><p>{activePlanBlocks.length} active planned {activePlanBlocks.length === 1 ? "block" : "blocks"}</p></article>
    </section>
    {selectedExam && selectedCapacityGap > 0 && <aside className="planner-alert"><strong>Not enough open availability for {selectedExam.title}.</strong><span>{minutesLabel(selectedExam.targetMinutes)} requested, but only {minutesLabel(selectedCapacity)} is currently open before the exam after other planned blocks.</span></aside>}

    <div className="planner-grid">
      <section className="planner-panel exam-panel">
        <div className="panel-heading"><div><p className="eyebrow">Exam setup</p><h2>Add an exam</h2></div></div>
        <div className="planner-form">
          <label>Exam name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Cardiovascular systems exam" /></label>
          <label>Date<input type="date" min={tomorrowString()} value={examDate} onChange={(event) => setExamDate(event.target.value)} /></label>
          <label>Course<select value={selectedCourseId} onChange={(event) => { setSelectedCourseId(event.target.value); setSelectedTopicIds([]); }}>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
          <label>Target study hours<input type="number" min="1" max="200" value={targetHours} onChange={(event) => setTargetHours(Number(event.target.value))} /></label>
          <label className="wide">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional: exam format, high-yield reminders, lecturer emphasis..." /></label>
        </div>
        {examDate && draftCapacityGap > 0 && <p className="capacity-warning">This date currently has {minutesLabel(draftCapacity)} open study time before the exam, below the {minutesLabel(draftTargetMinutes)} target. Reduce target hours or add availability.</p>}
        <div className="topic-picker"><p className="eyebrow">Topics to cover</p>{selectedCourseTopics.map((topic) => <button key={topic.id} className={selectedTopicIds.includes(topic.id) ? "topic-chip active" : "topic-chip"} onClick={() => toggleTopic(topic.id)}>{topic.name}</button>)}</div>
        <button className="button primary" onClick={createExam} disabled={busy === "exam" || !title.trim() || !examDate || !selectedTopicIds.length}>{busy === "exam" ? "Adding..." : "Add exam"}</button>
      </section>

      <section className="planner-panel availability-panel">
        <div className="panel-heading"><div><p className="eyebrow">Availability</p><h2>Your study week</h2></div><button className="text-button" onClick={saveAvailability} disabled={busy === "availability"}>{busy === "availability" ? "Saving..." : "Save"}</button></div>
        <div className="availability-list">{weekdays.map((weekday) => {
          const rule = availabilityRules.find((entry) => entry.dayOfWeek === weekday.dayOfWeek) ?? { dayOfWeek: weekday.dayOfWeek, minutesAvailable: 0 };
          return <label key={weekday.dayOfWeek}>{weekday.label}<input type="number" min="0" max="720" step="15" value={rule.minutesAvailable} onChange={(event) => onAvailabilityChange((current) => buildInitialAvailability(current).map((entry) => entry.dayOfWeek === weekday.dayOfWeek ? { ...entry, minutesAvailable: Number(event.target.value) } : entry))} /><span>min</span></label>;
        })}</div>
      </section>

      <section className="planner-panel exams-panel">
        <div className="panel-heading"><div><p className="eyebrow">Exam list</p><h2>Upcoming exams</h2></div></div>
        {exams.length ? <div className="exam-list">{exams.map((exam) => <button key={exam.id} className={selectedExam?.id === exam.id ? "exam-row active" : "exam-row"} onClick={() => setSelectedExamId(exam.id)}><span>{formatShortDate(exam.examDate)}</span><strong>{exam.title}</strong><small>{exam.topics.length} {exam.topics.length === 1 ? "topic" : "topics"} · {minutesLabel(exam.targetMinutes)}</small></button>)}</div> : <div className="planner-soft-empty">Add your first exam to generate a calendar.</div>}
        <button className="button dark" onClick={generatePlan} disabled={!selectedExam || busy === "generate"}>{busy === "generate" ? "Generating..." : "Generate selected exam"}</button>
      </section>
    </div>

    <section className="calendar-panel">
      <div className="section-heading"><div><p className="eyebrow">Calendar</p><h2>{formatShortDate(calendarStart)} to {formatShortDate(calendarEnd)}</h2></div><div className="calendar-controls"><button className="text-button" onClick={() => setCalendarStart(toDateString(addDays(parsePlainDate(calendarStart), -42)))}>Previous</button><button className="text-button" onClick={() => setCalendarStart(todayString())}>Today</button><button className="text-button" onClick={() => setCalendarStart(toDateString(addDays(parsePlainDate(calendarStart), 42)))}>Next</button></div></div>
      <div className="calendar-grid">{calendarDates.map((date) => {
        const blocks = planBlocks.filter((block) => block.startsOn === date);
        return <article key={date} className={blocks.length ? "calendar-day has-blocks" : "calendar-day"}><time>{formatShortDate(date)}</time>{blocks.length ? blocks.map((block) => {
          const topic = topicById.get(block.topicId);
          return <div key={block.id} className={`plan-block ${block.status}`}><button onClick={() => topic && onOpenTopic(topic)}><strong>{block.title}</strong><small>{minutesLabel(block.durationMinutes)} · {examById.get(block.examId)?.title ?? "Exam"}</small></button><div><button onClick={() => updateBlockStatus(block, block.status === "done" ? "planned" : "done")} disabled={busy === "block"}>{block.status === "done" ? "Undo" : "Done"}</button><button onClick={() => updateBlockStatus(block, block.status === "skipped" ? "planned" : "skipped")} disabled={busy === "block"}>{block.status === "skipped" ? "Plan" : "Skip"}</button></div></div>;
        }) : <span className="calendar-empty">No study planned</span>}</article>;
      })}</div>
    </section>

    <style jsx>{`.planner-page { max-width: 1220px; margin: 0 auto; padding: 55px 58px 100px; }.planner-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 32px; }.planner-header h1 { max-width: 650px; margin: 0 0 12px; color: #202b2e; font: 47px Georgia, serif; font-weight: 500; letter-spacing: -1.7px; }.planner-header p:not(.eyebrow):not(.planner-feedback) { max-width: 680px; margin: 0; color: #66746f; font-size: 14px; line-height: 1.6; }.planner-feedback { margin: 0; padding: 10px 12px; border-radius: 8px; color: #2e6b58; background: #e7f2e9; font-size: 12px; }.planner-overview { display: grid; grid-template-columns: 1.3fr .85fr .85fr; gap: 12px; margin-bottom: 18px; }.planner-overview article { padding: 18px; border: 1px solid #dbe5dc; border-radius: 10px; background: #fffefa; }.planner-overview h2 { margin: 0 0 7px; font: 25px Georgia, serif; font-weight: 500; }.planner-overview p:not(.eyebrow) { margin: 0; color: #6b7974; font-size: 12px; }.planner-alert, .capacity-warning { margin: -4px 0 18px; padding: 12px 14px; border: 1px solid #ead9b9; border-radius: 9px; color: #765a2f; background: #fff5df; font-size: 12px; line-height: 1.5; }.planner-alert { display: grid; gap: 3px; }.capacity-warning { margin: 14px 0 0; }.planner-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr); gap: 16px; }.planner-panel, .calendar-panel { border: 1px solid #e1e6e1; border-radius: 12px; background: #fffefa; box-shadow: 0 8px 24px rgba(32, 52, 42, .032); }.planner-panel { padding: 22px; }.exam-panel { grid-row: span 2; }.panel-heading, .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }.panel-heading h2, .section-heading h2 { margin: 0; font: 22px Georgia, serif; font-weight: 500; }.calendar-controls { display: flex; gap: 12px; }.planner-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.planner-form label, .availability-list label { display: grid; gap: 7px; color: #3f504d; font-size: 12px; font-weight: 700; }.planner-form input, .planner-form select, .planner-form textarea, .availability-list input { width: 100%; min-height: 42px; border: 1px solid #d5ddd6; border-radius: 7px; padding: 0 11px; color: #20343a; background: #fffefa; outline-color: #497970; }.planner-form textarea { min-height: 88px; padding: 11px; resize: vertical; }.planner-form .wide { grid-column: 1 / -1; }.topic-picker { display: flex; flex-wrap: wrap; gap: 7px; margin: 18px 0; }.topic-picker .eyebrow { flex: 0 0 100%; }.topic-chip { border: 1px solid #d8e0d8; border-radius: 99px; padding: 7px 10px; color: #60706a; background: #fbfcf9; font-size: 11px; }.topic-chip.active { color: #31715e; background: #e6f1e8; border-color: #cfe0d3; font-weight: 700; }.availability-list { display: grid; gap: 9px; }.availability-list label { grid-template-columns: 42px 1fr 28px; align-items: center; }.availability-list input { min-height: 35px; }.availability-list span { color: #7b8881; font-size: 10px; font-weight: 700; }.exam-list { display: grid; gap: 7px; margin-bottom: 16px; }.exam-row { display: grid; gap: 3px; width: 100%; padding: 12px; border: 1px solid #e1e7e1; border-radius: 8px; color: #2f3d3b; background: #fffefa; text-align: left; }.exam-row.active { border-color: #c8dbc9; background: #eef6f0; }.exam-row span, .exam-row small { color: #6c7b75; font-size: 10px; }.exam-row strong { font-size: 12px; }.planner-soft-empty { margin-bottom: 16px; padding: 16px; border: 1px dashed #c1cdc4; border-radius: 8px; color: #718078; font-size: 12px; }.calendar-panel { margin-top: 18px; padding: 22px; }.section-heading span { color: #6d7b75; font-size: 12px; }.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }.calendar-day { min-height: 145px; padding: 10px; border: 1px solid #e4e8e4; border-radius: 9px; background: #fbfcf9; }.calendar-day.has-blocks { background: #fffefa; }.calendar-day time { display: block; margin-bottom: 9px; color: #61736b; font-size: 10px; font-weight: 700; }.calendar-empty { color: #a0aaa4; font-size: 10px; }.plan-block { display: grid; gap: 7px; padding: 8px; border-radius: 8px; background: #e7f1e8; }.plan-block + .plan-block { margin-top: 7px; }.plan-block.done { background: #dcecdf; }.plan-block.skipped { background: #f3e7e2; }.plan-block > button { display: grid; gap: 3px; border: 0; padding: 0; color: #2f5047; background: transparent; text-align: left; }.plan-block strong { font-size: 11px; line-height: 1.25; }.plan-block small { color: #64766e; font-size: 10px; }.plan-block div { display: flex; gap: 6px; }.plan-block div button { border: 0; padding: 0; color: #3d796d; background: transparent; font-size: 10px; font-weight: 700; } @media (max-width: 1050px) { .planner-page { padding: 40px 34px 90px; }.planner-overview, .planner-grid { grid-template-columns: 1fr; }.exam-panel { grid-row: auto; }.calendar-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } } @media (max-width: 650px) { .planner-page { padding: 30px 18px 80px; }.planner-header, .section-heading { display: grid; }.planner-header h1 { font-size: 38px; }.planner-form { grid-template-columns: 1fr; }.calendar-grid { grid-template-columns: 1fr; } }`}</style>
  </div>;
}

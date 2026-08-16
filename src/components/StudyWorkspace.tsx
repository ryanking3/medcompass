"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { AccountSettings } from "@/components/AccountSettings";
import { DocumentLibrary } from "@/components/DocumentLibrary";
import { DocumentReader } from "@/components/DocumentReader";
import { TopicModal, UploadModal } from "@/components/modals";
import { TopicCards } from "@/components/TopicCards";
import { TopicDashboard } from "@/components/TopicDashboard";
import { TopicNotes } from "@/components/TopicNotes";
import { StudyPlanner } from "@/components/StudyPlanner";
import { FloatingStudyTimer, StudyTimer, type ActiveStudyTimer } from "@/components/StudyTimer";
import { StudyAtlas } from "@/components/StudyAtlas";
import { WorkspaceHome } from "@/components/WorkspaceHome";
import type { AppView, CreatedTopic, StudyAvailabilityRule, StudyCourse, StudyDocument, StudyExam, StudyFlashcard, StudyNote, StudyPlanBlock, StudyTopic } from "@/components/types";
import { createClient } from "@/lib/supabase/client";

type StudyWorkspaceProps = {
  userId: string;
  email: string;
  fullName: string | null;
  initialDocuments: StudyDocument[];
  initialCourses: StudyCourse[];
  initialNotes: StudyNote[];
  initialFlashcards: StudyFlashcard[];
  initialExams: StudyExam[];
  initialAvailability: StudyAvailabilityRule[];
  initialPlanBlocks: StudyPlanBlock[];
};

export function StudyWorkspace({ userId, email, fullName, initialDocuments, initialCourses, initialNotes, initialFlashcards, initialExams, initialAvailability, initialPlanBlocks }: StudyWorkspaceProps) {
  const [view, setView] = useState<AppView>("home");
  const [toast, setToast] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountEmail, setAccountEmail] = useState(email);
  const [accountFullName, setAccountFullName] = useState(fullName);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<StudyDocument | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [flashcards, setFlashcards] = useState(initialFlashcards);
  const [exams, setExams] = useState(initialExams);
  const [availability, setAvailability] = useState(initialAvailability);
  const [planBlocks, setPlanBlocks] = useState(initialPlanBlocks);
  const [courses, setCourses] = useState(initialCourses);
  const [activeTimer, setActiveTimer] = useState<ActiveStudyTimer | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(initialCourses[0]?.id ?? null);
  const [selectedTopic, setSelectedTopic] = useState<StudyTopic | null>(initialCourses[0]?.modules.flatMap((module) => module.topics)[0] ?? null);

  useEffect(() => {
    if (!activeTimer?.running) return;
    const interval = window.setInterval(() => {
      setActiveTimer((currentTimer) => {
        if (!currentTimer?.running) return currentTimer;
        if (currentTimer.remainingSeconds <= 1) {
          return { ...currentTimer, remainingSeconds: 0, running: false };
        }
        return { ...currentTimer, remainingSeconds: currentTimer.remainingSeconds - 1 };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeTimer?.running]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const signOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      notify("We couldn't sign you out. Please try again.");
      return;
    }

    window.location.assign("/");
  };

  const handleDocumentUploaded = (document: StudyDocument) => {
    setDocuments((currentDocuments) => [document, ...currentDocuments]);
    setView("library");
  };

  const openDocument = (document: StudyDocument) => {
    setSelectedDocument(document);
    setView("reader");
  };

  const handleDocumentUpdated = (updatedDocument: StudyDocument) => {
    setDocuments((currentDocuments) => currentDocuments.map((document) => document.id === updatedDocument.id ? { ...updatedDocument, linkedTopics: document.linkedTopics } : document));
    setSelectedDocument((document) => document?.id === updatedDocument.id ? { ...updatedDocument, linkedTopics: document.linkedTopics } : document);
  };

  const handleNoteCreated = (note: StudyNote) => setNotes((currentNotes) => [note, ...currentNotes]);
  const handleNoteUpdated = (updatedNote: StudyNote) => setNotes((currentNotes) => currentNotes.map((note) => note.id === updatedNote.id ? updatedNote : note));
  const handleCardCreated = (card: StudyFlashcard) => setFlashcards((currentCards) => [card, ...currentCards]);
  const handleCardUpdated = (updatedCard: StudyFlashcard) => setFlashcards((currentCards) => currentCards.map((card) => card.id === updatedCard.id ? updatedCard : card));
  const handleCardDeleted = (cardId: string) => setFlashcards((currentCards) => currentCards.filter((card) => card.id !== cardId));

  const startTimer = (title: string, minutes: number) => {
    const totalSeconds = Math.max(1, minutes) * 60;
    setActiveTimer({ title, totalSeconds, remainingSeconds: totalSeconds, running: true });
    notify("Timer started. It will stay visible across MedCompass.");
  };

  const pauseResumeTimer = () => {
    setActiveTimer((currentTimer) => currentTimer ? { ...currentTimer, running: currentTimer.remainingSeconds > 0 ? !currentTimer.running : false } : currentTimer);
  };

  const selectCourse = (courseId: string) => {
    const course = courses.find((entry) => entry.id === courseId);
    setSelectedCourseId(courseId);
    setSelectedTopic(course?.modules.flatMap((module) => module.topics)[0] ?? null);
  };

  const selectTopic = (topic: StudyTopic) => {
    setSelectedTopic(topic);
    setView("dashboard");
  };

  const openNotesForTopic = (topicId: string) => {
    const course = courses.find((entry) => entry.modules.some((module) => module.topics.some((topic) => topic.id === topicId)));
    const topic = course?.modules.flatMap((module) => module.topics).find((entry) => entry.id === topicId) ?? null;
    if (!topic) return;
    setSelectedCourseId(course?.id ?? null);
    setSelectedTopic(topic);
    setView("notes");
  };

  const openCardsForTopic = (topicId: string) => {
    const course = courses.find((entry) => entry.modules.some((module) => module.topics.some((topic) => topic.id === topicId)));
    const topic = course?.modules.flatMap((module) => module.topics).find((entry) => entry.id === topicId) ?? null;
    if (!topic) return;
    setSelectedCourseId(course?.id ?? null);
    setSelectedTopic(topic);
    setView("cards");
  };

  const handleTopicCreated = (createdTopic: CreatedTopic) => {
    setCourses((currentCourses) => {
      const existingCourse = currentCourses.find((course) => course.id === createdTopic.course.id);
      if (!existingCourse) {
        return [...currentCourses, { ...createdTopic.course, modules: [{ ...createdTopic.module, topics: [createdTopic.topic] }] }];
      }

      return currentCourses.map((course) => {
        if (course.id !== createdTopic.course.id) return course;
        const existingModule = course.modules.find((module) => module.id === createdTopic.module.id);
        if (!existingModule) {
          return { ...course, modules: [...course.modules, { ...createdTopic.module, topics: [createdTopic.topic] }] };
        }
        return {
          ...course,
          modules: course.modules.map((module) => module.id === createdTopic.module.id ? { ...module, topics: [...module.topics, createdTopic.topic] } : module),
        };
      });
    });
    setSelectedCourseId(createdTopic.course.id);
    setSelectedTopic(createdTopic.topic);
    setTopicOpen(false);
    setView("dashboard");
    notify(`${createdTopic.topic.name} is ready for study.`);
  };

  return (
    <main className={sidebarCollapsed ? "app-shell app-shell-sidebar-collapsed" : "app-shell"}>
      <AppSidebar view={view} onNavigate={setView} onCreateTopic={() => setTopicOpen(true)} email={accountEmail} fullName={accountFullName} onSignOut={signOut} onOpenSettings={() => setView("settings")} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((current) => !current)} courses={courses} selectedCourseId={selectedCourseId} selectedTopicId={selectedTopic?.id ?? null} onSelectCourse={selectCourse} onSelectTopic={selectTopic} />
      <section className="content-area">
        {view === "home" && <WorkspaceHome courses={courses} documents={documents} notes={notes} flashcards={flashcards} planBlocks={planBlocks} exams={exams} onCreateTopic={() => setTopicOpen(true)} onOpenTopic={selectTopic} onOpenLibrary={() => setView("library")} onOpenAtlas={() => setView("atlas")} onOpenPlanner={() => setView("planner")} />}
        {view === "library" && <DocumentLibrary documents={documents} onOpenDocument={openDocument} onOpenUpload={() => setUploadOpen(true)} />}
        {view === "atlas" && <StudyAtlas courses={courses} documents={documents} notes={notes} flashcards={flashcards} exams={exams} planBlocks={planBlocks} onCreateTopic={() => setTopicOpen(true)} onOpenTopic={selectTopic} onOpenDocument={openDocument} onOpenNotesForTopic={openNotesForTopic} onOpenCardsForTopic={openCardsForTopic} onOpenPlanner={() => setView("planner")} />}
        {view === "planner" && <StudyPlanner courses={courses} exams={exams} availability={availability} planBlocks={planBlocks} onExamsChange={setExams} onAvailabilityChange={setAvailability} onPlanBlocksChange={setPlanBlocks} onCreateTopic={() => setTopicOpen(true)} onOpenTopic={selectTopic} />}
        {view === "timer" && <StudyTimer timer={activeTimer} onStart={startTimer} onPauseResume={pauseResumeTimer} onClear={() => setActiveTimer(null)} />}
        {view === "dashboard" && (selectedTopic ? <TopicDashboard topic={selectedTopic} course={courses.find((course) => course.id === selectedCourseId) ?? null} documents={documents} notes={notes} flashcards={flashcards} exams={exams} planBlocks={planBlocks} onOpenDocument={openDocument} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} onOpenUpload={() => setUploadOpen(true)} onOpenPlanner={() => setView("planner")} /> : <WorkspaceHome courses={courses} documents={documents} notes={notes} flashcards={flashcards} planBlocks={planBlocks} exams={exams} onCreateTopic={() => setTopicOpen(true)} onOpenTopic={selectTopic} onOpenLibrary={() => setView("library")} onOpenAtlas={() => setView("atlas")} onOpenPlanner={() => setView("planner")} />)}
        {view === "reader" && (selectedDocument ? <DocumentReader key={selectedDocument.id} document={selectedDocument} onBack={() => setView("library")} onDocumentUpdated={handleDocumentUpdated} onNoteCreated={handleNoteCreated} onOpenNotesForTopic={openNotesForTopic} /> : <DocumentLibrary documents={documents} onOpenDocument={openDocument} onOpenUpload={() => setUploadOpen(true)} />)}
        {view === "notes" && <TopicNotes topic={selectedTopic} notes={notes} documents={documents} onBack={() => setView("dashboard")} onNoteCreated={handleNoteCreated} onNoteUpdated={handleNoteUpdated} />}
        {view === "cards" && <TopicCards topic={selectedTopic} cards={flashcards} documents={documents} onBack={() => setView("dashboard")} onCardCreated={handleCardCreated} onCardUpdated={handleCardUpdated} onCardDeleted={handleCardDeleted} />}
        {view === "settings" && <AccountSettings userId={userId} email={accountEmail} fullName={accountFullName} onSignOut={signOut} onProfileUpdated={(nextProfile) => {
          if (typeof nextProfile.email === "string") setAccountEmail(nextProfile.email);
          if ("fullName" in nextProfile) setAccountFullName(nextProfile.fullName ?? null);
        }} />}
      </section>
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} notify={notify} onUploadComplete={handleDocumentUploaded} topics={courses.flatMap((course) => course.modules.flatMap((module) => module.topics))} selectedTopicId={selectedTopic?.id ?? null} />}
      {topicOpen && <TopicModal onClose={() => setTopicOpen(false)} courses={courses} selectedCourseId={selectedCourseId} onTopicCreated={handleTopicCreated} />}
      {activeTimer && view !== "timer" && <FloatingStudyTimer timer={activeTimer} onOpenTimer={() => setView("timer")} onPauseResume={pauseResumeTimer} onClear={() => setActiveTimer(null)} />}
      {toast && <div className={activeTimer && view !== "timer" ? "toast toast-with-timer" : "toast"} role="status">{toast}</div>}
    </main>
  );
}

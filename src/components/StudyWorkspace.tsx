"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { DocumentLibrary } from "@/components/DocumentLibrary";
import { DocumentReader } from "@/components/DocumentReader";
import { TopicModal, UploadModal } from "@/components/modals";
import { Cards, Dashboard, Notes, Reader, StudentHome } from "@/components/screens";
import type { AppView, CreatedTopic, StudyCourse, StudyDocument, StudyTopic } from "@/components/types";
import { createClient } from "@/lib/supabase/client";

type StudyWorkspaceProps = {
  email: string;
  initialDocuments: StudyDocument[];
  initialCourses: StudyCourse[];
};

export function StudyWorkspace({ email, initialDocuments, initialCourses }: StudyWorkspaceProps) {
  const [view, setView] = useState<AppView>("home");
  const [toast, setToast] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<StudyDocument | null>(null);
  const [courses, setCourses] = useState(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(initialCourses[0]?.id ?? null);
  const [selectedTopic, setSelectedTopic] = useState<StudyTopic | null>(initialCourses[0]?.modules.flatMap((module) => module.topics)[0] ?? null);

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
    setDocuments((currentDocuments) => currentDocuments.map((document) => document.id === updatedDocument.id ? updatedDocument : document));
    setSelectedDocument(updatedDocument);
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
    <main className="app-shell">
      <AppSidebar view={view} onNavigate={setView} onCreateTopic={() => setTopicOpen(true)} email={email} onSignOut={signOut} courses={courses} selectedCourseId={selectedCourseId} selectedTopicId={selectedTopic?.id ?? null} onSelectCourse={selectCourse} onSelectTopic={selectTopic} />
      <section className="content-area">
        {view === "home" && <StudentHome onOpenTopic={() => setView("dashboard")} onOpenReader={() => setView("reader")} onOpenLibrary={() => setView("library")} onOpenTopicModal={() => setTopicOpen(true)} />}
        {view === "library" && <DocumentLibrary documents={documents} onOpenDocument={openDocument} onOpenUpload={() => setUploadOpen(true)} />}
        {view === "dashboard" && <Dashboard topic={selectedTopic} course={courses.find((course) => course.id === selectedCourseId) ?? null} onOpenReader={() => setView("reader")} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} onOpenUpload={() => setUploadOpen(true)} notify={notify} />}
        {view === "reader" && (selectedDocument ? <DocumentReader document={selectedDocument} onBack={() => setView("library")} onDocumentUpdated={handleDocumentUpdated} /> : <Reader onBack={() => setView("dashboard")} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} notify={notify} />)}
        {view === "notes" && <Notes onBack={() => setView("dashboard")} notify={notify} />}
        {view === "cards" && <Cards onBack={() => setView("dashboard")} notify={notify} />}
      </section>
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} notify={notify} onUploadComplete={handleDocumentUploaded} />}
      {topicOpen && <TopicModal onClose={() => setTopicOpen(false)} courses={courses} selectedCourseId={selectedCourseId} onTopicCreated={handleTopicCreated} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { DocumentLibrary } from "@/components/DocumentLibrary";
import { DocumentReader } from "@/components/DocumentReader";
import { TopicModal, UploadModal } from "@/components/modals";
import { Cards, Dashboard, Notes, Reader, StudentHome } from "@/components/screens";
import type { AppView, StudyDocument } from "@/components/types";
import { createClient } from "@/lib/supabase/client";

type StudyWorkspaceProps = {
  email: string;
  initialDocuments: StudyDocument[];
};

export function StudyWorkspace({ email, initialDocuments }: StudyWorkspaceProps) {
  const [view, setView] = useState<AppView>("home");
  const [toast, setToast] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<StudyDocument | null>(null);

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

  return (
    <main className="app-shell">
      <AppSidebar view={view} onNavigate={setView} onCreateTopic={() => setTopicOpen(true)} notify={notify} email={email} onSignOut={signOut} />
      <section className="content-area">
        {view === "home" && <StudentHome onOpenTopic={() => setView("dashboard")} onOpenReader={() => setView("reader")} onOpenLibrary={() => setView("library")} onOpenTopicModal={() => setTopicOpen(true)} />}
        {view === "library" && <DocumentLibrary documents={documents} onOpenDocument={openDocument} onOpenUpload={() => setUploadOpen(true)} />}
        {view === "dashboard" && <Dashboard onOpenReader={() => setView("reader")} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} onOpenUpload={() => setUploadOpen(true)} notify={notify} />}
        {view === "reader" && (selectedDocument ? <DocumentReader document={selectedDocument} onBack={() => setView("library")} /> : <Reader onBack={() => setView("dashboard")} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} notify={notify} />)}
        {view === "notes" && <Notes onBack={() => setView("dashboard")} notify={notify} />}
        {view === "cards" && <Cards onBack={() => setView("dashboard")} notify={notify} />}
      </section>
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} notify={notify} onUploadComplete={handleDocumentUploaded} />}
      {topicOpen && <TopicModal onClose={() => setTopicOpen(false)} notify={notify} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { TopicModal, UploadModal } from "@/components/modals";
import { Cards, Dashboard, Library, Notes, Reader, StudentHome } from "@/components/screens";
import type { AppView } from "@/components/types";

export default function Home() {
  const [view, setView] = useState<AppView>("home");
  const [toast, setToast] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  return (
    <main className="app-shell">
      <AppSidebar view={view} onNavigate={setView} onCreateTopic={() => setTopicOpen(true)} notify={notify} />
      <section className="content-area">
        {view === "home" && <StudentHome onOpenTopic={() => setView("dashboard")} onOpenReader={() => setView("reader")} onOpenLibrary={() => setView("library")} onOpenTopicModal={() => setTopicOpen(true)} />}
        {view === "library" && <Library onOpenReader={() => setView("reader")} onOpenUpload={() => setUploadOpen(true)} />}
        {view === "dashboard" && <Dashboard onOpenReader={() => setView("reader")} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} onOpenUpload={() => setUploadOpen(true)} notify={notify} />}
        {view === "reader" && <Reader onBack={() => setView("dashboard")} onOpenCards={() => setView("cards")} onOpenNotes={() => setView("notes")} notify={notify} />}
        {view === "notes" && <Notes onBack={() => setView("dashboard")} notify={notify} />}
        {view === "cards" && <Cards onBack={() => setView("dashboard")} notify={notify} />}
      </section>
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} notify={notify} />}
      {topicOpen && <TopicModal onClose={() => setTopicOpen(false)} notify={notify} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

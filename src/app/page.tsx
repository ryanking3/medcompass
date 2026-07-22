import { SignInForm } from "@/components/SignInForm";
import { StudyWorkspace } from "@/components/StudyWorkspace";
import type { StudyDocument } from "@/components/types";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <SignInForm />;
  }

  const { data: documentRows } = await supabase
    .from("documents")
    .select("id, title, original_filename, kind, status, page_count, created_at")
    .order("created_at", { ascending: false });

  const documents: StudyDocument[] = (documentRows ?? []).map((document) => ({
    id: document.id,
    title: document.title,
    originalFilename: document.original_filename,
    kind: document.kind,
    status: document.status,
    pageCount: document.page_count,
    createdAt: document.created_at,
  }));

  return <StudyWorkspace email={user.email ?? "Signed-in student"} initialDocuments={documents} />;
}

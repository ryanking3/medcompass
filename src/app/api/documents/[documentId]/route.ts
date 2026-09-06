import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before deleting a source." }, { status: 401 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, storage_path, title")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError || !document) {
    return NextResponse.json({ error: "We couldn't find that source in your workspace." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id);

  if (deleteError) {
    return NextResponse.json({ error: "We couldn't delete that source. Please try again." }, { status: 500 });
  }

  const { error: storageError } = await supabase.storage
    .from("study-sources")
    .remove([document.storage_path]);

  return NextResponse.json({
    deletedDocumentId: document.id,
    title: document.title,
    storageCleanup: storageError ? "failed" : "complete",
    warning: storageError ? "The source record was deleted, but the private file may need manual storage cleanup." : null,
  });
}

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function serializeDocument(document: {
  id: string;
  title: string;
  original_filename: string;
  storage_path: string;
  kind: "textbook" | "lecture" | "other";
  status: "pending" | "processing" | "ready" | "failed";
  page_count: number | null;
  created_at: string;
}) {
  return {
    id: document.id,
    title: document.title,
    originalFilename: document.original_filename,
    storagePath: document.storage_path,
    kind: document.kind,
    status: document.status,
    pageCount: document.page_count,
    createdAt: document.created_at,
  };
}

export async function POST(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before preparing a source." }, { status: 401 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, workspace_id, title, original_filename, storage_path, kind, status, page_count, created_at")
    .eq("id", documentId)
    .single();

  if (documentError || !document) {
    return NextResponse.json({ error: "We couldn’t find this source in your workspace." }, { status: 404 });
  }

  if (document.status === "processing") {
    return NextResponse.json({ error: "This source is already being prepared." }, { status: 409 });
  }

  const { error: statusError } = await supabase
    .from("documents")
    .update({ status: "processing", failure_reason: null })
    .eq("id", document.id);

  if (statusError) {
    return NextResponse.json({ error: "We couldn’t start preparing this source." }, { status: 500 });
  }

  try {
    const { data: sourceFile, error: downloadError } = await supabase.storage
      .from("study-sources")
      .download(document.storage_path);

    if (downloadError || !sourceFile) {
      throw new Error("The original PDF could not be downloaded.");
    }

    const pdf = await getDocument({
      data: new Uint8Array(await sourceFile.arrayBuffer()),
      useWorkerFetch: false,
      useSystemFonts: true,
    }).promise;
    const pages = [] as Array<{ workspace_id: string; document_id: string; page_number: number; extracted_text: string }>;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const extractedText = textContent.items
        .map((item) => "str" in item ? item.str : "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({
        workspace_id: document.workspace_id,
        document_id: document.id,
        page_number: pageNumber,
        extracted_text: extractedText,
      });
    }

    const { error: deletePagesError } = await supabase
      .from("document_pages")
      .delete()
      .eq("document_id", document.id);

    if (deletePagesError) {
      throw new Error("Existing page data could not be replaced.");
    }

    for (let index = 0; index < pages.length; index += 25) {
      const { error: insertPagesError } = await supabase
        .from("document_pages")
        .insert(pages.slice(index, index + 25));

      if (insertPagesError) {
        throw new Error("The extracted page text could not be saved.");
      }
    }

    const { data: preparedDocument, error: updateError } = await supabase
      .from("documents")
      .update({ status: "ready", page_count: pdf.numPages, failure_reason: null })
      .eq("id", document.id)
      .select("id, title, original_filename, storage_path, kind, status, page_count, created_at")
      .single();

    if (updateError || !preparedDocument) {
      throw new Error("The source was prepared, but its status could not be updated.");
    }

    return NextResponse.json({ document: serializeDocument(preparedDocument) });
  } catch {
    await supabase
      .from("documents")
      .update({
        status: "failed",
        failure_reason: "Text extraction could not be completed. Try a different PDF or retry this source.",
      })
      .eq("id", document.id);

    return NextResponse.json({ error: "We couldn’t extract text from this PDF. Try again or use a text-based PDF." }, { status: 422 });
  }
}

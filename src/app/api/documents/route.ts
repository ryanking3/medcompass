import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const documentKinds = ["textbook", "lecture", "other"] as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before uploading a source." }, { status: 401 });
  }

  const body = await request.json();
  const originalFilename = typeof body.originalFilename === "string" ? body.originalFilename.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const storagePath = typeof body.storagePath === "string" ? body.storagePath : "";
  const topicId = typeof body.topicId === "string" && body.topicId ? body.topicId : null;
  const kind = documentKinds.includes(body.kind) ? body.kind : "other";

  if (!originalFilename || !title || !storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "The upload details were incomplete. Please try again." }, { status: 400 });
  }

  const { data: currentWorkspace, error: workspaceLookupError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (workspaceLookupError) {
    return NextResponse.json({ error: "We couldn't prepare your study workspace." }, { status: 500 });
  }

  let workspaceId = currentWorkspace?.id;

  if (!workspaceId) {
    const { data: workspace, error: workspaceCreateError } = await supabase
      .from("workspaces")
      .insert({ owner_id: user.id })
      .select("id")
      .single();

    if (workspaceCreateError || !workspace) {
      return NextResponse.json({ error: "We couldn't create your study workspace." }, { status: 500 });
    }

    workspaceId = workspace.id;
  }

  let linkedTopic: { id: string; name: string } | null = null;
  if (topicId) {
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("id, name")
      .eq("id", topicId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (topicError || !topic) {
      return NextResponse.json({ error: "Choose a topic in your study workspace before uploading." }, { status: 400 });
    }
    linkedTopic = topic;
  }

  const fileSize = typeof body.fileSize === "number" && Number.isFinite(body.fileSize) ? body.fileSize : null;
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      workspace_id: workspaceId,
      uploaded_by: user.id,
      kind,
      status: "pending",
      title,
      original_filename: originalFilename,
      storage_path: storagePath,
      metadata: fileSize ? { file_size_bytes: fileSize } : {},
    })
    .select("id, title, original_filename, storage_path, kind, status, page_count, created_at")
    .single();

  if (documentError || !document) {
    return NextResponse.json({ error: "Your PDF uploaded, but we couldn't add it to the library. Please try again." }, { status: 500 });
  }

  if (linkedTopic) {
    const { error: documentTopicError } = await supabase
      .from("document_topics")
      .insert({ workspace_id: workspaceId, document_id: document.id, topic_id: linkedTopic.id });

    if (documentTopicError) {
      await supabase.from("documents").delete().eq("id", document.id);
      return NextResponse.json({ error: "Your PDF uploaded, but we couldn't connect it to that topic. Please try again." }, { status: 500 });
    }
  }

  return NextResponse.json({
    document: {
      id: document.id,
      title: document.title,
      originalFilename: document.original_filename,
      storagePath: document.storage_path,
      kind: document.kind,
      status: document.status,
      pageCount: document.page_count,
      createdAt: document.created_at,
      linkedTopics: linkedTopic ? [linkedTopic] : [],
    },
  }, { status: 201 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const maxImageBytes = 10 * 1024 * 1024;

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "note-image";
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "png";
}

export async function POST(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before adding an image." }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image before uploading." }, { status: 400 });
  if (!allowedImageTypes.has(file.type)) return NextResponse.json({ error: "Use a PNG, JPG, WEBP, or GIF image." }, { status: 400 });
  if (file.size > maxImageBytes) return NextResponse.json({ error: "Images must be 10MB or smaller." }, { status: 400 });

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id, workspace_id")
    .eq("id", noteId)
    .maybeSingle();
  if (noteError || !note) return NextResponse.json({ error: "We couldn't find that note in your workspace." }, { status: 404 });

  const storagePath = `${user.id}/${note.id}/${crypto.randomUUID()}-${safeFilename(file.name || `image.${extensionForMimeType(file.type)}`)}`;
  const { error: uploadError } = await supabase.storage
    .from("study-note-images")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message || "We couldn't upload that image." }, { status: 500 });

  const { data: image, error: imageError } = await supabase
    .from("note_images")
    .insert({ workspace_id: note.workspace_id, note_id: note.id, storage_path: storagePath, original_filename: file.name || null, mime_type: file.type, file_size: file.size })
    .select("id, storage_path, original_filename, mime_type, file_size, created_at")
    .single();

  if (imageError || !image) {
    await supabase.storage.from("study-note-images").remove([storagePath]);
    return NextResponse.json({ error: "We couldn't attach that image to the note." }, { status: 500 });
  }

  const { data: signedUrl } = await supabase.storage.from("study-note-images").createSignedUrl(image.storage_path, 60 * 60);

  return NextResponse.json({
    image: {
      id: image.id,
      storagePath: image.storage_path,
      originalFilename: image.original_filename,
      mimeType: image.mime_type,
      fileSize: image.file_size,
      signedUrl: signedUrl?.signedUrl ?? "",
      createdAt: image.created_at,
    },
  }, { status: 201 });
}

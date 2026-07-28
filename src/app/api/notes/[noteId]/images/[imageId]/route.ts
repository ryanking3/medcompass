import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ noteId: string; imageId: string }> }) {
  const { noteId, imageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in before removing an image." }, { status: 401 });

  const { data: image, error: imageError } = await supabase
    .from("note_images")
    .select("id, storage_path")
    .eq("id", imageId)
    .eq("note_id", noteId)
    .maybeSingle();
  if (imageError || !image) return NextResponse.json({ error: "We couldn't find that image in your workspace." }, { status: 404 });

  const { error: deleteImageError } = await supabase.from("note_images").delete().eq("id", image.id);
  if (deleteImageError) return NextResponse.json({ error: "We couldn't remove that image from the note." }, { status: 500 });

  await supabase.storage.from("study-note-images").remove([image.storage_path]);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in before exporting your workspace." }, { status: 401 });
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (workspaceError) {
    return NextResponse.json({ error: "We couldn't find your workspace for export." }, { status: 500 });
  }

  if (!workspace) {
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      exportVersion: 1,
      workspace: null,
      data: {
        courses: [],
        documents: [],
        notes: [],
        flashcardDecks: [],
        exams: [],
        availability: [],
        planBlocks: [],
        practiceExams: [],
      },
      notes: ["No workspace exists yet for this account."],
    });
  }

  const [
    courses,
    documents,
    notes,
    flashcardDecks,
    exams,
    availability,
    planBlocks,
    practiceExams,
  ] = await Promise.all([
    supabase.from("courses").select("id, name, institution, programme, academic_year, created_at, updated_at, modules(id, name, sort_order, topics(id, name, description, sort_order, last_studied_at, learning_objectives(id, body, sort_order)))").eq("workspace_id", workspace.id).order("created_at", { ascending: true }),
    supabase.from("documents").select("id, kind, status, title, original_filename, page_count, metadata, failure_reason, created_at, updated_at, document_topics(topic_id, topics(id, name))").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
    supabase.from("notes").select("id, topic_id, title, body, created_at, updated_at, note_citations(id, document_id, page_start, page_end, excerpt), note_images(id, original_filename, mime_type, file_size, created_at)").eq("workspace_id", workspace.id).order("updated_at", { ascending: false }),
    supabase.from("flashcard_decks").select("id, topic_id, name, created_at, updated_at, flashcards(id, kind, front, back, is_kept, source_document_id, source_page_start, source_page_end, created_at, updated_at)").eq("workspace_id", workspace.id).order("created_at", { ascending: true }),
    supabase.from("study_exams").select("id, course_id, title, exam_date, target_minutes, notes, created_at, updated_at, study_exam_topics(topic_id, weight, confidence, topics(id, name))").eq("workspace_id", workspace.id).order("exam_date", { ascending: true }),
    supabase.from("study_availability_rules").select("id, day_of_week, minutes_available, created_at, updated_at").eq("workspace_id", workspace.id).order("day_of_week", { ascending: true }),
    supabase.from("study_plan_blocks").select("id, exam_id, topic_id, starts_on, duration_minutes, title, status, created_at, updated_at").eq("workspace_id", workspace.id).order("starts_on", { ascending: true }),
    supabase.from("practice_exams").select("id, source_exam_id, title, format, mode, question_count, questions, standards, created_at, updated_at, practice_exam_attempts(id, answered_count, question_count, duration_seconds, answers, started_at, completed_at, created_at)").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
  ]);

  const failedExport = [courses, documents, notes, flashcardDecks, exams, availability, planBlocks, practiceExams].find((result) => result.error);
  if (failedExport?.error) {
    return NextResponse.json({ error: "We couldn't export every workspace table. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    exportVersion: 1,
    workspace,
    data: {
      courses: courses.data ?? [],
      documents: documents.data ?? [],
      notes: notes.data ?? [],
      flashcardDecks: flashcardDecks.data ?? [],
      exams: exams.data ?? [],
      availability: availability.data ?? [],
      planBlocks: planBlocks.data ?? [],
      practiceExams: practiceExams.data ?? [],
    },
    notes: [
      "PDF files, signed URLs, and extracted page text are not included in this lightweight JSON export.",
      "Private source files remain in Supabase Storage until deleted from the workspace.",
    ],
  }, {
    headers: {
      "Content-Disposition": `attachment; filename="medcompass-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

import { SignInForm } from "@/components/SignInForm";
import { StudyWorkspace } from "@/components/StudyWorkspace";
import type { StudyAvailabilityRule, StudyCourse, StudyDocument, StudyExam, StudyFlashcard, StudyNote, StudyPlanBlock } from "@/components/types";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <SignInForm />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const metadataName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  const { data: documentRows } = await supabase
    .from("documents")
    .select("id, title, original_filename, storage_path, kind, status, page_count, created_at, document_topics(topic_id, topics(id, name))")
    .order("created_at", { ascending: false });

  const { data: courseRows } = await supabase
    .from("courses")
    .select("id, name, institution, programme, academic_year, modules(id, course_id, name, sort_order, topics(id, module_id, name, description, last_studied_at, sort_order, learning_objectives(id, body, sort_order)))")
    .order("created_at", { ascending: true });

  const { data: noteRows } = await supabase
    .from("notes")
    .select("id, topic_id, title, body, updated_at, note_citations(id, document_id, page_start, page_end, excerpt, documents(id, title))")
    .order("updated_at", { ascending: false });

  const { data: deckRows } = await supabase
    .from("flashcard_decks")
    .select("id, topic_id, flashcards(id, deck_id, kind, front, back, is_kept, source_document_id, source_page_start, source_page_end, updated_at, documents(id, title))");

  const { data: examRows } = await supabase
    .from("study_exams")
    .select("id, course_id, title, exam_date, target_minutes, notes, study_exam_topics(topic_id, weight, confidence, topics(id, name))")
    .order("exam_date", { ascending: true });

  const { data: availabilityRows } = await supabase
    .from("study_availability_rules")
    .select("id, day_of_week, minutes_available")
    .order("day_of_week", { ascending: true });

  const { data: planBlockRows } = await supabase
    .from("study_plan_blocks")
    .select("id, exam_id, topic_id, starts_on, duration_minutes, title, status, topics(id, name)")
    .order("starts_on", { ascending: true });

  const documents: StudyDocument[] = (documentRows ?? []).map((document) => ({
    id: document.id,
    title: document.title,
    originalFilename: document.original_filename,
    storagePath: document.storage_path,
    kind: document.kind,
    status: document.status,
    pageCount: document.page_count,
    createdAt: document.created_at,
    linkedTopics: (document.document_topics ?? []).flatMap((link) => (link.topics ?? []).map((topic) => ({ id: topic.id, name: topic.name }))),
  }));

  const courses: StudyCourse[] = (courseRows ?? []).map((course) => ({
    id: course.id,
    name: course.name,
    institution: course.institution,
    programme: course.programme,
    academicYear: course.academic_year,
    modules: (course.modules ?? [])
      .sort((first, second) => first.sort_order - second.sort_order)
      .map((module) => ({
        id: module.id,
        courseId: module.course_id,
        name: module.name,
        topics: (module.topics ?? [])
          .sort((first, second) => first.sort_order - second.sort_order)
          .map((topic) => ({
            id: topic.id,
            moduleId: topic.module_id,
            name: topic.name,
            description: topic.description,
            lastStudiedAt: topic.last_studied_at,
            learningObjectives: (topic.learning_objectives ?? [])
              .sort((first, second) => first.sort_order - second.sort_order)
              .map((objective) => ({ id: objective.id, body: objective.body })),
          })),
      })),
  }));

  const notes: StudyNote[] = (noteRows ?? []).map((note) => ({
    id: note.id,
    topicId: note.topic_id,
    title: note.title,
    body: note.body,
    updatedAt: note.updated_at,
    citations: (note.note_citations ?? []).map((citation) => ({
      id: citation.id,
      documentId: citation.document_id,
      documentTitle: citation.documents[0]?.title ?? "Source",
      pageStart: citation.page_start,
      pageEnd: citation.page_end,
      excerpt: citation.excerpt,
    })),
  }));

  const flashcards: StudyFlashcard[] = (deckRows ?? []).flatMap((deck) => (deck.flashcards ?? []).map((card) => ({
    id: card.id,
    deckId: card.deck_id,
    topicId: deck.topic_id,
    kind: card.kind,
    front: card.front,
    back: card.back,
    isKept: card.is_kept,
    sourceDocumentId: card.source_document_id,
    sourceDocumentTitle: card.documents?.[0]?.title ?? null,
    sourcePageStart: card.source_page_start,
    sourcePageEnd: card.source_page_end,
    updatedAt: card.updated_at,
  })));

  const exams: StudyExam[] = (examRows ?? []).map((exam) => ({
    id: exam.id,
    courseId: exam.course_id,
    title: exam.title,
    examDate: exam.exam_date,
    targetMinutes: exam.target_minutes,
    notes: exam.notes,
    topics: (exam.study_exam_topics ?? []).map((link) => ({
      topicId: link.topic_id,
      topicName: link.topics?.[0]?.name ?? "Study topic",
      weight: link.weight,
      confidence: link.confidence,
    })),
  }));

  const availability: StudyAvailabilityRule[] = (availabilityRows ?? []).map((rule) => ({
    id: rule.id,
    dayOfWeek: rule.day_of_week,
    minutesAvailable: rule.minutes_available,
  }));

  const planBlocks: StudyPlanBlock[] = (planBlockRows ?? []).map((block) => ({
    id: block.id,
    examId: block.exam_id,
    topicId: block.topic_id,
    topicName: block.topics?.[0]?.name ?? "Study topic",
    startsOn: block.starts_on,
    durationMinutes: block.duration_minutes,
    title: block.title,
    status: block.status,
  }));

  return <StudyWorkspace userId={user.id} email={user.email ?? "Signed-in student"} fullName={profile?.full_name ?? metadataName} initialDocuments={documents} initialCourses={courses} initialNotes={notes} initialFlashcards={flashcards} initialExams={exams} initialAvailability={availability} initialPlanBlocks={planBlocks} />;
}

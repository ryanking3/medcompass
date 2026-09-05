import { SignInForm } from "@/components/SignInForm";
import { StudyWorkspace } from "@/components/StudyWorkspace";
import type { PracticeExamQuestion, StudyAvailabilityRule, StudyCourse, StudyDocument, StudyExam, StudyFlashcard, StudyNote, StudyPlanBlock, StudyPracticeExam, StudyPracticeExamAttempt } from "@/components/types";
import { createClient } from "@/lib/supabase/server";

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return asArray(value)[0] ?? null;
}

type NoteImageRow = {
  id: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string;
  file_size: number;
  created_at: string;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function asPracticeQuestions(value: unknown): PracticeExamQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const question = entry as Record<string, unknown>;
    if (typeof question.id !== "string" || typeof question.prompt !== "string" || typeof question.answer !== "string" || typeof question.rationale !== "string") return [];
    const type = question.type === "mcq" ? "mcq" : "written";
    return [{
      id: question.id,
      type,
      topicName: typeof question.topicName === "string" ? question.topicName : "Study topic",
      prompt: question.prompt,
      options: Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === "string") : undefined,
      answer: question.answer,
      rationale: question.rationale,
    }];
  });
}

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

  const { data: noteRowsWithImages, error: noteRowsWithImagesError } = await supabase
    .from("notes")
    .select("id, topic_id, title, body, updated_at, note_citations(id, document_id, page_start, page_end, excerpt, documents(id, title)), note_images(id, storage_path, original_filename, mime_type, file_size, created_at)")
    .order("updated_at", { ascending: false });

  const { data: fallbackNoteRows } = noteRowsWithImagesError ? await supabase
    .from("notes")
    .select("id, topic_id, title, body, updated_at, note_citations(id, document_id, page_start, page_end, excerpt, documents(id, title))")
    .order("updated_at", { ascending: false }) : { data: null };

  const noteRows = noteRowsWithImages ?? fallbackNoteRows ?? [];

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

  const { data: practiceExamRows } = await supabase
    .from("practice_exams")
    .select("id, source_exam_id, title, format, mode, questions, standards, created_at, practice_exam_attempts(id, practice_exam_id, answered_count, question_count, duration_seconds, completed_at)")
    .order("created_at", { ascending: false });

  const documents: StudyDocument[] = (documentRows ?? []).map((document) => ({
    id: document.id,
    title: document.title,
    originalFilename: document.original_filename,
    storagePath: document.storage_path,
    kind: document.kind,
    status: document.status,
    pageCount: document.page_count,
    createdAt: document.created_at,
    linkedTopics: asArray(document.document_topics).flatMap((link) => asArray(link.topics).map((topic) => ({ id: topic.id, name: topic.name }))),
  }));

  const courses: StudyCourse[] = (courseRows ?? []).map((course) => ({
    id: course.id,
    name: course.name,
    institution: course.institution,
    programme: course.programme,
    academicYear: course.academic_year,
    modules: asArray(course.modules)
      .sort((first, second) => first.sort_order - second.sort_order)
      .map((module) => ({
        id: module.id,
        courseId: module.course_id,
        name: module.name,
        topics: asArray(module.topics)
          .sort((first, second) => first.sort_order - second.sort_order)
          .map((topic) => ({
            id: topic.id,
            moduleId: topic.module_id,
            name: topic.name,
            description: topic.description,
            lastStudiedAt: topic.last_studied_at,
            learningObjectives: asArray(topic.learning_objectives)
              .sort((first, second) => first.sort_order - second.sort_order)
              .map((objective) => ({ id: objective.id, body: objective.body })),
          })),
      })),
  }));

  const notes: StudyNote[] = await Promise.all((noteRows ?? []).map(async (note) => ({
    id: note.id,
    topicId: note.topic_id,
    title: note.title,
    body: note.body,
    updatedAt: note.updated_at,
    citations: asArray(note.note_citations).map((citation) => ({
      id: citation.id,
      documentId: citation.document_id,
      documentTitle: firstRelation(citation.documents)?.title ?? "Source",
      pageStart: citation.page_start,
      pageEnd: citation.page_end,
      excerpt: citation.excerpt,
    })),
    images: await Promise.all(asArray<NoteImageRow>((note as typeof note & { note_images?: NoteImageRow[] }).note_images).map(async (image) => {
      const { data } = await supabase.storage.from("study-note-images").createSignedUrl(image.storage_path, 60 * 60);
      return {
        id: image.id,
        storagePath: image.storage_path,
        originalFilename: image.original_filename,
        mimeType: image.mime_type,
        fileSize: image.file_size,
        signedUrl: data?.signedUrl ?? "",
        createdAt: image.created_at,
      };
    })),
  })));

  const flashcards: StudyFlashcard[] = (deckRows ?? []).flatMap((deck) => asArray(deck.flashcards).map((card) => ({
    id: card.id,
    deckId: card.deck_id,
    topicId: deck.topic_id,
    kind: card.kind,
    front: card.front,
    back: card.back,
    isKept: card.is_kept,
    sourceDocumentId: card.source_document_id,
    sourceDocumentTitle: firstRelation(card.documents)?.title ?? null,
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
    topics: asArray(exam.study_exam_topics).map((link) => ({
      topicId: link.topic_id,
      topicName: firstRelation(link.topics)?.name ?? "Study topic",
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
    topicName: firstRelation(block.topics)?.name ?? "Study topic",
    startsOn: block.starts_on,
    durationMinutes: block.duration_minutes,
    title: block.title,
    status: block.status,
  }));

  const practiceExams: StudyPracticeExam[] = (practiceExamRows ?? []).map((exam) => ({
    id: exam.id,
    examId: exam.source_exam_id,
    title: exam.title,
    format: exam.format === "mcq" || exam.format === "written" || exam.format === "mixed" ? exam.format : "mixed",
    mode: exam.mode === "openai" ? "openai" : "fake",
    questions: asPracticeQuestions(exam.questions),
    standards: asStringArray(exam.standards),
    createdAt: exam.created_at,
    attempts: asArray(exam.practice_exam_attempts)
      .sort((first, second) => new Date(second.completed_at).getTime() - new Date(first.completed_at).getTime())
      .map((attempt): StudyPracticeExamAttempt => ({
        id: attempt.id,
        practiceExamId: attempt.practice_exam_id,
        answeredCount: attempt.answered_count,
        questionCount: attempt.question_count,
        durationSeconds: attempt.duration_seconds,
        completedAt: attempt.completed_at,
      })),
  }));

  return <StudyWorkspace userId={user.id} email={user.email ?? "Signed-in student"} fullName={profile?.full_name ?? metadataName} initialDocuments={documents} initialCourses={courses} initialNotes={notes} initialFlashcards={flashcards} initialExams={exams} initialAvailability={availability} initialPlanBlocks={planBlocks} initialPracticeExams={practiceExams} />;
}

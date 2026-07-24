import { SignInForm } from "@/components/SignInForm";
import { StudyWorkspace } from "@/components/StudyWorkspace";
import type { StudyCourse, StudyDocument } from "@/components/types";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <SignInForm />;
  }

  const { data: documentRows } = await supabase
    .from("documents")
    .select("id, title, original_filename, storage_path, kind, status, page_count, created_at, document_topics(topic_id, topics(id, name))")
    .order("created_at", { ascending: false });

  const { data: courseRows } = await supabase
    .from("courses")
    .select("id, name, institution, programme, academic_year, modules(id, course_id, name, sort_order, topics(id, module_id, name, description, last_studied_at, sort_order, learning_objectives(id, body, sort_order)))")
    .order("created_at", { ascending: true });

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

  return <StudyWorkspace email={user.email ?? "Signed-in student"} initialDocuments={documents} initialCourses={courses} />;
}

export type AppView = "home" | "library" | "dashboard" | "reader" | "notes" | "cards";

export type Notify = (message: string) => void;

export type DocumentKind = "textbook" | "lecture" | "other";
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export type StudyDocument = {
  id: string;
  title: string;
  originalFilename: string;
  storagePath: string;
  kind: DocumentKind;
  status: DocumentStatus;
  pageCount: number | null;
  createdAt: string;
  linkedTopics: Array<{ id: string; name: string }>;
};

export type LearningObjective = {
  id: string;
  body: string;
};

export type StudyTopic = {
  id: string;
  moduleId: string;
  name: string;
  description: string | null;
  lastStudiedAt: string | null;
  learningObjectives: LearningObjective[];
};

export type StudyModule = {
  id: string;
  courseId: string;
  name: string;
  topics: StudyTopic[];
};

export type StudyCourse = {
  id: string;
  name: string;
  institution: string | null;
  programme: string | null;
  academicYear: string | null;
  modules: StudyModule[];
};

export type CreatedTopic = {
  course: Omit<StudyCourse, "modules">;
  module: Omit<StudyModule, "topics">;
  topic: StudyTopic;
};

export type StudyNoteCitation = {
  id: string;
  documentId: string;
  documentTitle: string;
  pageStart: number | null;
  pageEnd: number | null;
  excerpt: string | null;
};

export type StudyNote = {
  id: string;
  topicId: string;
  title: string;
  body: string;
  updatedAt: string;
  citations: StudyNoteCitation[];
};

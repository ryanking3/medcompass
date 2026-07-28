export type AppView = "home" | "library" | "planner" | "dashboard" | "reader" | "notes" | "cards" | "settings";

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

export type StudyNoteImage = {
  id: string;
  storagePath: string;
  originalFilename: string | null;
  mimeType: string;
  fileSize: number;
  signedUrl: string;
  createdAt: string;
};

export type StudyNote = {
  id: string;
  topicId: string;
  title: string;
  body: string;
  updatedAt: string;
  citations: StudyNoteCitation[];
  images: StudyNoteImage[];
};

export type FlashcardKind = "basic" | "cloze";

export type StudyFlashcard = {
  id: string;
  deckId: string;
  topicId: string;
  kind: FlashcardKind;
  front: string;
  back: string;
  isKept: boolean;
  sourceDocumentId: string | null;
  sourceDocumentTitle: string | null;
  sourcePageStart: number | null;
  sourcePageEnd: number | null;
  updatedAt: string;
};

export type StudyExamTopic = {
  topicId: string;
  topicName: string;
  weight: number;
  confidence: number;
};

export type StudyExam = {
  id: string;
  courseId: string | null;
  title: string;
  examDate: string;
  targetMinutes: number;
  notes: string | null;
  topics: StudyExamTopic[];
};

export type StudyAvailabilityRule = {
  id?: string;
  dayOfWeek: number;
  minutesAvailable: number;
};

export type StudyPlanBlockStatus = "planned" | "done" | "skipped";

export type StudyPlanBlock = {
  id: string;
  examId: string;
  topicId: string;
  topicName: string;
  startsOn: string;
  durationMinutes: number;
  title: string;
  status: StudyPlanBlockStatus;
};

export type AiSourceAction = "ask" | "note" | "flashcard";
export type MockExamFormat = "mcq" | "written" | "mixed";

export type AiCitation = {
  documentId?: string;
  documentTitle?: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  excerpt?: string | null;
};

export type AiGeneratedNoteDraft = {
  title: string;
  body: string;
  citation: AiCitation;
};

export type AiGeneratedFlashcardDraft = {
  kind: "basic" | "cloze";
  front: string;
  back: string;
  source: AiCitation;
  qualityChecklist: string[];
};

export type AiSourceStudyRequest = {
  action: AiSourceAction;
  question?: string;
  selectedText?: string;
  documentId: string;
  documentTitle: string;
  topicId?: string;
  topicName?: string;
  page: number;
};

export type AiSourceStudyResponse = {
  mode: "fake";
  action: AiSourceAction;
  answer?: string;
  noteDraft?: AiGeneratedNoteDraft;
  flashcardDraft?: AiGeneratedFlashcardDraft;
  standards: string[];
  citations: AiCitation[];
};

export type AiMockExamQuestion = {
  id: string;
  type: "mcq" | "written";
  topicName: string;
  prompt: string;
  options?: string[];
  answer: string;
  rationale: string;
};

export type AiMockExamRequest = {
  examId: string;
  format: MockExamFormat;
  questionCount: number;
};

export type AiMockExamResponse = {
  mode: "fake";
  title: string;
  format: MockExamFormat;
  questions: AiMockExamQuestion[];
  standards: string[];
};

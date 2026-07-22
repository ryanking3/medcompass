export type AppView = "home" | "library" | "dashboard" | "reader" | "notes" | "cards";

export type Notify = (message: string) => void;

export type DocumentKind = "textbook" | "lecture" | "other";
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export type StudyDocument = {
  id: string;
  title: string;
  originalFilename: string;
  kind: DocumentKind;
  status: DocumentStatus;
  pageCount: number | null;
  createdAt: string;
};

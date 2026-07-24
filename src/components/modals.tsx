import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CreatedTopic, DocumentKind, Notify, StudyCourse, StudyDocument } from "./types";

export function UploadModal({ onClose, notify, onUploadComplete }: { onClose: () => void; notify: Notify; onUploadComplete: (document: StudyDocument) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<DocumentKind>("textbook");
  const [acknowledged, setAcknowledged] = useState(true);
  const [stage, setStage] = useState<"choose" | "uploading" | "ready" | "error">("choose");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedDocument, setUploadedDocument] = useState<StudyDocument | null>(null);

  const startUpload = async () => {
    if (!file || !acknowledged) return;
    if (file.size > 100 * 1024 * 1024) {
      setStage("error");
      setErrorMessage("Please choose a PDF smaller than 100 MB.");
      return;
    }

    setStage("uploading");
    setErrorMessage("");
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setStage("error");
      setErrorMessage("Your session has expired. Please sign in again and retry.");
      return;
    }

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeFilename}`;
    const { error: storageError } = await supabase.storage.from("study-sources").upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (storageError) {
      setStage("error");
      setErrorMessage(storageError.message);
      return;
    }

    const title = file.name.replace(/\.pdf$/i, "") || file.name;
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalFilename: file.name, title, kind, storagePath, fileSize: file.size }),
    });
    const result = await response.json();

    if (!response.ok) {
      await supabase.storage.from("study-sources").remove([storagePath]);
      setStage("error");
      setErrorMessage(result.error ?? "We couldn't add this PDF to your library. Please try again.");
      return;
    }

    setUploadedDocument(result.document as StudyDocument);
    setStage("ready");
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close upload dialog">×</button>
        <p className="eyebrow">Add a private source</p><h2 id="upload-title">Bring a textbook or lecture into this topic</h2>
        <p className="modal-intro">Your source will be available only in this study workspace. Upload only material you are permitted to use, and never upload patient-identifiable information.</p>
        {stage === "choose" && <><label className={file ? "file-drop selected" : "file-drop"}><input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><span className="file-icon">↑</span><strong>{file?.name || "Choose a PDF"}</strong><small>{file ? `${Math.max(1, Math.round(file.size / 1024 / 1024))} MB · ready to upload privately` : "Textbook chapter, lecture, or other permitted study PDF"}</small></label><label className="source-kind"><span>Source type</span><select value={kind} onChange={(event) => setKind(event.target.value as DocumentKind)}><option value="textbook">Textbook or chapter</option><option value="lecture">Lecture or slides</option><option value="other">Other PDF</option></select></label><label className="acknowledgement"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> <span>I have the right to upload this material and understand it is for my own study use.</span></label><div className="modal-actions"><button className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" disabled={!file || !acknowledged} onClick={startUpload}>Upload source →</button></div><p className="prototype-note">Your PDF is stored privately now. Reading and source indexing come next.</p></>}
        {stage === "uploading" && <div className="processing-state"><div className="processing-orb"><span /></div><h3>Uploading your source</h3><p>Your PDF is being stored privately in your study workspace.</p><div className="progress-track"><span /></div><small>{file?.name}</small></div>}
        {stage === "ready" && <div className="ready-state"><div className="ready-check">✓</div><h3>Source added to your library</h3><p><strong>{uploadedDocument?.title}</strong> is stored privately and ready for the reader and page-indexing work next.</p><button className="button primary" onClick={() => { if (uploadedDocument) onUploadComplete(uploadedDocument); onClose(); notify("Source added to your private library."); }}>View library</button></div>}
        {stage === "error" && <div className="ready-state"><div className="error-mark">!</div><h3>We couldn’t upload that PDF</h3><p>{errorMessage}</p><button className="button primary" onClick={() => setStage("choose")}>Try again</button></div>}
        <style jsx>{`
          .modal-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(23, 36, 35, .35); backdrop-filter: blur(4px); }.upload-modal { width: min(510px, 100%); position: relative; background: #fffefa; border-radius: 14px; padding: 34px; box-shadow: 0 24px 80px rgba(22, 40, 38, .28); }.modal-close { position: absolute; top: 17px; right: 17px; width: 31px; height: 31px; border-radius: 50%; border: 0; background: #eef1ed; color: #5a6866; font-size: 21px; line-height: 1; }.upload-modal h2 { max-width: 400px; margin: 0 0 12px; font: 27px/1.16 Georgia, serif; font-weight: 500; letter-spacing: -.5px; }.modal-intro { margin: 0 0 23px; color: #5e6d69; font-size: 13px; line-height: 1.55; }.file-drop { min-height: 146px; display: grid; place-items: center; align-content: center; gap: 5px; padding: 18px; border: 1px dashed #aabbb1; border-radius: 9px; background: #f8fbf7; color: #426d60; text-align: center; cursor: pointer; }.file-drop:hover, .file-drop.selected { background: #eff7f0; border-color: #5e957c; }.file-drop input { position: absolute; width: 1px; height: 1px; opacity: 0; }.file-icon { display: grid; place-items: center; width: 34px; height: 34px; margin-bottom: 3px; border-radius: 50%; background: #d9ebe0; color: #39765e; font-weight: 700; font-size: 20px; }.file-drop strong { max-width: 340px; overflow: hidden; text-overflow: ellipsis; font-size: 13px; white-space: nowrap; }.file-drop small { color: #73827b; font-size: 11px; }.source-kind { display: grid; gap: 6px; margin-top: 15px; color: #53645f; font-size: 11px; font-weight: 700; }.source-kind select { border: 1px solid #d6dfd8; border-radius: 7px; padding: 9px; background: #fffefa; color: #465853; font-size: 12px; }.acknowledgement { display: flex; gap: 9px; align-items: flex-start; margin: 16px 0; color: #63716d; font-size: 11px; line-height: 1.45; }.acknowledgement input { margin: 2px 0 0; accent-color: #497970; }.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }.prototype-note { margin: 15px 0 0; color: #929b95; text-align: center; font-size: 10px; }.processing-state, .ready-state { min-height: 255px; display: grid; place-items: center; align-content: center; text-align: center; }.processing-state h3, .ready-state h3 { margin: 14px 0 7px; font: 22px Georgia, serif; font-weight: 500; }.processing-state p, .ready-state p { max-width: 340px; margin: 0; color: #60716c; font-size: 13px; line-height: 1.55; }.processing-orb, .ready-check, .error-mark { display: grid; place-items: center; width: 62px; height: 62px; border-radius: 50%; background: #e5f1e8; color: #39765e; }.error-mark { color: #a14f4f; background: #fae8e7; font: 28px Georgia, serif; }.processing-orb span { width: 25px; height: 25px; border: 3px solid #9fc4ab; border-top-color: #36735b; border-radius: 50%; animation: spin 900ms linear infinite; }.progress-track { width: 230px; height: 6px; margin: 20px 0 9px; border-radius: 99px; overflow: hidden; background: #e7ece7; }.progress-track span { display: block; width: 72%; height: 100%; border-radius: inherit; background: #679a7a; animation: progress 1.2s ease-in-out infinite alternate; }.processing-state small { color: #87918c; font-size: 10px; }.ready-check { font-size: 28px; }.ready-state .button { margin-top: 21px; } @keyframes spin { to { transform: rotate(360deg); } } @keyframes progress { from { transform: translateX(-18%); } to { transform: translateX(38%); } }
        `}</style>
      </section>
    </div>
  );
}

export function LegacyTopicModal({ onClose, notify }: { onClose: () => void; notify: Notify }) {
  const [topic, setTopic] = useState("");
  const createTopic = (event: FormEvent) => { event.preventDefault(); if (!topic.trim()) return; onClose(); notify(`${topic.trim()} was created in Graduate Entry Medicine.`); };
  return <div className="topic-backdrop" role="presentation" onMouseDown={onClose}><form className="topic-modal" role="dialog" aria-modal="true" aria-labelledby="topic-title" onSubmit={createTopic} onMouseDown={(event) => event.stopPropagation()}><button className="topic-close" type="button" onClick={onClose} aria-label="Close topic dialog">×</button><p className="eyebrow">New study topic</p><h2 id="topic-title">Create a focused place to study</h2><p>Topics keep sources, notes, tutor conversations, and cards together around one area of learning.</p><label>Course<select defaultValue="Graduate Entry Medicine"><option>Graduate Entry Medicine</option></select></label><label>Module <input defaultValue="Cardiovascular system" /></label><label>Topic <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Cardiac output" autoFocus /></label><label>Learning objective <textarea placeholder="e.g. Explain the factors that determine cardiac output" /></label><div className="topic-actions"><button className="button ghost" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={!topic.trim()} type="submit">Create topic →</button></div><small>Prototype state only — topics are not persisted until the workspace backend is connected.</small><style jsx>{`.topic-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(23, 36, 35, .35); backdrop-filter: blur(4px); }.topic-modal { width: min(500px, 100%); position: relative; display: grid; gap: 13px; background: #fffefa; border-radius: 14px; padding: 34px; box-shadow: 0 24px 80px rgba(22, 40, 38, .28); }.topic-close { position: absolute; top: 17px; right: 17px; width: 31px; height: 31px; border-radius: 50%; border: 0; background: #eef1ed; color: #5a6866; font-size: 21px; line-height: 1; } h2 { max-width: 380px; margin: -2px 0 0; font: 27px/1.16 Georgia, serif; font-weight: 500; letter-spacing: -.5px; } p { margin: 0 0 5px; color: #5e6d69; font-size: 13px; line-height: 1.55; } label { display: grid; gap: 6px; color: #5e6d69; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; } input, textarea, select { width: 100%; border: 1px solid #d8ded9; border-radius: 7px; padding: 10px; color: #2b3838; background: white; font-size: 13px; font-weight: 400; letter-spacing: normal; text-transform: none; outline-color: #497970; } textarea { min-height: 75px; resize: vertical; }.topic-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }.topic-modal small { color: #929b95; text-align: center; font-size: 10px; }`}</style></form></div>;
}

type TopicModalProps = {
  onClose: () => void;
  courses: StudyCourse[];
  selectedCourseId: string | null;
  onTopicCreated: (createdTopic: CreatedTopic) => void;
};

export function TopicModal({ onClose, courses, selectedCourseId, onTopicCreated }: TopicModalProps) {
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const [courseName, setCourseName] = useState(selectedCourse?.name ?? "");
  const [moduleName, setModuleName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [learningObjective, setLearningObjective] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const createTopic = async (event: FormEvent) => {
    event.preventDefault();
    if (!courseName.trim() || !moduleName.trim() || !topicName.trim() || isSaving) return;

    setIsSaving(true);
    setErrorMessage("");
    const response = await fetch("/api/study-structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseName, moduleName, topicName, learningObjective }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);

    if (!response.ok) {
      setErrorMessage(result.error ?? "We couldn't create that topic. Please try again.");
      return;
    }

    onTopicCreated(result.createdTopic as CreatedTopic);
  };

  return <div className="topic-backdrop" role="presentation" onMouseDown={onClose}>
    <form className="topic-modal" role="dialog" aria-modal="true" aria-labelledby="topic-title" onSubmit={createTopic} onMouseDown={(event) => event.stopPropagation()}>
      <button className="topic-close" type="button" onClick={onClose} aria-label="Close topic dialog">×</button>
      <p className="eyebrow">New study topic</p>
      <h2 id="topic-title">Create a focused place to study</h2>
      <p>Topics keep sources, notes, tutor conversations, and cards together around one area of learning.</p>
      <label>Course<input list="course-options" value={courseName} onChange={(event) => setCourseName(event.target.value)} placeholder="e.g. Graduate Entry Medicine" autoFocus required /></label>
      <datalist id="course-options">{courses.map((course) => <option key={course.id} value={course.name} />)}</datalist>
      <label>Module <input value={moduleName} onChange={(event) => setModuleName(event.target.value)} placeholder="e.g. Cardiovascular system" required /></label>
      <label>Topic <input value={topicName} onChange={(event) => setTopicName(event.target.value)} placeholder="e.g. Cardiac output" required /></label>
      <label>Learning objective <textarea value={learningObjective} onChange={(event) => setLearningObjective(event.target.value)} placeholder="e.g. Explain the factors that determine cardiac output" /></label>
      {errorMessage && <p className="topic-error" role="alert">{errorMessage}</p>}
      <div className="topic-actions"><button className="button ghost" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={!courseName.trim() || !moduleName.trim() || !topicName.trim() || isSaving} type="submit">{isSaving ? "Creating…" : "Create topic →"}</button></div>
      <small>Everything is private to your study workspace.</small>
      <style jsx>{`.topic-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 20px; background: rgba(23, 36, 35, .35); backdrop-filter: blur(4px); }.topic-modal { width: min(500px, 100%); position: relative; display: grid; gap: 13px; background: #fffefa; border-radius: 14px; padding: 34px; box-shadow: 0 24px 80px rgba(22, 40, 38, .28); }.topic-close { position: absolute; top: 17px; right: 17px; width: 31px; height: 31px; border-radius: 50%; border: 0; background: #eef1ed; color: #5a6866; font-size: 21px; line-height: 1; } h2 { max-width: 380px; margin: -2px 0 0; font: 27px/1.16 Georgia, serif; font-weight: 500; letter-spacing: -.5px; } p { margin: 0 0 5px; color: #5e6d69; font-size: 13px; line-height: 1.55; } label { display: grid; gap: 6px; color: #5e6d69; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; } input, textarea { width: 100%; border: 1px solid #d8ded9; border-radius: 7px; padding: 10px; color: #2b3838; background: white; font-size: 13px; font-weight: 400; letter-spacing: normal; text-transform: none; outline-color: #497970; } textarea { min-height: 75px; resize: vertical; }.topic-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }.topic-modal small { color: #929b95; text-align: center; font-size: 10px; }.topic-error { margin: -3px 0 0; color: #9a4a4a; font-size: 11px; }`}</style>
    </form>
  </div>;
}

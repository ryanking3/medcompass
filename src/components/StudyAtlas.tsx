"use client";

import { useMemo, useState, type WheelEvent } from "react";
import type { StudyCourse, StudyDocument, StudyExam, StudyFlashcard, StudyNote, StudyPlanBlock, StudyTopic } from "./types";

type AtlasKind = "course" | "module" | "topic" | "source" | "note" | "cards" | "exam" | "block";

type AtlasNode = {
  id: string;
  kind: AtlasKind;
  label: string;
  subtitle: string;
  x: number;
  y: number;
  radius: number;
  weight: number;
  topicId?: string;
  moduleId?: string;
  courseId?: string;
  documentId?: string;
  noteId?: string;
  examId?: string;
  meta: string[];
};

type AtlasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: "structure" | "source" | "citation" | "artifact" | "exam" | "plan";
};

type StudyAtlasProps = {
  courses: StudyCourse[];
  documents: StudyDocument[];
  notes: StudyNote[];
  flashcards: StudyFlashcard[];
  exams: StudyExam[];
  planBlocks: StudyPlanBlock[];
  onCreateTopic: () => void;
  onOpenTopic: (topic: StudyTopic) => void;
  onOpenDocument: (document: StudyDocument) => void;
  onOpenNotesForTopic: (topicId: string) => void;
  onOpenCardsForTopic: (topicId: string) => void;
  onOpenPlanner: () => void;
};

const atlasKinds: Array<{ kind: "all" | AtlasKind; label: string }> = [
  { kind: "all", label: "All" },
  { kind: "topic", label: "Topics" },
  { kind: "source", label: "Sources" },
  { kind: "note", label: "Notes" },
  { kind: "cards", label: "Cards" },
  { kind: "exam", label: "Exams" },
  { kind: "block", label: "Planner" },
];

const nodeGlyphs: Record<AtlasKind, string> = {
  course: "C",
  module: "M",
  topic: "T",
  source: "PDF",
  note: "N",
  cards: "Q",
  exam: "E",
  block: "◷",
};

const kindLabels: Record<AtlasKind, string> = {
  course: "Course",
  module: "Module",
  topic: "Topic",
  source: "Source",
  note: "Note",
  cards: "Flashcards",
  exam: "Exam",
  block: "Study block",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function textSnippet(value: string, maxLength = 88) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
}

function nodeMatches(node: AtlasNode, query: string) {
  const search = query.toLowerCase();
  return !search || [node.label, node.subtitle, ...node.meta].some((value) => value.toLowerCase().includes(search));
}

function todayString() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function collectNeighborhoodIds(startId: string | null, edges: AtlasEdge[], depth: number) {
  if (!startId) return new Set<string>();
  const ids = new Set<string>([startId]);
  let frontier = new Set<string>([startId]);

  for (let level = 0; level < depth; level += 1) {
    const nextFrontier = new Set<string>();
    edges.forEach((edge) => {
      if (frontier.has(edge.source) && !ids.has(edge.target)) {
        ids.add(edge.target);
        nextFrontier.add(edge.target);
      }
      if (frontier.has(edge.target) && !ids.has(edge.source)) {
        ids.add(edge.source);
        nextFrontier.add(edge.source);
      }
    });
    frontier = nextFrontier;
  }

  return ids;
}

export function StudyAtlas({ courses, documents, notes, flashcards, exams, planBlocks, onCreateTopic, onOpenTopic, onOpenDocument, onOpenNotesForTopic, onOpenCardsForTopic, onOpenPlanner }: StudyAtlasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AtlasKind>("all");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [graphMode, setGraphMode] = useState<"global" | "local">("global");
  const [localDepth, setLocalDepth] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [nodeScale, setNodeScale] = useState(1);

  const topics = useMemo(() => courses.flatMap((course) => course.modules.flatMap((module) => module.topics.map((topic) => ({ ...topic, courseId: course.id, courseName: course.name, moduleId: module.id, moduleName: module.name })))), [courses]);

  const { nodes, edges, insights } = useMemo(() => {
    const nextNodes: AtlasNode[] = [];
    const nextEdges: AtlasEdge[] = [];
    const topicPositions = new Map<string, { x: number; y: number; angle: number }>();
    const center = { x: 600, y: 420 };

    const topicCount = topics.length;
    topics.forEach((topic, index) => {
      const angle = topicCount <= 1 ? -Math.PI / 2 : -Math.PI / 2 + (index / topicCount) * Math.PI * 2;
      const x = topicCount <= 1 ? center.x : center.x + Math.cos(angle) * 385;
      const y = topicCount <= 1 ? center.y : center.y + Math.sin(angle) * 275;
      topicPositions.set(topic.id, { x, y, angle });
    });

    nextNodes.push({
      id: "workspace",
      kind: "course",
      label: "Study Atlas",
      subtitle: "Your connected knowledge map",
      x: center.x,
      y: center.y,
      radius: 34,
      weight: 10,
      meta: [plural(courses.length, "course"), plural(topics.length, "topic"), plural(documents.length, "source")],
    });

    courses.forEach((course, courseIndex) => {
      const courseAngle = courses.length <= 1 ? Math.PI : -Math.PI / 2 + (courseIndex / courses.length) * Math.PI * 2;
      const courseNodeId = `course:${course.id}`;
      const courseTopics = course.modules.flatMap((module) => module.topics);
      nextNodes.push({
        id: courseNodeId,
        kind: "course",
        label: course.name,
        subtitle: [course.programme, course.academicYear].filter(Boolean).join(" · ") || "Course",
        x: center.x + Math.cos(courseAngle) * 130,
        y: center.y + Math.sin(courseAngle) * 95,
        radius: 24,
        weight: 7,
        courseId: course.id,
        meta: [plural(course.modules.length, "module"), plural(courseTopics.length, "topic")],
      });
      nextEdges.push({ id: `workspace:${course.id}`, source: "workspace", target: courseNodeId, label: "contains", kind: "structure" });

      course.modules.forEach((module) => {
        const moduleTopics = module.topics.map((topic) => topicPositions.get(topic.id)).filter(Boolean) as Array<{ x: number; y: number; angle: number }>;
        const averageX = moduleTopics.length ? moduleTopics.reduce((sum, topic) => sum + topic.x, 0) / moduleTopics.length : center.x + Math.cos(courseAngle) * 210;
        const averageY = moduleTopics.length ? moduleTopics.reduce((sum, topic) => sum + topic.y, 0) / moduleTopics.length : center.y + Math.sin(courseAngle) * 160;
        const moduleNodeId = `module:${module.id}`;
        nextNodes.push({
          id: moduleNodeId,
          kind: "module",
          label: module.name,
          subtitle: course.name,
          x: center.x + (averageX - center.x) * 0.55,
          y: center.y + (averageY - center.y) * 0.55,
          radius: 19,
          weight: 5,
          courseId: course.id,
          moduleId: module.id,
          meta: [plural(module.topics.length, "topic")],
        });
        nextEdges.push({ id: `course:${course.id}:module:${module.id}`, source: courseNodeId, target: moduleNodeId, label: "module", kind: "structure" });
      });
    });

    topics.forEach((topic) => {
      const position = topicPositions.get(topic.id) ?? { ...center, angle: -Math.PI / 2 };
      const topicNotes = notes.filter((note) => note.topicId === topic.id);
      const topicCards = flashcards.filter((card) => card.topicId === topic.id);
      const topicDocuments = documents.filter((document) => document.linkedTopics.some((linkedTopic) => linkedTopic.id === topic.id));
      const topicExams = exams.filter((exam) => exam.topics.some((examTopic) => examTopic.topicId === topic.id));
      const topicBlocks = planBlocks.filter((block) => block.topicId === topic.id && block.status !== "skipped");
      const topicNodeId = `topic:${topic.id}`;
      nextNodes.push({
        id: topicNodeId,
        kind: "topic",
        label: topic.name,
        subtitle: `${topic.moduleName} · ${topic.courseName}`,
        x: position.x,
        y: position.y,
        radius: 27 + Math.min(7, topicNotes.length + topicDocuments.length),
        weight: 9,
        topicId: topic.id,
        moduleId: topic.moduleId,
        courseId: topic.courseId,
        meta: [
          topic.learningObjectives[0]?.body ?? "No objective yet",
          plural(topicDocuments.length, "source"),
          plural(topicNotes.length, "note"),
          plural(topicCards.length, "card"),
          topicExams.length ? `${topicExams.length} exam link${topicExams.length === 1 ? "" : "s"}` : "No exam link yet",
        ],
      });
      nextEdges.push({ id: `module:${topic.moduleId}:topic:${topic.id}`, source: `module:${topic.moduleId}`, target: topicNodeId, label: "topic", kind: "structure" });

      if (topicCards.length) {
        const cardNodeId = `cards:${topic.id}`;
        nextNodes.push({
          id: cardNodeId,
          kind: "cards",
          label: `${topicCards.filter((card) => card.isKept).length}/${topicCards.length} kept`,
          subtitle: `${topic.name} card queue`,
          x: clamp(position.x + Math.cos(position.angle + 0.65) * 126, 70, 1130),
          y: clamp(position.y + Math.sin(position.angle + 0.65) * 126, 72, 788),
          radius: 18,
          weight: 4,
          topicId: topic.id,
          meta: [plural(topicCards.length, "card"), plural(topicCards.filter((card) => card.isKept).length, "kept card")],
        });
        nextEdges.push({ id: `topic:${topic.id}:cards`, source: topicNodeId, target: cardNodeId, label: "recall", kind: "artifact" });
      }

      const upcomingBlocks = topicBlocks.filter((block) => block.startsOn >= todayString()).sort((first, second) => first.startsOn.localeCompare(second.startsOn));
      if (upcomingBlocks.length) {
        const blockNodeId = `blocks:${topic.id}`;
        const minutes = upcomingBlocks.reduce((sum, block) => sum + block.durationMinutes, 0);
        nextNodes.push({
          id: blockNodeId,
          kind: "block",
          label: `${Math.round(minutes / 60)}h planned`,
          subtitle: `${upcomingBlocks.length} upcoming ${upcomingBlocks.length === 1 ? "block" : "blocks"}`,
          x: clamp(position.x + Math.cos(position.angle - 0.75) * 126, 70, 1130),
          y: clamp(position.y + Math.sin(position.angle - 0.75) * 126, 72, 788),
          radius: 17,
          weight: 3,
          topicId: topic.id,
          meta: [`Next: ${formatDate(upcomingBlocks[0].startsOn)}`, upcomingBlocks[0].title],
        });
        nextEdges.push({ id: `topic:${topic.id}:blocks`, source: topicNodeId, target: blockNodeId, label: "scheduled", kind: "plan" });
      }
    });

    documents.forEach((document, index) => {
      const linkedPositions = document.linkedTopics.map((topic) => topicPositions.get(topic.id)).filter(Boolean) as Array<{ x: number; y: number; angle: number }>;
      const averageX = linkedPositions.length ? linkedPositions.reduce((sum, position) => sum + position.x, 0) / linkedPositions.length : 170;
      const averageY = linkedPositions.length ? linkedPositions.reduce((sum, position) => sum + position.y, 0) / linkedPositions.length : 560 + index * 15;
      const awayAngle = Math.atan2(averageY - center.y, averageX - center.x) || -Math.PI / 2;
      const documentNodeId = `source:${document.id}`;
      nextNodes.push({
        id: documentNodeId,
        kind: "source",
        label: document.title,
        subtitle: `${document.kind === "textbook" ? "Textbook" : document.kind === "lecture" ? "Lecture" : "PDF"} · ${document.status === "ready" ? `${document.pageCount ?? "?"} pages ready` : document.status}`,
        x: clamp(averageX + Math.cos(awayAngle) * 142, 70, 1130),
        y: clamp(averageY + Math.sin(awayAngle) * 142, 72, 788),
        radius: 20,
        weight: 4,
        documentId: document.id,
        meta: document.linkedTopics.length ? document.linkedTopics.map((topic) => `Linked to ${topic.name}`) : ["Unlinked source"],
      });
      document.linkedTopics.forEach((topic) => nextEdges.push({ id: `source:${document.id}:topic:${topic.id}`, source: `topic:${topic.id}`, target: documentNodeId, label: "source", kind: "source" }));
    });

    notes.forEach((note, index) => {
      const position = topicPositions.get(note.topicId);
      if (!position) return;
      const spread = (index % 5 - 2) * 0.2;
      const noteNodeId = `note:${note.id}`;
      nextNodes.push({
        id: noteNodeId,
        kind: "note",
        label: note.title,
        subtitle: note.citations.length ? `${plural(note.citations.length, "citation")} · ${note.images.length ? plural(note.images.length, "image") : "text note"}` : note.images.length ? plural(note.images.length, "image") : "Manual note",
        x: clamp(position.x + Math.cos(position.angle + Math.PI + spread) * 118, 70, 1130),
        y: clamp(position.y + Math.sin(position.angle + Math.PI + spread) * 118, 72, 788),
        radius: 16,
        weight: 3,
        topicId: note.topicId,
        noteId: note.id,
        meta: [textSnippet(note.body || "Empty note"), ...note.citations.slice(0, 2).map((citation) => `Cites ${citation.documentTitle}${citation.pageStart ? ` p.${citation.pageStart}` : ""}`)],
      });
      nextEdges.push({ id: `topic:${note.topicId}:note:${note.id}`, source: `topic:${note.topicId}`, target: noteNodeId, label: "note", kind: "artifact" });
      note.citations.forEach((citation) => {
        if (documents.some((document) => document.id === citation.documentId)) {
          nextEdges.push({ id: `note:${note.id}:source:${citation.documentId}:${citation.id}`, source: noteNodeId, target: `source:${citation.documentId}`, label: citation.pageStart ? `p.${citation.pageStart}` : "cites", kind: "citation" });
        }
      });
    });

    exams.forEach((exam, index) => {
      const examPositions = exam.topics.map((topic) => topicPositions.get(topic.topicId)).filter(Boolean) as Array<{ x: number; y: number; angle: number }>;
      const averageX = examPositions.length ? examPositions.reduce((sum, position) => sum + position.x, 0) / examPositions.length : 790;
      const averageY = examPositions.length ? examPositions.reduce((sum, position) => sum + position.y, 0) / examPositions.length : 120 + index * 85;
      const examNodeId = `exam:${exam.id}`;
      nextNodes.push({
        id: examNodeId,
        kind: "exam",
        label: exam.title,
        subtitle: `${formatDate(exam.examDate)} · ${Math.round(exam.targetMinutes / 60)}h target`,
        x: clamp(averageX + 150, 80, 1120),
        y: clamp(averageY - 88, 72, 788),
        radius: 20,
        weight: 5,
        examId: exam.id,
        meta: exam.topics.map((topic) => `${topic.topicName}: weight ${topic.weight}/5 · confidence ${topic.confidence}/5`),
      });
      exam.topics.forEach((topic) => nextEdges.push({ id: `exam:${exam.id}:topic:${topic.topicId}`, source: `topic:${topic.topicId}`, target: examNodeId, label: `w${topic.weight}/c${topic.confidence}`, kind: "exam" }));
    });

    const gapInsights = topics.flatMap((topic) => {
      const topicNotes = notes.filter((note) => note.topicId === topic.id);
      const topicCards = flashcards.filter((card) => card.topicId === topic.id);
      const heavyExam = exams.flatMap((exam) => exam.topics.map((examTopic) => ({ ...examTopic, examTitle: exam.title }))).find((examTopic) => examTopic.topicId === topic.id && (examTopic.weight >= 4 || examTopic.confidence <= 2));
      const reasons = [
        !topicNotes.length ? "no notes" : "",
        !topicCards.some((card) => card.isKept) ? "no kept cards" : "",
        heavyExam ? `${heavyExam.examTitle}: weight ${heavyExam.weight}/5, confidence ${heavyExam.confidence}/5` : "",
      ].filter(Boolean);
      return reasons.length ? [{ topic, reasons }] : [];
    }).slice(0, 4);

    return { nodes: nextNodes, edges: nextEdges, insights: gapInsights };
  }, [courses, documents, exams, flashcards, notes, planBlocks, topics]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const activeNodeId = hoveredNodeId ?? selectedNodeId;
  const localFocusId = selectedNodeId ?? "workspace";
  const localIds = useMemo(() => collectNeighborhoodIds(localFocusId, edges, localDepth), [edges, localDepth, localFocusId]);
  const connectedIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const ids = new Set<string>([activeNodeId]);
    edges.forEach((edge) => {
      if (edge.source === activeNodeId) ids.add(edge.target);
      if (edge.target === activeNodeId) ids.add(edge.source);
    });
    return ids;
  }, [activeNodeId, edges]);

  const visibleNodes = useMemo(() => nodes.filter((node) => {
    const inMode = graphMode === "global" || localIds.has(node.id);
    const inFilter = filter === "all" || node.kind === filter || (filter === "course" && node.id === "workspace");
    return inMode && inFilter && nodeMatches(node, query);
  }), [filter, graphMode, localIds, nodes, query]);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const focusNode = nodeById.get(localFocusId) ?? null;
  const selectedConnections = selectedNode ? edges
    .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
    .map((edge) => ({ edge, node: nodeById.get(edge.source === selectedNode.id ? edge.target : edge.source) }))
    .filter((connection): connection is { edge: AtlasEdge; node: AtlasNode } => Boolean(connection.node))
    .slice(0, 8) : [];

  const openSelected = () => {
    if (!selectedNode) return;
    if (selectedNode.topicId && selectedNode.kind === "topic") {
      const topic = topics.find((entry) => entry.id === selectedNode.topicId);
      if (topic) onOpenTopic(topic);
      return;
    }
    if (selectedNode.documentId) {
      const document = documents.find((entry) => entry.id === selectedNode.documentId);
      if (document) onOpenDocument(document);
      return;
    }
    if (selectedNode.topicId && selectedNode.kind === "note") {
      onOpenNotesForTopic(selectedNode.topicId);
      return;
    }
    if (selectedNode.topicId && selectedNode.kind === "cards") {
      onOpenCardsForTopic(selectedNode.topicId);
      return;
    }
    if (selectedNode.kind === "exam" || selectedNode.kind === "block") {
      onOpenPlanner();
      return;
    }
    if (selectedNode.topicId) {
      const topic = topics.find((entry) => entry.id === selectedNode.topicId);
      if (topic) onOpenTopic(topic);
    }
  };

  const handleCanvasWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const zoomDelta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((currentZoom) => Number(clamp(currentZoom + zoomDelta, 0.65, 1.8).toFixed(2)));
  };

  if (!topics.length) {
    return <div className="atlas-empty"><p className="eyebrow">Mind map</p><h1>Your Study Atlas starts with one topic.</h1><p>Create a course topic, then MedCompass will automatically map every source, note, card, citation, exam, and study block that connects to it.</p><button className="button primary" onClick={onCreateTopic}>Create your first topic →</button><style jsx>{`.atlas-empty { max-width: 760px; margin: 0 auto; padding: 88px 58px; }.atlas-empty h1 { margin: 0 0 12px; color: #202b2e; font: 52px Georgia, serif; font-weight: 500; letter-spacing: -1.8px; }.atlas-empty p:not(.eyebrow) { max-width: 580px; margin: 0 0 24px; color: #66746f; font-size: 14px; line-height: 1.6; }`}</style></div>;
  }

  return <div className="atlas-page">
    <header className="atlas-header">
      <div>
        <p className="eyebrow">Study Atlas</p>
        <h1>Your knowledge graph.</h1>
        <p>A living map of the relationships already forming between topics, sources, citations, notes, cards, exams, and study blocks.</p>
      </div>
      <div className="atlas-stats" aria-label="Atlas summary">
        <span><strong>{visibleNodes.length}</strong> nodes</span>
        <span><strong>{visibleEdges.length}</strong> links</span>
        <button className="button primary" onClick={onCreateTopic}>+ New topic</button>
      </div>
    </header>

    <section className="atlas-shell">
      <div className="atlas-commandbar">
        <label className="atlas-search">⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nodes, citations, objectives…" aria-label="Search the atlas" /></label>
        <div className="mode-switch" aria-label="Graph mode">
          <button className={graphMode === "global" ? "active" : ""} onClick={() => setGraphMode("global")}>Global</button>
          <button className={graphMode === "local" ? "active" : ""} onClick={() => setGraphMode("local")}>Local</button>
        </div>
        <div className="atlas-filters" aria-label="Filter map nodes">{atlasKinds.map((entry) => <button key={entry.kind} className={filter === entry.kind ? "active" : ""} onClick={() => setFilter(entry.kind)}>{entry.label}</button>)}</div>
      </div>

      <div className="atlas-workbench">
        <div className="atlas-canvas" onWheel={handleCanvasWheel}>
          <div className="canvas-card canvas-status">
            <span>{graphMode === "local" ? "Local graph" : "Global graph"}</span>
            <strong>{graphMode === "local" ? focusNode?.label ?? "Study Atlas" : "Whole workspace"}</strong>
            <small>{graphMode === "local" ? `Depth ${localDepth} · ${visibleNodes.length} visible` : "Scroll to zoom · hover to reveal neighbours"}</small>
          </div>
          <div className="canvas-card canvas-controls" aria-label="Graph display controls">
            <label>Zoom <input type="range" min="0.65" max="1.8" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
            <label>Node size <input type="range" min="0.8" max="1.35" step="0.05" value={nodeScale} onChange={(event) => setNodeScale(Number(event.target.value))} /></label>
            <label className={graphMode === "local" ? "" : "disabled"}>Depth <input disabled={graphMode !== "local"} type="range" min="1" max="3" step="1" value={localDepth} onChange={(event) => setLocalDepth(Number(event.target.value))} /></label>
            <button className={showLabels ? "toggle-on" : ""} onClick={() => setShowLabels((current) => !current)}>{showLabels ? "Labels on" : "Labels quiet"}</button>
          </div>
          <svg viewBox="0 0 1200 860" role="img" aria-label="Interactive study atlas mind map" style={{ transform: `scale(${zoom})` }}>
            <defs>
              <radialGradient id="atlasGlow" cx="50%" cy="42%" r="68%">
                <stop offset="0%" stopColor="#fbfbf3" />
                <stop offset="58%" stopColor="#edf3ea" />
                <stop offset="100%" stopColor="#dfe9e2" />
              </radialGradient>
              <pattern id="atlasGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#d5dfd8" strokeWidth="0.7" opacity="0.55" />
              </pattern>
              <radialGradient id="courseNodeGradient" cx="36%" cy="28%" r="72%"><stop offset="0%" stopColor="#406066" /><stop offset="100%" stopColor="#172d32" /></radialGradient>
              <radialGradient id="moduleNodeGradient" cx="35%" cy="28%" r="72%"><stop offset="0%" stopColor="#f4f7e9" /><stop offset="100%" stopColor="#c4d3bc" /></radialGradient>
              <radialGradient id="topicNodeGradient" cx="35%" cy="28%" r="72%"><stop offset="0%" stopColor="#a9d3b8" /><stop offset="100%" stopColor="#4f9278" /></radialGradient>
              <radialGradient id="sourceNodeGradient" cx="35%" cy="28%" r="72%"><stop offset="0%" stopColor="#7798ad" /><stop offset="100%" stopColor="#395c74" /></radialGradient>
              <radialGradient id="noteNodeGradient" cx="35%" cy="28%" r="72%"><stop offset="0%" stopColor="#fff9e9" /><stop offset="100%" stopColor="#dfb765" /></radialGradient>
              <radialGradient id="cardNodeGradient" cx="35%" cy="28%" r="72%"><stop offset="0%" stopColor="#fdeccc" /><stop offset="100%" stopColor="#c1833a" /></radialGradient>
              <radialGradient id="examNodeGradient" cx="35%" cy="28%" r="72%"><stop offset="0%" stopColor="#f8e1dc" /><stop offset="100%" stopColor="#b66f61" /></radialGradient>
              <radialGradient id="blockNodeGradient" cx="35%" cy="28%" r="72%"><stop offset="0%" stopColor="#e8f7f2" /><stop offset="100%" stopColor="#70a39a" /></radialGradient>
            </defs>
            <rect width="1200" height="860" rx="32" fill="url(#atlasGlow)" />
            <rect width="1200" height="860" rx="32" fill="url(#atlasGrid)" opacity="0.48" />
            {visibleEdges.map((edge) => {
              const source = nodeById.get(edge.source);
              const target = nodeById.get(edge.target);
              if (!source || !target) return null;
              const active = Boolean(activeNodeId && connectedIds.has(source.id) && connectedIds.has(target.id));
              const faded = Boolean(activeNodeId && !active);
              return <g key={edge.id} className={`edge ${edge.kind} ${active ? "active" : ""} ${faded ? "faded" : ""}`}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                {active && <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 5}>{edge.label}</text>}
              </g>;
            })}
            {visibleNodes.map((node) => {
              const active = activeNodeId === node.id;
              const connected = connectedIds.has(node.id);
              const faded = Boolean(activeNodeId && !active && !connected);
              const radius = node.radius * nodeScale;
              const label = node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label;
              return <g key={node.id} className={`node ${node.kind} ${active ? "active" : ""} ${connected ? "connected" : ""} ${faded ? "faded" : ""}`} transform={`translate(${node.x} ${node.y})`} onMouseEnter={() => setHoveredNodeId(node.id)} onMouseLeave={() => setHoveredNodeId(null)} onClick={() => setSelectedNodeId(node.id)} tabIndex={0} role="button" aria-label={`${kindLabels[node.kind]}: ${node.label}`} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedNodeId(node.id);
              }}>
                <ellipse cx="0" cy={radius * 0.52} rx={radius * 0.84} ry={radius * 0.24} className="node-shadow" />
                <circle r={radius + 13} className="node-halo" />
                <circle r={radius} className="node-circle" />
                <circle r={Math.max(5, radius * 0.35)} cx={-radius * 0.22} cy={-radius * 0.26} className="node-sheen" />
                <text className="node-glyph" textAnchor="middle" dy={node.kind === "source" ? "0.32em" : "0.35em"}>{nodeGlyphs[node.kind]}</text>
                {(showLabels || active || connected) && <text className="node-label" textAnchor="middle" y={radius + 18}>{label}</text>}
              </g>;
            })}
          </svg>
        </div>

        <aside className="atlas-panel">
          {selectedNode ? <>
            <div className="panel-type"><span className={selectedNode.kind} />{kindLabels[selectedNode.kind]}</div>
            <h2>{selectedNode.label}</h2>
            <p>{selectedNode.subtitle}</p>
            <div className="atlas-meta">{selectedNode.meta.map((item) => <span key={item}>{item}</span>)}</div>
            <div className="panel-actions">
              <button className="button dark" onClick={openSelected}>{selectedNode.kind === "source" ? "Open source →" : selectedNode.kind === "note" ? "Open notes →" : selectedNode.kind === "cards" ? "Review cards →" : selectedNode.kind === "exam" || selectedNode.kind === "block" ? "Open planner →" : selectedNode.kind === "topic" ? "Open topic →" : "Open related work →"}</button>
              <button className="button ghost" onClick={() => setGraphMode("local")}>Focus local</button>
            </div>
            <div className="connection-list">
              <strong>Backlinks & neighbours</strong>
              {selectedConnections.length ? selectedConnections.map(({ edge, node }) => <button key={`${edge.id}:${node.id}`} onClick={() => setSelectedNodeId(node.id)}><span>{kindLabels[node.kind]}</span><b>{node.label}</b><small>{edge.label}</small></button>) : <p>No visible connections under this filter.</p>}
            </div>
          </> : <>
            <p className="eyebrow">Graph view</p>
            <h2>Click a node to inspect it.</h2>
            <p>Use Global for the whole workspace, or Local to zoom into the selected node’s neighbourhood. Hovering highlights direct links, just like a knowledge-base graph.</p>
            <div className="legend">
              {atlasKinds.filter((entry) => entry.kind !== "all").map((entry) => <span key={entry.kind}><i className={entry.kind} />{entry.label}</span>)}
            </div>
          </>}
        </aside>
      </div>
    </section>

    <section className="atlas-insights">
      <div className="section-heading"><div><p className="eyebrow">Study signals</p><h2>What the map notices</h2></div><button className="text-button" onClick={onOpenPlanner}>Open planner →</button></div>
      {insights.length ? <div className="insight-grid">{insights.map(({ topic, reasons }) => <button key={topic.id} onClick={() => {
        const studyTopic = topics.find((entry) => entry.id === topic.id);
        if (studyTopic) onOpenTopic(studyTopic);
      }}><span>Gap</span><strong>{topic.name}</strong><small>{reasons.join(" · ")}</small></button>)}</div> : <div className="insight-empty">No obvious gaps yet. Nice — the atlas has notes/cards/planning signals across your current topics.</div>}
    </section>

    <style jsx>{`
      .atlas-page { max-width: 1360px; margin: 0 auto; padding: 42px 42px 80px; }
      .atlas-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
      .atlas-header h1 { margin: 0 0 8px; color: #202b2e; font: 50px Georgia, serif; font-weight: 500; letter-spacing: -1.8px; }
      .atlas-header p:not(.eyebrow) { max-width: 740px; margin: 0; color: #66746f; font-size: 14px; line-height: 1.55; }
      .atlas-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .atlas-stats span { border: 1px solid #d8e4da; border-radius: 999px; padding: 8px 11px; color: #66766f; background: #fffefa; font-size: 11px; font-weight: 800; }
      .atlas-stats strong { color: #263d37; font: 16px Georgia, serif; margin-right: 4px; }
      .atlas-shell { border: 1px solid #d7e2d9; border-radius: 18px; background: #eef3ed; box-shadow: 0 14px 34px rgba(36,55,48,.07); overflow: hidden; }
      .atlas-commandbar { display: grid; grid-template-columns: minmax(260px, 380px) auto minmax(0, 1fr); gap: 10px; align-items: center; padding: 12px; border-bottom: 1px solid #d7e2d9; background: rgba(255,254,250,.82); backdrop-filter: blur(10px); }
      .atlas-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #dce4dc; border-radius: 11px; color: #74817b; background: #fffefa; box-shadow: inset 0 1px 0 rgba(255,255,255,.7); }
      .atlas-search input { min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font-size: 12px; }
      .mode-switch { display: inline-flex; width: max-content; padding: 3px; border: 1px solid #d7e1d8; border-radius: 999px; background: #eef4ef; }
      .mode-switch button, .atlas-filters button, .canvas-controls button { border: 0; border-radius: 999px; padding: 7px 10px; color: #63756e; background: transparent; font-size: 11px; font-weight: 800; }
      .mode-switch button.active, .atlas-filters button.active, .canvas-controls button.toggle-on { color: #fffefa; background: #2f5c55; box-shadow: 0 2px 8px rgba(47,92,85,.18); }
      .atlas-filters { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
      .atlas-filters button { border: 1px solid #d8e2da; background: #fffefa; }
      .atlas-workbench { display: grid; grid-template-columns: minmax(0, 1fr) 335px; gap: 0; min-height: 675px; }
      .atlas-canvas { position: relative; min-height: 720px; overflow: auto; background: #e6eee7; overscroll-behavior: contain; }
      .atlas-canvas svg { width: 100%; min-width: 1040px; height: auto; min-height: 720px; transform-origin: center; transition: transform .18s ease; }
      .canvas-card { position: absolute; z-index: 1; border: 1px solid rgba(210,224,214,.82); border-radius: 13px; background: rgba(255,254,250,.83); box-shadow: 0 10px 28px rgba(35,55,48,.09); backdrop-filter: blur(14px); }
      .canvas-status { top: 16px; left: 16px; display: grid; gap: 3px; max-width: 265px; padding: 12px 13px; }
      .canvas-status span { color: #6c7c74; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .09em; }
      .canvas-status strong { color: #253936; font-size: 13px; }
      .canvas-status small { color: #73837c; font-size: 10px; line-height: 1.35; }
      .canvas-controls { left: 16px; bottom: 16px; display: flex; align-items: center; gap: 10px; padding: 9px; }
      .canvas-controls label { display: flex; align-items: center; gap: 7px; color: #62746c; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; }
      .canvas-controls label.disabled { opacity: .38; }
      .canvas-controls input { width: 92px; accent-color: #497970; }
      .edge line { stroke: #aebdb3; stroke-width: 1.15; }
      .edge.structure line { stroke: #c8d2cb; }
      .edge.source line { stroke: #86a594; }
      .edge.citation line { stroke: #c69c57; stroke-dasharray: 5 6; }
      .edge.exam line { stroke: #b8796c; stroke-width: 1.6; }
      .edge.plan line { stroke: #78a8a0; stroke-dasharray: 9 6; }
      .edge.active line { stroke-width: 3; }
      .edge.faded { opacity: .12; }
      .edge text { fill: #53655e; font-size: 10px; font-weight: 800; paint-order: stroke; stroke: #f5faf3; stroke-width: 4px; }
      .node { cursor: pointer; outline: none; transition: opacity .16s ease; }
      .node-halo { fill: transparent; stroke: transparent; stroke-width: 1; }
      .node-shadow { fill: rgba(38,55,48,.16); filter: blur(3px); pointer-events: none; }
      .node-circle { fill: #dce9df; stroke: rgba(255,254,250,.72); stroke-width: 2.6; filter: drop-shadow(0 7px 10px rgba(30,48,42,.16)); transition: stroke-width .14s ease, filter .14s ease; }
      .node-sheen { fill: rgba(255,254,250,.33); pointer-events: none; }
      .node.course .node-circle { fill: url(#courseNodeGradient); stroke: rgba(255,254,250,.22); }
      .node.module .node-circle { fill: url(#moduleNodeGradient); stroke: rgba(104,123,102,.28); }
      .node.topic .node-circle { fill: url(#topicNodeGradient); stroke: rgba(255,254,250,.42); }
      .node.source .node-circle { fill: url(#sourceNodeGradient); stroke: rgba(255,254,250,.35); }
      .node.note .node-circle { fill: url(#noteNodeGradient); stroke: rgba(151,108,49,.18); }
      .node.cards .node-circle { fill: url(#cardNodeGradient); stroke: rgba(151,93,35,.2); }
      .node.exam .node-circle { fill: url(#examNodeGradient); stroke: rgba(151,78,66,.2); }
      .node.block .node-circle { fill: url(#blockNodeGradient); stroke: rgba(69,123,114,.22); }
      .node.active .node-halo, .node.connected .node-halo { fill: rgba(255,254,250,.38); stroke: rgba(58,113,94,.38); }
      .node.active .node-circle { stroke-width: 4.2; filter: drop-shadow(0 11px 16px rgba(39,92,78,.28)); }
      .node.faded { opacity: .18; }
      .node-glyph { fill: #243535; font-size: 12px; font-weight: 900; pointer-events: none; }
      .node.course .node-glyph, .node.topic .node-glyph, .node.source .node-glyph { fill: #fffefa; }
      .node-label { fill: #30413d; font-size: 11px; font-weight: 850; paint-order: stroke; stroke: #f5faf3; stroke-width: 4px; pointer-events: none; }
      .atlas-panel { border-left: 1px solid #d7e2d9; background: #fffefa; padding: 24px; overflow: auto; }
      .panel-type { display: flex; align-items: center; gap: 7px; color: #6d7d75; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .09em; margin-bottom: 12px; }
      .panel-type span, .legend i { width: 9px; height: 9px; border-radius: 50%; background: #7fb69a; }
      .panel-type span.course { background: #21383d; }
      .panel-type span.module { background: #bdcdb6; }
      .panel-type span.source { background: #486a80; }
      .panel-type span.note { background: #d5ad68; }
      .panel-type span.cards { background: #c78b47; }
      .panel-type span.exam { background: #b97567; }
      .panel-type span.block { background: #79a59e; }
      .atlas-panel h2 { margin: 0 0 8px; color: #263d37; font: 26px Georgia, serif; font-weight: 500; letter-spacing: -.5px; }
      .atlas-panel p:not(.eyebrow) { margin: 0 0 16px; color: #64746e; font-size: 12px; line-height: 1.55; }
      .atlas-meta { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 18px; }
      .atlas-meta span, .legend span { border-radius: 999px; padding: 6px 8px; color: #53675f; background: #eef4ef; font-size: 10px; font-weight: 800; }
      .panel-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
      .connection-list { display: grid; gap: 7px; margin-top: 8px; }
      .connection-list > strong { color: #31413d; font-size: 12px; }
      .connection-list button { display: grid; gap: 3px; border: 1px solid #e1e8e2; border-radius: 10px; padding: 11px; background: #fbfcf8; text-align: left; color: #2d3d39; }
      .connection-list button:hover { border-color: #bed3c4; background: #f3f8f4; }
      .connection-list button span { color: #6f8179; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
      .connection-list button b { font-size: 12px; }
      .connection-list button small { color: #6b7b75; font-size: 10px; }
      .legend { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 18px; }
      .legend span { display: flex; align-items: center; gap: 5px; }
      .legend i.source { background: #486a80; }
      .legend i.note { background: #d5ad68; }
      .legend i.cards { background: #c78b47; }
      .legend i.exam { background: #b97567; }
      .legend i.block { background: #79a59e; }
      .atlas-insights { margin-top: 16px; padding: 22px; border: 1px solid #dce6de; border-radius: 15px; background: #fffefa; box-shadow: 0 8px 24px rgba(32,52,42,.035); }
      .insight-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin-top: 15px; }
      .insight-grid button { display: grid; gap: 5px; border: 1px solid #e1e7e1; border-radius: 10px; padding: 13px; color: #2d3d39; background: #fffefa; text-align: left; }
      .insight-grid span { width: max-content; border-radius: 999px; padding: 4px 7px; color: #9a683d; background: #fff1dc; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
      .insight-grid strong { font-size: 12px; }
      .insight-grid small, .insight-empty { color: #6d7d76; font-size: 11px; line-height: 1.45; }
      .insight-empty { margin-top: 12px; padding: 14px; border-radius: 9px; background: #eef6f0; }
      @media (max-width: 1120px) { .atlas-page { padding: 40px 34px 80px; }.atlas-commandbar, .atlas-workbench { grid-template-columns: 1fr; }.atlas-filters { justify-content: flex-start; }.atlas-panel { border-left: 0; border-top: 1px solid #d7e2d9; }.insight-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 700px) { .atlas-page { padding: 30px 18px 70px; }.atlas-header { display: grid; }.atlas-header h1 { font-size: 39px; }.atlas-stats { justify-content: flex-start; }.canvas-controls { position: static; margin: 10px; flex-wrap: wrap; }.canvas-status { position: static; margin: 10px 10px 0; }.insight-grid { grid-template-columns: 1fr; } }
    `}</style>
  </div>;
}

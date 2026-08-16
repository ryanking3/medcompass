"use client";

import { useMemo, useState } from "react";
import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, type Edge as FlowEdge, type Node as FlowNode, type NodeProps } from "@xyflow/react";
import type { StudyCourse, StudyDocument, StudyExam, StudyFlashcard, StudyNote, StudyPlanBlock, StudyTopic } from "./types";

type AtlasKind = "course" | "module" | "topic" | "source" | "note" | "cards" | "exam" | "block";
type EdgeKind = "structure" | "source" | "citation" | "artifact" | "exam" | "plan";

type AtlasNode = {
  id: string;
  kind: AtlasKind;
  label: string;
  subtitle: string;
  x: number;
  y: number;
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
  kind: EdgeKind;
};

type AtlasNodeData = AtlasNode & {
  connected: boolean;
  muted: boolean;
  showDetails: boolean;
};

type AtlasFlowNode = FlowNode<AtlasNodeData, "atlasNode">;

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

const edgeColors: Record<EdgeKind, string> = {
  structure: "#b8c4bd",
  source: "#7ea48e",
  citation: "#c29347",
  artifact: "#9bb99e",
  exam: "#b8786a",
  plan: "#6fa69d",
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

function textSnippet(value: string, maxLength = 92) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
}

function nodeMatches(node: AtlasNode, query: string) {
  const search = query.toLowerCase();
  return !search || [node.label, node.subtitle, ...node.meta].some((value) => value.toLowerCase().includes(search));
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
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

function AtlasStudyNode({ data, selected }: NodeProps<AtlasFlowNode>) {
  const chips = data.meta.slice(0, data.kind === "topic" ? 3 : 2);
  return (
    <article className={`atlas-node-card ${data.kind} ${selected ? "selected" : ""} ${data.connected ? "connected" : ""} ${data.muted ? "muted" : ""}`}>
      <Handle type="target" position={Position.Top} className="atlas-handle" />
      <Handle type="source" position={Position.Bottom} className="atlas-handle" />
      <div className="node-card-head">
        <span className="node-kind-dot" />
        <span>{kindLabels[data.kind]}</span>
      </div>
      <h3>{data.label}</h3>
      {data.showDetails && <p>{data.subtitle}</p>}
      {data.showDetails && chips.length > 0 && <div className="node-chip-row">{chips.map((chip) => <small key={chip}>{chip}</small>)}</div>}
    </article>
  );
}

const nodeTypes = { atlasNode: AtlasStudyNode };

export function StudyAtlas({ courses, documents, notes, flashcards, exams, planBlocks, onCreateTopic, onOpenTopic, onOpenDocument, onOpenNotesForTopic, onOpenCardsForTopic, onOpenPlanner }: StudyAtlasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AtlasKind>("all");
  const [query, setQuery] = useState("");
  const [graphMode, setGraphMode] = useState<"global" | "local" | "exam" | "evidence">("global");
  const [localDepth, setLocalDepth] = useState(1);
  const [showDetails, setShowDetails] = useState(true);

  const topics = useMemo(() => courses.flatMap((course) => course.modules.flatMap((module) => module.topics.map((topic) => ({ ...topic, courseId: course.id, courseName: course.name, moduleId: module.id, moduleName: module.name })))), [courses]);

  const { nodes, edges, insights } = useMemo(() => {
    const nextNodes: AtlasNode[] = [];
    const nextEdges: AtlasEdge[] = [];
    const topicPositions = new Map<string, { x: number; y: number; angle: number }>();
    const center = { x: 0, y: 0 };
    const topicCount = topics.length;

    topics.forEach((topic, index) => {
      const angle = topicCount <= 1 ? -Math.PI / 2 : -Math.PI / 2 + (index / topicCount) * Math.PI * 2;
      const ringX = topicCount <= 6 ? 560 : 690;
      const ringY = topicCount <= 6 ? 360 : 455;
      topicPositions.set(topic.id, { x: center.x + Math.cos(angle) * ringX, y: center.y + Math.sin(angle) * ringY, angle });
    });

    nextNodes.push({
      id: "workspace",
      kind: "course",
      label: "Study Atlas",
      subtitle: "Your connected knowledge map",
      x: center.x - 120,
      y: center.y - 70,
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
        x: center.x + Math.cos(courseAngle) * 245 - 120,
        y: center.y + Math.sin(courseAngle) * 160 - 70,
        courseId: course.id,
        meta: [plural(course.modules.length, "module"), plural(courseTopics.length, "topic")],
      });
      nextEdges.push({ id: `workspace:${course.id}`, source: "workspace", target: courseNodeId, label: "contains", kind: "structure" });

      course.modules.forEach((module) => {
        const moduleTopics = module.topics.map((topic) => topicPositions.get(topic.id)).filter(Boolean) as Array<{ x: number; y: number; angle: number }>;
        const averageX = moduleTopics.length ? moduleTopics.reduce((sum, topic) => sum + topic.x, 0) / moduleTopics.length : center.x + Math.cos(courseAngle) * 420;
        const averageY = moduleTopics.length ? moduleTopics.reduce((sum, topic) => sum + topic.y, 0) / moduleTopics.length : center.y + Math.sin(courseAngle) * 280;
        const moduleNodeId = `module:${module.id}`;
        nextNodes.push({
          id: moduleNodeId,
          kind: "module",
          label: module.name,
          subtitle: course.name,
          x: center.x + (averageX - center.x) * 0.5 - 105,
          y: center.y + (averageY - center.y) * 0.5 - 60,
          courseId: course.id,
          moduleId: module.id,
          meta: [plural(module.topics.length, "topic")],
        });
        nextEdges.push({ id: `course:${course.id}:module:${module.id}`, source: courseNodeId, target: moduleNodeId, label: "module", kind: "structure" });
      });
    });

    topics.forEach((topic) => {
      const position = topicPositions.get(topic.id) ?? { x: 0, y: -360, angle: -Math.PI / 2 };
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
        x: position.x - 120,
        y: position.y - 75,
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
          x: clamp(position.x + Math.cos(position.angle + 0.65) * 230, -900, 900) - 85,
          y: clamp(position.y + Math.sin(position.angle + 0.65) * 230, -650, 650) - 55,
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
          x: clamp(position.x + Math.cos(position.angle - 0.75) * 230, -900, 900) - 85,
          y: clamp(position.y + Math.sin(position.angle - 0.75) * 230, -650, 650) - 55,
          topicId: topic.id,
          meta: [`Next: ${formatDate(upcomingBlocks[0].startsOn)}`, upcomingBlocks[0].title],
        });
        nextEdges.push({ id: `topic:${topic.id}:blocks`, source: topicNodeId, target: blockNodeId, label: "scheduled", kind: "plan" });
      }
    });

    documents.forEach((document, index) => {
      const linkedPositions = document.linkedTopics.map((topic) => topicPositions.get(topic.id)).filter(Boolean) as Array<{ x: number; y: number; angle: number }>;
      const averageX = linkedPositions.length ? linkedPositions.reduce((sum, position) => sum + position.x, 0) / linkedPositions.length : -720;
      const averageY = linkedPositions.length ? linkedPositions.reduce((sum, position) => sum + position.y, 0) / linkedPositions.length : 520 + index * 80;
      const awayAngle = Math.atan2(averageY - center.y, averageX - center.x) || -Math.PI / 2;
      const documentNodeId = `source:${document.id}`;
      nextNodes.push({
        id: documentNodeId,
        kind: "source",
        label: document.title,
        subtitle: `${document.kind === "textbook" ? "Textbook" : document.kind === "lecture" ? "Lecture" : "PDF"} · ${document.status === "ready" ? `${document.pageCount ?? "?"} pages ready` : document.status}`,
        x: clamp(averageX + Math.cos(awayAngle) * 310, -990, 990) - 95,
        y: clamp(averageY + Math.sin(awayAngle) * 310, -720, 720) - 58,
        documentId: document.id,
        meta: document.linkedTopics.length ? document.linkedTopics.map((topic) => `Linked to ${topic.name}`) : ["Unlinked source"],
      });
      document.linkedTopics.forEach((topic) => nextEdges.push({ id: `source:${document.id}:topic:${topic.id}`, source: `topic:${topic.id}`, target: documentNodeId, label: "source", kind: "source" }));
    });

    notes.forEach((note, index) => {
      const position = topicPositions.get(note.topicId);
      if (!position) return;
      const spread = (index % 5 - 2) * 0.28;
      const noteNodeId = `note:${note.id}`;
      nextNodes.push({
        id: noteNodeId,
        kind: "note",
        label: note.title,
        subtitle: note.citations.length ? `${plural(note.citations.length, "citation")} · ${note.images.length ? plural(note.images.length, "image") : "text note"}` : note.images.length ? plural(note.images.length, "image") : "Manual note",
        x: clamp(position.x + Math.cos(position.angle + Math.PI + spread) * 255, -960, 960) - 90,
        y: clamp(position.y + Math.sin(position.angle + Math.PI + spread) * 255, -700, 700) - 58,
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
      const averageX = examPositions.length ? examPositions.reduce((sum, position) => sum + position.x, 0) / examPositions.length : 760;
      const averageY = examPositions.length ? examPositions.reduce((sum, position) => sum + position.y, 0) / examPositions.length : -380 + index * 170;
      const examNodeId = `exam:${exam.id}`;
      nextNodes.push({
        id: examNodeId,
        kind: "exam",
        label: exam.title,
        subtitle: `${formatDate(exam.examDate)} · ${Math.round(exam.targetMinutes / 60)}h target`,
        x: clamp(averageX + 340, -930, 930) - 105,
        y: clamp(averageY - 210, -720, 720) - 62,
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
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const activeNodeId = hoveredNodeId ?? selectedNodeId;
  const localFocusId = selectedNodeId ?? "workspace";
  const localIds = useMemo(() => collectNeighborhoodIds(localFocusId, edges, localDepth), [edges, localDepth, localFocusId]);
  const connectedIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    return collectNeighborhoodIds(activeNodeId, edges, 1);
  }, [activeNodeId, edges]);

  const visibleNodes = useMemo(() => nodes.filter((node) => {
    const inMode = graphMode === "global"
      || (graphMode === "local" && localIds.has(node.id))
      || (graphMode === "exam" && (node.kind === "exam" || node.kind === "topic" || node.kind === "block" || (node.kind === "cards" && localIds.has(node.id))))
      || (graphMode === "evidence" && (node.kind === "source" || node.kind === "note" || node.kind === "topic"));
    const inFilter = filter === "all" || node.kind === filter || (filter === "course" && node.id === "workspace");
    return inMode && inFilter && nodeMatches(node, query);
  }), [filter, graphMode, localIds, nodes, query]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)), [edges, visibleNodeIds]);
  const selectedConnections = selectedNode ? edges
    .filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
    .map((edge) => ({ edge, node: nodeById.get(edge.source === selectedNode.id ? edge.target : edge.source) }))
    .filter((connection): connection is { edge: AtlasEdge; node: AtlasNode } => Boolean(connection.node))
    .slice(0, 8) : [];

  const flowNodes = useMemo<AtlasFlowNode[]>(() => visibleNodes.map((node) => ({
    id: node.id,
    type: "atlasNode",
    position: { x: node.x, y: node.y },
    data: {
      ...node,
      connected: connectedIds.has(node.id),
      muted: Boolean(activeNodeId && !connectedIds.has(node.id)),
      showDetails,
    },
  })), [activeNodeId, connectedIds, showDetails, visibleNodes]);

  const flowEdges = useMemo<FlowEdge[]>(() => visibleEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    animated: edge.kind === "citation" || edge.kind === "plan",
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: edgeColors[edge.kind] },
    style: { stroke: edgeColors[edge.kind], strokeWidth: edge.kind === "citation" ? 1.8 : 1.35, strokeDasharray: edge.kind === "citation" || edge.kind === "plan" ? "6 7" : undefined },
    labelStyle: { fill: "#566963", fontSize: 10, fontWeight: 800 },
    labelBgStyle: { fill: "#fffefa", fillOpacity: 0.78 },
  })), [visibleEdges]);

  const focusNode = nodeById.get(localFocusId) ?? null;

  const openNode = (nodeId: string) => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    if (node.topicId && node.kind === "topic") {
      const topic = topics.find((entry) => entry.id === node.topicId);
      if (topic) onOpenTopic(topic);
      return;
    }
    if (node.documentId) {
      const document = documents.find((entry) => entry.id === node.documentId);
      if (document) onOpenDocument(document);
      return;
    }
    if (node.topicId && node.kind === "note") {
      onOpenNotesForTopic(node.topicId);
      return;
    }
    if (node.topicId && node.kind === "cards") {
      onOpenCardsForTopic(node.topicId);
      return;
    }
    if (node.kind === "exam" || node.kind === "block") {
      onOpenPlanner();
      return;
    }
    if (node.topicId) {
      const topic = topics.find((entry) => entry.id === node.topicId);
      if (topic) onOpenTopic(topic);
    }
  };

  const openSelected = () => {
    if (selectedNodeId) openNode(selectedNodeId);
  };

  if (!topics.length) {
    return <div className="atlas-empty"><p className="eyebrow">Mind map</p><h1>Your Study Atlas starts with one topic.</h1><p>Create a course topic, then MedCompass will automatically map every source, note, card, citation, exam, and study block that connects to it.</p><button className="button primary" onClick={onCreateTopic}>Create your first topic →</button><style jsx>{`.atlas-empty { max-width: 760px; margin: 0 auto; padding: 88px 58px; }.atlas-empty h1 { margin: 0 0 12px; color: #202b2e; font: 52px Georgia, serif; font-weight: 500; letter-spacing: -1.8px; }.atlas-empty p:not(.eyebrow) { max-width: 580px; margin: 0 0 24px; color: #66746f; font-size: 14px; line-height: 1.6; }`}</style></div>;
  }

  return <div className="atlas-page">
    <header className="atlas-header">
      <div>
        <p className="eyebrow">Study Atlas</p>
        <h1>Your study map, not just dots.</h1>
        <p>Explore topic cards, source tiles, note snippets, exam targets, and planner blocks on a draggable canvas.</p>
      </div>
      <div className="atlas-stats" aria-label="Atlas summary">
        <span><strong>{visibleNodes.length}</strong> cards</span>
        <span><strong>{visibleEdges.length}</strong> links</span>
        <button className="button primary" onClick={onCreateTopic}>+ New topic</button>
      </div>
    </header>

    <section className="atlas-shell">
      <div className="atlas-commandbar">
        <label className="atlas-search">⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, notes, citations…" aria-label="Search the atlas" /></label>
        <div className="mode-switch" aria-label="Graph mode">
          <button className={graphMode === "global" ? "active" : ""} onClick={() => setGraphMode("global")}>Global</button>
          <button className={graphMode === "local" ? "active" : ""} onClick={() => setGraphMode("local")}>Local</button>
          <button className={graphMode === "evidence" ? "active" : ""} onClick={() => setGraphMode("evidence")}>Evidence</button>
          <button className={graphMode === "exam" ? "active" : ""} onClick={() => setGraphMode("exam")}>Exam</button>
        </div>
        <div className="atlas-filters" aria-label="Filter map nodes">{atlasKinds.map((entry) => <button key={entry.kind} className={filter === entry.kind ? "active" : ""} onClick={() => setFilter(entry.kind)}>{entry.label}</button>)}</div>
      </div>

      <div className="atlas-workbench">
        <div className="atlas-canvas">
          <div className="canvas-card canvas-status">
            <span>{graphMode === "local" ? "Local focus" : `${graphMode} view`}</span>
            <strong>{graphMode === "local" ? focusNode?.label ?? "Study Atlas" : "Drag cards · scroll to zoom"}</strong>
            <small>{graphMode === "local" ? `Depth ${localDepth} · ${visibleNodes.length} visible` : "Double click a card to open it."}</small>
          </div>
          <div className="canvas-card canvas-controls" aria-label="Graph display controls">
            <label className={graphMode === "local" ? "" : "disabled"}>Depth <input disabled={graphMode !== "local"} type="range" min="1" max="3" step="1" value={localDepth} onChange={(event) => setLocalDepth(Number(event.target.value))} /></label>
            <button className={showDetails ? "toggle-on" : ""} onClick={() => setShowDetails((current) => !current)}>{showDetails ? "Details on" : "Compact"}</button>
          </div>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.22, maxZoom: 0.95 }}
            minZoom={0.18}
            maxZoom={1.7}
            defaultEdgeOptions={{ interactionWidth: 18 }}
            onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
            onNodeDoubleClick={(_event, node) => openNode(node.id)}
            onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
            onNodeMouseLeave={() => setHoveredNodeId(null)}
          >
            <Background color="#cfdbd3" gap={34} size={1} />
            <Controls position="bottom-left" showInteractive={false} />
            <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={3} nodeColor={(node) => {
              const kind = (node.data as AtlasNodeData).kind;
              if (kind === "topic") return "#7fb69a";
              if (kind === "source") return "#486a80";
              if (kind === "note") return "#d7ad5e";
              if (kind === "exam") return "#b97567";
              if (kind === "block") return "#79a59e";
              return "#9caf9f";
            }} />
          </ReactFlow>
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
            <p className="eyebrow">Canvas view</p>
            <h2>Click a card to inspect it.</h2>
            <p>This version uses a real pan/zoom graph canvas, so students can drag the map, zoom smoothly, focus locally, and see rich study objects instead of abstract bubbles.</p>
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
      .atlas-page { max-width: 1380px; margin: 0 auto; padding: 42px 42px 80px; }
      .atlas-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
      .atlas-header h1 { margin: 0 0 8px; color: #202b2e; font: 50px Georgia, serif; font-weight: 500; letter-spacing: -1.8px; }
      .atlas-header p:not(.eyebrow) { max-width: 740px; margin: 0; color: #66746f; font-size: 14px; line-height: 1.55; }
      .atlas-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      .atlas-stats span { border: 1px solid #d8e4da; border-radius: 999px; padding: 8px 11px; color: #66766f; background: #fffefa; font-size: 11px; font-weight: 800; }
      .atlas-stats strong { color: #263d37; font: 16px Georgia, serif; margin-right: 4px; }
      .atlas-shell { border: 1px solid #d7e2d9; border-radius: 18px; background: #eef3ed; box-shadow: 0 14px 34px rgba(36,55,48,.07); overflow: hidden; }
      .atlas-commandbar { display: grid; grid-template-columns: minmax(260px, 380px) auto minmax(0, 1fr); gap: 10px; align-items: center; padding: 12px; border-bottom: 1px solid #d7e2d9; background: rgba(255,254,250,.9); backdrop-filter: blur(10px); }
      .atlas-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #dce4dc; border-radius: 11px; color: #74817b; background: #fffefa; box-shadow: inset 0 1px 0 rgba(255,255,255,.7); }
      .atlas-search input { min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font-size: 12px; }
      .mode-switch { display: inline-flex; width: max-content; padding: 3px; border: 1px solid #d7e1d8; border-radius: 999px; background: #eef4ef; }
      .mode-switch button, .atlas-filters button, .canvas-controls button { border: 0; border-radius: 999px; padding: 7px 10px; color: #63756e; background: transparent; font-size: 11px; font-weight: 800; }
      .mode-switch button.active, .atlas-filters button.active, .canvas-controls button.toggle-on { color: #fffefa; background: #2f5c55; box-shadow: 0 2px 8px rgba(47,92,85,.18); }
      .atlas-filters { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
      .atlas-filters button { border: 1px solid #d8e2da; background: #fffefa; }
      .atlas-workbench { display: grid; grid-template-columns: minmax(0, 1fr) 340px; min-height: 740px; }
      .atlas-canvas { position: relative; min-height: 740px; overflow: hidden; background: radial-gradient(circle at 30% 15%, #fbfbf3 0, #edf3ea 42%, #e2ece5 100%); }
      .canvas-card { position: absolute; z-index: 5; border: 1px solid rgba(210,224,214,.82); border-radius: 13px; background: rgba(255,254,250,.86); box-shadow: 0 10px 28px rgba(35,55,48,.09); backdrop-filter: blur(14px); }
      .canvas-status { top: 16px; left: 16px; display: grid; gap: 3px; max-width: 275px; padding: 12px 13px; }
      .canvas-status span { color: #6c7c74; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .09em; }
      .canvas-status strong { color: #253936; font-size: 13px; }
      .canvas-status small { color: #73837c; font-size: 10px; line-height: 1.35; }
      .canvas-controls { right: 16px; top: 16px; display: flex; align-items: center; gap: 10px; padding: 9px; }
      .canvas-controls label { display: flex; align-items: center; gap: 7px; color: #62746c; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; }
      .canvas-controls label.disabled { opacity: .38; }
      .canvas-controls input { width: 92px; accent-color: #497970; }
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
      @media (max-width: 700px) { .atlas-page { padding: 30px 18px 70px; }.atlas-header { display: grid; }.atlas-header h1 { font-size: 39px; }.atlas-stats { justify-content: flex-start; }.mode-switch { flex-wrap: wrap; width: auto; border-radius: 13px; }.canvas-controls { position: static; margin: 10px; flex-wrap: wrap; }.canvas-status { position: static; margin: 10px 10px 0; }.insight-grid { grid-template-columns: 1fr; } }
    `}</style>
  </div>;
}

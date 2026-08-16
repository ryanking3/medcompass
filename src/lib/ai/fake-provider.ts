import { aiStudyStandards } from "./standards";
import type { AiMockExamQuestion, AiMockExamResponse, AiSourceStudyRequest, AiSourceStudyResponse, MockExamFormat } from "./types";

function compactText(value: string | undefined, fallback: string) {
  const compact = value?.replace(/\s+/g, " ").trim();
  return compact || fallback;
}

function excerpt(value: string | undefined, length = 260) {
  const compact = compactText(value, "this source section");
  return compact.length > length ? `${compact.slice(0, length - 1)}…` : compact;
}

function titleFromText(value: string | undefined, fallback: string) {
  const text = compactText(value, fallback);
  return text.length > 64 ? `${text.slice(0, 61)}…` : text;
}

export function fakeSourceStudyResponse(request: AiSourceStudyRequest): AiSourceStudyResponse {
  const selected = excerpt(request.selectedText, 360);
  const topicName = request.topicName || "this topic";
  const citation = {
    documentId: request.documentId,
    documentTitle: request.documentTitle,
    pageStart: request.page,
    pageEnd: request.page,
    excerpt: request.selectedText || null,
  };

  if (request.action === "note") {
    return {
      mode: "fake",
      action: "note",
      noteDraft: {
        title: titleFromText(request.selectedText, `${request.documentTitle}, p. ${request.page}`),
        body: [
          `## ${topicName}: source note`,
          "",
          `- Key idea: ${selected}`,
          "- Why it matters: connect this point to the learning objective and any diagrams on the page.",
          "- Check yourself: can you explain the mechanism without looking back at the PDF?",
          "",
          "_AI draft placeholder — generated from MedCompass note template._",
        ].join("\n"),
        citation,
      },
      standards: [...aiStudyStandards.note],
      citations: [citation],
    };
  }

  if (request.action === "flashcard") {
    return {
      mode: "fake",
      action: "flashcard",
      flashcardDraft: {
        kind: "basic",
        front: `In ${topicName}, what is the key takeaway from this source section?`,
        back: `${selected}\n\nKeep this answer concise when reviewing.`,
        source: citation,
        qualityChecklist: [...aiStudyStandards.flashcard],
      },
      standards: [...aiStudyStandards.flashcard],
      citations: [citation],
    };
  }

  const question = compactText(request.question, "What should I understand from this section?");
  return {
    mode: "fake",
    action: "ask",
    answer: [
      `Fake AI answer for: “${question}”`,
      "",
      `Based on the selected source text, the important study point is: ${selected}`,
      "",
      `For a med-school workflow, I would turn this into one short note and one recall card, both cited to ${request.documentTitle}, p. ${request.page}.`,
    ].join("\n"),
    standards: [...aiStudyStandards.sourceAnswer],
    citations: [citation],
  };
}

export function fakeMockExamResponse(input: {
  examTitle: string;
  format: MockExamFormat;
  questionCount: number;
  topics: Array<{ topicName: string; weight?: number; confidence?: number }>;
}): AiMockExamResponse {
  const topics = input.topics.length ? input.topics : [{ topicName: "General revision", weight: 3, confidence: 3 }];
  const questions: AiMockExamQuestion[] = Array.from({ length: Math.max(1, input.questionCount) }, (_, index) => {
    const topic = topics[index % topics.length];
    const shouldBeMcq = input.format === "mcq" || (input.format === "mixed" && index % 2 === 0);
    if (shouldBeMcq) {
      return {
        id: `fake-mcq-${index + 1}`,
        type: "mcq",
        topicName: topic.topicName,
        prompt: `Which statement best reflects the high-yield principle in ${topic.topicName}?`,
        options: [
          "A single mechanism explains the clinical finding.",
          "The concept should be linked back to source evidence and active recall.",
          "The topic can be ignored if confidence is low.",
          "Diagrams are never useful for this material.",
        ],
        answer: "The concept should be linked back to source evidence and active recall.",
        rationale: `Fake rationale: this mirrors the MedCompass standard for ${topic.topicName}, especially when exam weight is ${topic.weight ?? 3}/5 and confidence is ${topic.confidence ?? 3}/5.`,
      };
    }

    return {
      id: `fake-written-${index + 1}`,
      type: "written",
      topicName: topic.topicName,
      prompt: `Explain ${topic.topicName} as a short exam answer, including one mechanism and one clinical/study implication.`,
      answer: `A strong answer should define the concept, describe the mechanism, and connect it to the relevant source-linked notes/cards for ${topic.topicName}.`,
      rationale: "Fake rationale: written answers should test explanation, not just recognition.",
    };
  });

  return {
    mode: "fake",
    title: `${input.examTitle} mock exam`,
    format: input.format,
    questions,
    standards: [...aiStudyStandards.mockExam],
  };
}

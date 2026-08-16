export const aiStudyStandards = {
  sourceAnswer: [
    "Answer only from the supplied source/topic context.",
    "Name uncertainty instead of inventing missing facts.",
    "Keep citations attached to the document page or selected excerpt.",
    "Use plain medical-study language before adding technical detail.",
  ],
  note: [
    "Write in concise student-owned wording, not copied textbook prose.",
    "Preserve the source citation and page reference.",
    "Prefer structured bullets when a concept has steps, causes, or comparisons.",
    "Flag diagrams/images as useful attachments rather than pretending to see them unless provided.",
  ],
  flashcard: [
    "Test one idea per card.",
    "Make the question specific enough to be answerable without rereading the source.",
    "Keep answers short, factual, and source-linked.",
    "Avoid vague prompts like 'explain this'.",
  ],
  mockExam: [
    "Cover high-weight and low-confidence topics first.",
    "Mix recall, application, and explanation questions.",
    "Include answer keys and brief rationales.",
    "Use the student's existing topics, notes, cards, and exam metadata as context.",
  ],
} as const;

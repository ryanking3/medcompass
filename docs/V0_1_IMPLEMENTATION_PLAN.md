# MedCompass v0.1 Implementation Plan

## Purpose

Build and validate one complete, trustworthy study workflow for medical students:

> Upload a textbook chapter or lecture PDF → read it → ask cited questions → save notes → create editable Anki cards.

The goal is not to build every feature described in the product specification. The goal is to test whether MedCompass saves students time and becomes part of their regular study routine.

## v0.1 success criteria

The first release is successful when a beta student can:

1. Sign in and create a course topic.
2. Upload a permitted, non-sensitive PDF.
3. Read it in a browser and select a page range or passage.
4. Ask a question and receive an answer with useful source-page citations.
5. Save an answer or passage into a topic note.
6. Generate a small set of editable cards and export them to Anki.

We will measure:

- Completion of the above workflow in fewer than 15 minutes for one chapter.
- Relevant citations on the majority of source-grounded answers.
- At least 50% of generated cards retained after student review.
- Repeat use: beta students return for three or more study sessions in a week.

## Scope

### Included

- Magic-link email and Google authentication
- Private student workspaces
- Course, module, topic, and learning-objective structure
- Private PDF/textbook upload
- Page-aware PDF reader
- Source selection and semantic search
- Cited AI chat over selected user sources
- Topic notes with source links
- Editable basic and cloze flashcards
- Anki-compatible export
- Document and account deletion controls

### Deferred

- Notion import or synchronisation
- Direct/background Anki synchronisation
- Revision planner and calendar integration
- OCR-first workflows for scanned books
- Image occlusion cards and detailed diagram understanding
- Collaboration, sharing, study groups, and educator accounts
- RCSI/university system integrations
- Native mobile app

## Delivery plan

### Phase 0 — product guardrails and UX blueprint

**Estimate:** 2–3 days

Define the minimum product contract before implementation.

Deliverables:

- Four-screen user-flow specification: onboarding, topic dashboard, textbook reader, card-review/export.
- Interaction states for uploading, processing, source selection, citations, errors, and empty workspaces.
- Acceptance criteria for each feature.
- Content policy: educational use only; no patient-identifiable information or clinical records.
- Initial visual direction and component inventory.

Exit criteria:

- A student journey can be followed end-to-end without ambiguous decisions.
- We know precisely which screens and API actions belong in v0.1.

### Phase 1 — application foundation

**Estimate:** 2–3 days

Set up the web application and secure data boundary.

Deliverables:

- Next.js and TypeScript application scaffold.
- Tailwind CSS and shared UI components.
- Supabase project configuration: Auth, Postgres, private storage, and Row Level Security.
- Initial database schema for users, workspaces, courses, topics, documents, and notes.
- Environment-variable template and local-development instructions.
- Sentry and privacy-conscious product analytics foundations.

Exit criteria:

- A student can sign in, create a topic, and access only their own workspace data.

### Phase 2 — textbook ingestion and reader

**Estimate:** 4–5 days

Make it possible to bring source material into the app and use it comfortably.

Deliverables:

- Private PDF upload with file-size/type validation and rights acknowledgement.
- Background document-processing job with page-level text extraction.
- Document metadata, processing-status UI, and retryable failure handling.
- PDF.js reader with page navigation, zoom, thumbnails, and text selection.
- Attach documents to topics and show a source list in each topic.
- Page bookmarks and selected-page/passages sent to the next interaction.

Exit criteria:

- A student can upload a text-based PDF and read/select it in the browser.
- Each extracted text fragment remains linked to an exact page range.

### Phase 3 — source-grounded AI tutor

**Estimate:** 4–5 days

Build the trust-critical AI interaction.

Deliverables:

- Page/chapter-aware chunks and vector embeddings stored with access permissions.
- Retrieval scoped to the selected document, page range, topic, or workspace.
- Tutor chat with selected text/page context.
- Structured citations linking directly back to pages in the reader.
- Explicit answer states: **from your sources**, **general explanation**, and **insufficient evidence**.
- Streaming responses, feedback controls, and retrieval/model audit records.

Exit criteria:

- Answers to a small evaluation set consistently cite relevant supporting pages.
- The app does not imply that an unsupported answer came from the student's source material.

### Phase 4 — notes and flashcard workflow

**Estimate:** 3–4 days

Turn reading and chat into durable study outputs.

Deliverables:

- Rich-text topic notes.
- Save a passage or tutor response as a note with source-page citation.
- AI actions on a selected passage/objective: explain, summarise, generate cards.
- Editable basic Q&A and cloze cards.
- Review queue, simple duplicate detection, and card-to-source links.
- CSV and `.apkg` export suitable for Anki import.

Exit criteria:

- A student can go from a selected textbook passage to reviewed cards without leaving MedCompass.
- Exported cards import successfully into a test Anki profile.

### Phase 5 — safety, quality, and beta readiness

**Estimate:** 2–3 days

Harden the workflow before another student relies on it.

Deliverables:

- Prominent educational-use and no-patient-data guidance.
- Sensitive-data warnings before processing/upload.
- Document, workspace, and account deletion flows that remove associated chunks and embeddings.
- Authentication/authorization tests for Row Level Security.
- Evaluation questions for retrieval, citation correctness, and card quality.
- Error monitoring with prompts/source text redacted.
- Lightweight onboarding and feedback capture.

Exit criteria:

- A student can safely test the product without access to another student's data.
- Major failure states give an understandable recovery path.

### Phase 6 — private beta and iteration

**Estimate:** 1–2 weeks

Test with a small group of medical students using permitted, non-sensitive study material.

Plan:

1. Recruit 5–10 students, beginning with the intended RCSI GEM user.
2. Observe the first study session or collect a structured walkthrough recording.
3. Ask students to complete the same chapter-to-cards workflow.
4. Review task completion, citation usefulness, card retention, and return use.
5. Rank problems by frequency and impact.
6. Build only the highest-value improvement before expanding scope.

## Technical implementation sequence

```text
Authentication and data isolation
        ↓
Private upload and page-aware processing
        ↓
Rendered reader and source selection
        ↓
Retrieval plus cited tutor
        ↓
Saved notes and editable cards
        ↓
Anki export, safety checks, and beta
```

## Key technical decisions

| Concern | v0.1 decision |
|---|---|
| Web framework | Next.js + TypeScript |
| Auth/data/files | Supabase Auth, Postgres, private Storage, Row Level Security |
| Reader | PDF.js |
| Retrieval | Page-aware chunks + pgvector in Postgres |
| AI | Provider-adapter architecture, initially using the OpenAI Responses API |
| Long-running work | Background jobs for extraction, chunking, embeddings, and card generation |
| Notes | Source-aware, topic-centred notes—not a Notion clone |
| Cards | Basic/cloze plus export, with direct Anki sync deferred |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| AI answer is confident but unsupported | Require citations; show insufficient-evidence state; test retrieval before beta |
| Poor PDF extraction | Begin with text-based PDFs; add OCR later; preserve clear processing errors |
| Copyright misuse | Private uploads only, rights acknowledgement, no shared catalogue or redistribution |
| Sensitive/clinical information in upload | Clear prohibition, upload warning, minimise retention, and evaluate detection controls |
| Scope expands too early | Treat the deferred list as a release boundary; every new feature must improve the core loop |
| Generated cards are low quality | Generate small batches, make editing easy, expose sources, measure retention |

## Dependencies before the integration phases

- A Supabase account/project with EU-appropriate hosting and a data-processing agreement reviewed for the intended use.
- An AI provider account and API credentials.
- A deployment account (for example, Vercel).
- A small set of legally obtained, non-sensitive sample PDFs for testing.
- A test Anki profile to validate exports.

## Immediate next action

Begin **Phase 0** by producing the UX and technical blueprint for the four v0.1 screens. This establishes the exact user experience and data flow before application code is introduced.

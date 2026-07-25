# MedCompass v0.1 implementation plan

## Purpose

Validate one trustworthy study workflow for medical students:

> Bring a permitted PDF into a topic → study it → create source-linked notes and cards → export cards to Anki.

The intended end state also includes a cited AI tutor. The implementation is deliberately being built in layers so that the private data boundary and non-AI study workflow are reliable first.

For the exact shipped scope, use [current state](CURRENT_STATE.md). This plan is the roadmap, not a claim that every feature below exists today.

## Success criteria

A beta student should be able to:

1. Sign in and create a course topic.
2. Upload a permitted, non-sensitive PDF and attach it to that topic.
3. Read the private source and retain page-level provenance.
4. Create a useful note or editable card that remains linked to its source page.
5. Export reviewed cards into Anki.
6. Once AI is introduced, ask a question and receive a clearly scoped response with useful source-page citations.

We will measure task completion, citation relevance, card retention after review, and repeat weekly use—not raw AI output volume.

## Delivery status

| Milestone | Status | Notes |
| --- | --- | --- |
| Product guardrails and UX direction | Complete | Product specification and UX blueprint exist; each now distinguishes target experience from current app. |
| Application foundation | Complete | Next.js, Supabase Auth, Postgres, private Storage, RLS, workspace hierarchy, and local configuration are in place. |
| Textbook ingestion | Partially complete | Private PDF upload, topic linking, page extraction, processing states/retry, and signed reader work. Custom reader controls and background processing remain. |
| Manual notes and cards | Partially complete | Cited notes, editable basic/cloze cards, kept state, and Anki CSV export work. Rich text, review scheduling, duplicate detection, and `.apkg` do not. |
| Source-grounded AI | Not started | Requires retrieval, structured citations, and evaluation before AI-assisted outputs. |
| Safety, quality, and beta readiness | Not started | Deletion flows, monitoring, formal RLS tests, evaluations, feedback, CI, and deployment remain. |

## Scope boundary

### Included in v0.1

- Private student workspace and generic course/module/topic structure.
- Permitted private PDF upload and source-linked study outputs.
- Page-aware extraction and source provenance.
- Manual notes and editable basic/cloze cards.
- Anki-compatible CSV export.
- A source-grounded tutor only once it can make transparent, page-linked evidence claims.

### Explicitly deferred

- Notion import/synchronisation and direct/background Anki synchronisation.
- Revision planner, calendar integration, collaboration, sharing, and educator accounts.
- University systems/content integrations and native mobile applications.
- OCR-first workflows, image-occlusion cards, and broad diagram understanding until they are evaluated safely.

## Remaining milestones

### 1. Finish the source foundation

- Add document/workspace/account deletion with cascading private-source cleanup.
- Move extraction to retryable background work before supporting large/long-running uploads.
- Improve reader navigation, zoom, thumbnails, text selection, and page/passage handoff.
- Test storage and database access boundaries with more than one authenticated user.

### 2. Build trustworthy retrieval and tutor behaviour

- Split extracted pages into permission-scoped chunks and store embeddings.
- Retrieve only from the active user/workspace and selected source scope.
- Introduce a server-side provider adapter, initially using OpenAI.
- Return structured source citations that open exact document pages.
- Display distinct states: **from your sources**, **general explanation**, and **insufficient evidence**.
- Keep audit metadata without retaining unnecessary source/prompt content.
- Create a small medical-study evaluation set for retrieval and citation correctness.

### 3. Add AI-assisted study outputs

- Turn selected passages and learning objectives into clearly labelled note/card drafts.
- Preserve editable basic and cloze cards; never silently create final study material.
- Evaluate diagram/image workflows separately using vision-capable processing and explicit image provenance.
- Add duplicate suggestions, review support, and `.apkg` only after the basic workflow is validated.

### 4. Prepare a private beta

- Add educational-use/no-patient-data guidance at upload and AI entry points.
- Add redacted error monitoring, feedback capture, and onboarding.
- Deploy with production redirect URLs and custom email/SMTP only when appropriate.
- Test one chapter-to-cards session with permitted study material before widening access.

## Technical decisions

| Concern | Current / intended decision |
| --- | --- |
| Web application | Next.js + TypeScript. |
| Authentication, data, files | Supabase Auth, Postgres, private Storage, and RLS. |
| PDF processing | Server-side PDF.js page extraction today; background jobs later. |
| Reader | Signed browser PDF rendering today; richer source-selection UI later. |
| Retrieval | Page-aware chunks plus vector search, scoped by workspace/source. |
| AI | Provider adapter; OpenAI is the initial planned provider. |
| Notes | Topic-centred and source-aware, not a Notion clone. |
| Cards | Editable basic/cloze cards and CSV today; direct Anki sync is deferred. |

## Risks and guardrails

| Risk | Guardrail |
| --- | --- |
| Unsupported AI answer appears authoritative | Citations, evidence states, retrieval tests, and an insufficient-evidence response. |
| Cross-user source exposure | RLS, private storage, authenticated routes, and signed URLs only. |
| Copyright misuse | Private uploads only; no shared source catalogue or redistribution. |
| Patient/sensitive data is uploaded | Clear prohibition, minimised retention, and no clinical use positioning. |
| Poor extraction/image understanding | Start with text PDFs; preserve processing errors; evaluate OCR/vision separately. |
| Scope expansion | New work must strengthen the core study loop or remain deferred. |

## Immediate next action

Design and implement the permission-scoped retrieval foundation for extracted PDF pages. Do not wire an AI chat interface directly to whole documents or expose an AI key in the browser.

# MedCompass current state

This is the implementation reference for the repository. It records the product boundary that exists in the app today; the product specification and UX blueprint describe the broader intended direction.

## Current study loop

```text
Sign in with a magic link
  → create a course/module/topic
  → add exams and weekly availability when planning is needed
  → upload a permitted PDF and link it to a topic
  → extract its page text from Library or the reader and read the private source
  → shortlist useful PDF pages while reading
  → write a cited note, create/edit source-linked cards, or send a highlighted passage/topic/practice paper to Chat
  → inspect the Study Atlas to see how those objects connect
  → generate planner-scoped fake practice papers, save completed attempts, and review submitted answers
  → export kept cards as Anki-compatible CSV
```

This is deliberately useful without AI. Manual study outputs must remain editable and source-linked when the AI layer is introduced.

## Delivered

| Area | Current behaviour |
| --- | --- |
| Authentication | Supabase email/password sign-in and account creation, password recovery, magic-link fallback, callback handling, session refresh, and sign out. |
| Account settings | Users can update their display name, request an email change, set/change a password, and sign out. |
| Access control | Authenticated workspace data and private `study-sources` storage are protected by Supabase row-level security. |
| Study structure | Users can create and navigate courses, modules, topics, and learning objectives. |
| Sources | PDF upload is private, validates the file type/size, can be linked to a topic, and shows processing state. |
| Extraction | Server-side PDF.js extracts text page by page into `document_pages`; failures have retry paths from Library and the reader. |
| Reader | A signed private URL renders the original PDF in a continuous reader with page navigation, zoom, collapsible source panel, and temporary in-session page bookmarks. |
| Reader → Chat | Highlighted/current-page source context can be sent into the primary Chat page with document, page, topic, and selected text attached. |
| Notes | Topic notes are created and edited manually, with optional document/page/excerpt citations and inline pasted/uploaded images. |
| Flashcards | Basic and cloze cards can be created, edited, deleted, marked as kept, linked to a source page, and exported to CSV for Anki. |
| Study planner | Users can add exams, save weekly availability, generate topic-linked study blocks, mark blocks planned/done/skipped, and jump to Practice for mock-paper generation. |
| Chat foundation | A fake AI provider supports source questions, cited note drafts, flashcard drafts, prompt templates, visible output standards, Library readiness guidance, and launch context from reader/topic/practice surfaces while real AI integration waits. |
| AI draft saving | Fake AI note and flashcard drafts saved from Chat keep source/page context when available. |
| Practice exams | Fake mock exams can be generated from planner exams, persisted to Supabase, opened later, sat in timed attempt mode, and sent to Chat for focused review prompts. |
| Practice attempts | Completed practice attempts are persisted with answer JSON, answered counts, duration, completion time, per-paper attempt history, and answer-level review. |
| Study Atlas | A derived interactive mind map visualises courses, modules, topics, sources, notes, citations, card queues, exams, and upcoming planner blocks. |
| Home/topic/library polish | Home includes a practice pulse, topic pages include a study brief plus Chat handoff, and Library includes source-readiness cards with inline prepare/retry controls. |
| Empty states | A new account starts with a real empty workspace rather than sample study data. |

## Important implementation details

- The application is Next.js + TypeScript with React client components for interactive workspace views.
- Supabase provides Auth, Postgres, private Storage, and row-level security.
- `src/app/page.tsx` loads the authenticated workspace server-side and supplies normalised data to the client workspace components.
- Mutation routes under `src/app/api/` authenticate before accessing data. Client UI uses camelCase; database fields remain snake_case.
- The PDF reader uses a client-side continuous PDF renderer for navigation/zoom/selection and a server-side PDF.js extraction route for page text.
- Reader bookmarks are intentionally temporary component state for now; persistent highlights/bookmarks need a future schema.

## Not implemented yet

- Real AI chat, source retrieval, embeddings, vector search, and production AI-generated notes/cards.
- Reliable AI handling of source images, diagrams, or scanned-PDF OCR.
- Advanced reader annotations, persistent bookmarks, and persistent highlights.
- Rich-text notes, duplicate-card detection, review scheduling, `.apkg` export, or Anki synchronisation.
- AI-assisted planner optimisation based on weak topics, source progress, notes, atlas gaps, practice attempts, or flashcard history.
- Google/passkey sign-in, account deletion, document deletion, or advanced profile editing.
- Background workers/queues, observability, automated test coverage, CI, and production deployment.

## Next implementation priority

Move from fake AI flows to a trusted source-grounded AI layer:

1. Produce permission-scoped chunks from extracted pages.
2. Add retrieval and evidence evaluation for selected sources/pages.
3. Introduce a provider adapter, initially for OpenAI, using a server-only API key.
4. Return structured citations that open the exact supporting source page.
5. Add AI-assisted explanations, note drafts, and card drafts only after citation behaviour is trustworthy.

The current fake provider already exercises the UI/API shapes for Chat, source study actions, and mock exams. Keep those request/response contracts stable where possible when replacing fake responses with real provider calls.

The app must distinguish answers supported by the student's source from general explanation and insufficient evidence. Diagram/image support is important for medical study and should be designed into this milestone, but it requires explicit vision/OCR evaluation rather than assuming extracted PDF text is enough.

## Demo workspaces

A private, owner-only workspace may be seeded directly in the database for product filming. Keep that data separate from migrations and application defaults: no personal identities, private source files, or user-specific seed content belong in the repository. The local `scripts/seed-demo-atlas.mjs` helper seeds invented educational data for the Study Atlas when run with explicit runtime credentials and confirmation. A demo reader still requires the owner to upload a permitted PDF to that account.

## Verification

Run these checks after code changes:

```sh
npm run typecheck
npm run lint
npm run build
```

For database changes, add an ordered migration under `supabase/migrations/`, apply it to the intended Supabase project, and verify row-level-security behaviour with authenticated user flows.

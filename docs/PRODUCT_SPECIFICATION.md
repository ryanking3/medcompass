# Medical School Assistant — Product Specification

## 1. Product summary

**Working name:** MedCompass

MedCompass is an AI-powered study workspace for medical students. It brings together the tools students currently stitch together manually—PDFs and textbooks, ChatGPT/Gemini, Notion-style notes, and Anki—into one source-aware learning flow.

The product is **not** a generic chatbot, a diagnosis tool, or a Notion/Anki replacement. Its job is to help a student turn their own learning material and curriculum objectives into understanding, recall practice, and a realistic revision plan.

The first launch profile is a graduate-entry medical student at RCSI, but the product must work for students at other universities and programmes without depending on RCSI-specific content.

### Product promise

> Give me the source material for a topic, and help me understand it, make reliable notes and cards, and know what to revise next.

## 2. Problem and opportunity

Medical students already have strong tools, but the workflow is fragmented:

- Textbooks and lecture slides are difficult to search and cross-reference.
- General AI chat can be useful but is often ungrounded and hard to trust.
- Notes live separately from the source that supports them.
- Making high-quality Anki cards takes time and AI-generated cards can be noisy.
- Revision plans rarely reflect what a student actually knows.

MedCompass should reduce the friction between **reading → understanding → note-taking → retrieval practice → revision**. The value is not simply producing more content; it is producing useful, editable learning outputs that remain linked to their evidence.

## 3. Target users

### Primary user: independent medical student

A student in pre-clinical or early clinical education who studies from lecture decks, PDFs, textbooks, personal notes, and Anki. They need help with large volumes of content, exam preparation, and difficult concepts.

### Launch segment

RCSI GEM students, beginning with a small private beta. The product should support programme/year/module templates, but it must not rely on privileged access to university systems or content.

### Future users

- Medical students at other Irish and UK/EU schools
- Other healthcare students (physiotherapy, pharmacy, nursing, dentistry)
- Educators, in a separate curated-content role—not in the first release

## 4. Core experience

```text
Course and learning objectives
          +
Lectures, textbooks, notes, and other permitted sources
          ↓
Topic workspace with a cited AI tutor and reader
          ↓
Notes, questions, and editable flashcards
          ↓
Revision plan driven by objectives and performance
```

A student should be able to open a topic such as *renal physiology*, attach the relevant lecture and textbook chapter, ask a question while reading, save a sourced note, generate a small set of reviewable cards, and have that topic appear in their revision plan.

## 5. Main product areas

### 5.1 Course workspace

Students create or select a programme, academic year, module/block, topic, and exam date. The hierarchy is intentionally generic:

```text
Workspace → Course → Module/Block → Topic → Learning objective
```

Features:

- Configurable course/module/topic structure
- Learning objectives entered manually, imported, or created from a lecture outline
- Exam dates and available weekly study time
- Tags such as anatomy, pathology, pharmacology, systems, and high-yield
- Topic dashboard showing sources, notes, cards, questions, and completion status

RCSI GEM may ship as an optional starter template. Templates should be editable by the student and should never contain copyrighted school content unless permission has been secured.

### 5.2 Textbook library and reader

The Textbooks area is a first-class workspace, not just another upload button. Students can add their own legally obtained textbooks or permitted course PDFs and work directly inside a browser reader.

#### Reader experience

- Library view with cover, title, edition, author, subject, and course/topic tags
- Fast, paginated PDF rendering with thumbnails, page number navigation, zoom, search, bookmarks, and a table of contents when available
- Split view: textbook page on one side, chat/notes/cards on the other
- Highlight text; attach a private note, tag it, or turn it into a question/card
- Bookmarks, saved excerpts, and a personal “important pages” list
- Optional OCR/vision processing for scanned pages, with clear indication when extracted text is uncertain

#### Textbook AI actions

All actions should operate on the selected passage, page range, chapter, or explicitly selected sources—not silently on an entire library.

- **Ask this book:** answer questions with page-level citations
- **Explain this passage:** beginner, exam-focused, or detailed modes
- **Compare sources:** contrast the textbook with a selected lecture or note, showing where they agree or differ
- **Find in this book:** semantic search that returns relevant passages and pages
- **Create note:** produce an editable note linked to the exact pages used
- **Make questions/cards:** suggest a small editable card set from an objective or selected pages
- **Quiz me from this chapter:** adaptive short-answer or multiple-choice practice, with answer explanations and citations

#### Textbook boundaries

- Textbooks remain private to the uploading student by default.
- The product must require users to confirm that they have the right to upload and process the material.
- Do not provide a shared textbook catalogue, redistribute files, or expose full extracted text to other users.
- Only store derived content required for the user's workspace; delete source chunks and embeddings when a book is deleted.

### 5.3 Source-grounded AI tutor

The tutor is the core trust feature. It should answer from the user-selected materials first, then optionally use general medical knowledge when the user asks for it.

Every factual answer needs a visible source state:

- **From your sources:** citations link to a document page, slide, book page, or note.
- **General explanation:** explicitly labelled as not verified against the student's materials.
- **Insufficient evidence:** the assistant says it cannot support an answer from the selected sources instead of fabricating certainty.

Modes:

- Explain simply / teach me step-by-step
- Exam-focused answer
- Compare and contrast
- Socratic tutoring
- Clinical vignette for learning
- Quiz me and mark my answer

The tutor must not position itself as a diagnostic or treatment service. Clinical examples are educational only, and it must refuse patient-specific advice or identifiable patient material.

### 5.4 Notes workspace

Notes are topic-centred and source-aware rather than a broad productivity system.

- Rich-text notes with headings, lists, callouts, tables, and images
- Inline citations back to book pages, slides, or excerpts
- Save a chat response or selected passage to a topic note
- AI can summarize, reorganise, explain, or identify missing learning objectives
- Manual Markdown, CSV, and pasted-content import in the initial product
- Optional Notion import/integration after validating real demand

### 5.5 Flashcard studio and Anki compatibility

Cards must be editable, sparse, and grounded in objectives. The goal is to help students make high-quality recall prompts, not flood them with hundreds of generic cards.

- Basic Q&A and cloze cards in v1
- Cards link to a topic, learning objective, and source
- Review/edit queue before cards are added to a deck
- Duplicate and near-duplicate detection
- Source panel showing the evidence behind a card
- Export to Anki-compatible CSV and `.apkg`
- Import existing cards/decks later where technically and legally appropriate

Direct background sync to a local Anki collection is a later feature because a browser app cannot reliably manage a student's local Anki database without a local companion or AnkiConnect setup.

### 5.6 Revision planner

The planner translates course scope into the next useful study action.

- Exam date, available time, target modules, and importance weighting
- Daily and weekly plan of reading, questions, cards, and review
- “What should I study next?” view
- Topic confidence from quizzes and completed work
- Easy rescheduling when a student misses a day
- Later: incorporate actual Anki review history and spaced-repetition data

## 6. Product principles

1. **Grounded over fluent.** Evidence and uncertainty matter more than a confident answer.
2. **Student-owned and editable.** AI creates drafts, never irreversible truth.
3. **Objective-led.** The learning objective is the unit of progress, not chat-message count.
4. **Small useful outputs.** Generate five good cards, not fifty mediocre ones.
5. **Private by default.** A student's sources and notes are not shared, trained on, or publicly indexed.
6. **Works beyond RCSI.** School templates enhance the experience but do not define the product.

## 7. Recommended technical architecture

| Area | Recommendation | Notes |
|---|---|---|
| App | Next.js + TypeScript | One web codebase, strong React ecosystem |
| UI | Tailwind CSS + shadcn/ui | Fast, accessible product UI |
| Auth, database, file storage | Supabase | Postgres, Auth, private storage, Row Level Security |
| Database access | Drizzle ORM | Typed schema and lightweight migrations |
| Search/retrieval | Postgres + pgvector | Permission-aware semantic search close to core data |
| PDF reader | PDF.js | Client-side rendering, thumbnails, text selection, navigation |
| Document processing | Background worker + PDF text extraction; OCR fallback | Extraction, page mapping, chunking, embeddings |
| Jobs | Inngest or Trigger.dev | Avoid long upload/chat requests and allow retrying |
| AI layer | OpenAI Responses API behind a provider adapter | Keep model/vendor routing replaceable |
| Hosting | Vercel plus EU-hosted data services | Simple deployment and an EU-oriented data posture |
| Product analytics | PostHog | Disable sensitive-content capture |
| Errors | Sentry | Redact prompts, source text, and personally identifiable data |

### AI and retrieval design

1. Upload a file to private storage.
2. Create a document record and queue background processing.
3. Extract text by page; use OCR for scanned pages only when needed.
4. Split content into semantically sensible chunks, preserving document ID, page range, chapter, and permissions.
5. Generate embeddings and store them in `pgvector`.
6. At question time, retrieve only chunks the user is permitted to access and only from selected sources/course context.
7. Ask the model to answer using those chunks, return structured citations, and record the source coverage/confidence.

Retrieval quality should be evaluated with a curated set of student questions before broad rollout. Keep an audit trail of model version, retrieved chunks, answer, and user feedback, while allowing the student to delete their data.

## 8. Authentication, authorization, and privacy

### Authentication

- Magic-link email sign-in as the default
- Google sign-in for low-friction student onboarding
- Apple sign-in later, especially if the product becomes a mobile PWA
- Verified account required to retain uploads and personal study data
- A non-upload demo workspace can let prospective users experience the product safely

### Roles

Start with a single real role: `student`. Design for future `educator` and `institution_admin` roles, but do not expose multi-user sharing or administration in v1.

### Authorization

Every user-owned table has an owner/workspace ID. Supabase Row Level Security must prevent access to another student's files, chunks, chats, notes, cards, and study activity. Files are stored privately and served only with short-lived signed URLs.

### Privacy requirements

- Clear terms: educational use only; no patient-identifiable information or placement documentation.
- Explicit upload acknowledgement for copyrighted and sensitive material.
- Pre-processing warning and optional detection for likely personal/clinical identifiers.
- Data minimisation, export, account deletion, individual document deletion, and retention rules.
- No training on user content without a separate, explicit opt-in.
- Vendor data-processing agreements and EU data-transfer assessment before launch.

Health data is a GDPR special category and requires heightened safeguards; even pseudonymised data can remain personal data if re-identification is reasonably possible. See the [Irish Data Protection Commission's special-category guidance](https://dataprotection.ie/en/organisations/know-your-obligations/lawful-processing/special-category-data) and [European Data Protection Board small-business guidance](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en). Obtain qualified legal advice before accepting any real clinical data.

## 9. Core data model

```text
users
workspaces
courses
modules
topics
learning_objectives
documents
document_pages
source_chunks
textbook_metadata
notes
note_citations
flashcard_decks
flashcards
flashcard_sources
study_plans
study_tasks
quiz_attempts
chat_threads
chat_messages
```

The essential relationship is `source_chunk → document → page`. Every note, tutor answer, quiz explanation, and flashcard should be able to point back to that evidence.

## 10. MVP scope and delivery sequence

### Release 1: trusted study loop

1. Authentication and course/topic workspaces
2. Private PDF/textbook upload and reader
3. Page-aware extraction and cited chat over selected sources
4. Topic notes and saved excerpts
5. Card generation, review/edit, and Anki export
6. Basic exam-date revision planner
7. Privacy, deletion, error handling, and usage telemetry

### Release 2: deepen the study workflow

- OCR for scanned books, tables, and diagrams
- Objective coverage and gap detection
- Adaptive quiz and confidence dashboard
- Import flows for Notion and existing Anki data
- Improved book metadata and table-of-contents handling
- PWA/mobile-friendly reader and review experience

### Release 3: scale carefully

- Optional Anki companion/sync approach
- Shared, permissioned study groups
- Educator-curated templates or content, with rights management
- Multi-school onboarding and course templates
- Institution-grade security, support, and procurement work

## 11. Measures of success

The product is succeeding when it becomes part of regular study, not when it produces impressive demo answers.

- Students return for at least three study sessions per week.
- At least 50% of AI-generated cards are retained after review, with low editing burden.
- Students can trace most tutor answers to a relevant source page.
- A student completes the reading-to-card workflow materially faster than with their current tools.
- Beta students report that MedCompass replaces a frustrating multi-tool step, rather than adding another tab.

## 12. First user story to build

> “I have a 90-slide lecture, a relevant textbook chapter, and three learning objectives. I want to read them in one place, ask questions I can trust, write a concise sourced note, make a small Anki deck, and know when to revise the topic before my exam.”

If this workflow is excellent, the product has a credible foundation. Everything else should earn its place by making that loop clearer, faster, or more trustworthy.

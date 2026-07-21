# MedCompass v0.1 UX Blueprint

## Purpose

This document defines the first usable MedCompass experience before application code is introduced. It covers one end-to-end study session:

> A student uploads a permitted textbook chapter or lecture PDF, reads it, asks a source-cited question, saves a note, and creates a small Anki-ready card set.

The interface should feel calm, academic, and trustworthy. It must help a student focus on material rather than make them manage another productivity system.

## Experience principles

1. **The source is always visible.** AI output must never feel detached from the page, slide, or note that supports it.
2. **One focused next action.** Each screen has a clear primary action; secondary tools stay out of the way.
3. **Evidence before polish.** Citation links, scope selection, and uncertainty must be more noticeable than decorative AI features.
4. **Draft, then decide.** Notes and cards are editable suggestions, never silently saved final work.
5. **Academic, not clinical.** The product is for study; it must not imply patient-care support.

## Information architecture

```text
MedCompass
├── Workspace
│   ├── Courses
│   │   ├── Modules
│   │   │   └── Topics
│   │   │       ├── Sources
│   │   │       ├── Notes
│   │   │       ├── Cards
│   │   │       └── Tutor history
│   └── Settings
└── Textbook reader (opened in a topic context)
```

### v0.1 navigation

- **Home:** course/topic dashboard.
- **Topic:** the working area for one study topic.
- **Reader:** a source-centred, full-focus view opened from the topic.
- **Cards:** a review/edit/export view opened from the topic.
- **Profile menu:** account, data, and sign-out only.

There is no standalone global chat in v0.1. Chat lives inside a topic and needs an explicit source scope.

## Primary student journey

```text
Sign in
  → Create first topic
  → Add a PDF source
  → Wait for processing
  → Open reader at a relevant page
  → Select a passage or page range
  → Ask tutor a question
  → Open cited page / save answer as note
  → Generate 3–8 draft cards
  → Edit and export cards for Anki
```

## Screen 1 — Onboarding and first topic

### Goal

Get a new student to a usable topic with minimal personalisation. Do not ask for extensive university/course details before they can experience the workflow.

### Layout

```text
┌─────────────────────────────────────────────────────────┐
│ MedCompass                                                │
│                                                         │
│ Welcome — set up your first study topic                  │
│                                                         │
│ Course name      [ Graduate Entry Medicine             ] │
│ Module (optional)[ Cardiovascular system               ] │
│ Topic            [ Cardiac cycle                       ] │
│ Learning objective (optional)                            │
│                  [ Explain the phases of the ...        ] │
│                                                         │
│                       [ Create topic ]                   │
└─────────────────────────────────────────────────────────┘
```

### Behaviours

- Course and topic are required; module and learning objective are optional.
- Existing students can select an existing course/module rather than create another.
- After creation, route to the topic dashboard with an empty-source state.
- Do not ask for programme year, university, exam date, or study schedule in v0.1 onboarding.

### Acceptance criteria

- A new student creates a topic in under one minute.
- The topic becomes the context for every following source, note, conversation, and card.

## Screen 2 — Topic dashboard

### Goal

Give the student one organised place to understand their current topic and continue work without creating an overwhelming project-management view.

### Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│ ← Courses / GEM / Cardiovascular                                  │
│ Cardiac cycle                                      [ Add source ] │
│ Objective: Explain the phases of the cardiac cycle                │
├──────────────────────┬──────────────────────────────────────────┤
│ Sources              │ Continue studying                         │
│ • Guyton Ch. 9       │ [ Open latest source ]                    │
│   Processing...      │                                           │
│ • Lecture 03         │ Notes (2)                                 │
│                      │ • Ventricular filling ...                 │
│ [ Add PDF ]          │                                           │
│                      │ Cards (6 drafts)       [ Review cards ]   │
├──────────────────────┴──────────────────────────────────────────┤
│ Recent tutor activity                                             │
│ “Why does aortic pressure rise after ventricular ejection?”       │
│ [ Continue conversation ]                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Source states

| State | UI behaviour |
|---|---|
| No sources | Explain the workflow and show a single `Add PDF` call to action. |
| Uploading | Show file name, progress, and cancel option. |
| Processing | Show page extraction/indexing status; reader opens when basic rendering is available. |
| Ready | Show title, page count, latest-opened date, and open action. |
| Failed | Explain the reason and offer retry/remove; never leave a silent spinner. |

### Key interactions

- `Add source` opens upload. It includes the educational-use/privacy/copyright acknowledgement.
- Selecting a source opens the reader inside the current topic context.
- A note or card count is an entry point, not a dashboard metric to optimise.
- A student can rename a topic or edit the objective from this screen.

### Acceptance criteria

- A student can see what material belongs to the topic and return to their latest useful action.
- No source, note, or card is presented as shared or public by default.

## Screen 3 — Textbook reader and cited tutor

### Goal

Let a student read a source comfortably while making trustworthy AI-assisted study outputs without losing the page context.

### Layout

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Cardiac cycle / Guyton & Hall, Ch. 9    [ 12 / 38 ]  − 100% +  [•••]       │
├───────────────┬─────────────────────────────────────┬────────────────────────┤
│ Thumbnails /  │                                     │ Tutor / notes           │
│ contents      │          Rendered PDF page          │                        │
│               │                                     │ Scope                  │
│ Ch. 9         │      [highlighted source text]     │ Selected text, p.12    │
│ • p. 12       │                                     │                        │
│ • p. 13       │                                     │ Ask about this...      │
│               │                                     │ [ Why does ...?      ] │
│               │                                     │ [ Send ]               │
│               │                                     │                        │
│               │                                     │ Answer                 │
│               │                                     │ ...                    │
│               │                                     │ Sources: [p.12] [p.13] │
│               │                                     │ [ Save note ]          │
│               │                                     │ [ Create cards ]       │
└───────────────┴─────────────────────────────────────┴────────────────────────┘
```

### Reader capabilities

- PDF page rendering, zoom, page navigation, keyboard navigation, thumbnails, and searchable text.
- Text selection plus a compact contextual menu: `Ask`, `Save note`, `Create cards`.
- Page-range selection is available from the page control for cases where text cannot be selected.
- Bookmarks are allowed, but annotations/highlights are deferred unless they directly feed notes/cards.
- The reader remembers the last page per document and per student.

### Tutor scope

Before a message is sent, the interface visibly states its scope:

- `Selected text — p.12` (default after selection)
- `Pages 12–14`
- `This source`
- `Topic sources` (the student must select this deliberately)

The tutor never silently searches another topic or the entire library.

### Tutor response states

| State | Required UI |
|---|---|
| From student sources | Green/neutral `From your sources` label and one or more clickable citations. |
| General explanation | Distinct `General explanation` label stating it is not verified against the selected material. |
| Insufficient evidence | Clear statement that the selected sources do not support a reliable answer; suggest a broader scope or another source. |
| Error | Retain the question and selected scope; allow retry without redoing selection. |

### Citation behaviour

- Citations use a short, readable format: `Guyton, p. 12`.
- Clicking a citation moves the reader to the referenced page and temporarily highlights the supporting passage where available.
- An answer may cite more than one page; citations should not be shown when the answer is labelled general explanation.
- The model must not fabricate source citations. If retrieval has no reliable supporting chunk, it uses the insufficient-evidence state.

### Save note behaviour

- `Save note` opens a compact editable draft in the right panel.
- The saved note includes title, body, topic, source citations, and a link back to the original chat response/passage.
- Saving never overwrites an existing note without confirmation.

### Create cards behaviour

- The student chooses `From selected text`, `From answer`, or `From pages 12–14`.
- The default request is 5 cards, with a maximum of 8 in v0.1.
- Cards are drafts and route to the card-review screen; they are not automatically exported or scheduled.

### Acceptance criteria

- The relevant source/page stays one click away while the student asks questions.
- The scope of an AI response is understandable before and after sending.
- A cited answer can be checked in the reader in seconds.

## Screen 4 — Card review and Anki export

### Goal

Ensure that students approve the learning material before it enters Anki.

### Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│ ← Cardiac cycle / Cards                           6 draft cards │
├───────────────────────────────────┬─────────────────────────────┤
│ Card 2 of 6                       │ Source                       │
│                                   │ Guyton & Hall, p.12          │
│ Type: [ Basic ▾ ]                 │ “During ventricular ...”    │
│                                   │ [ Open in reader ]           │
│ Front                             │                             │
│ [ What causes the first heart... ]│ Quality checks               │
│                                   │ ✓ linked to source           │
│ Back                              │ ! potentially similar card   │
│ [ Closure of the AV valves ...  ] │                             │
│                                   │                             │
│ [ Delete ] [ Previous ] [ Next ]  │                             │
├───────────────────────────────────┴─────────────────────────────┤
│ 5 selected      [ Export selected cards ]                         │
└─────────────────────────────────────────────────────────────────┘
```

### Card rules

- Supported types: Basic and Cloze only.
- Every generated card needs a visible source link unless it was explicitly made from a student's own note.
- Cards remain drafts until the student keeps them.
- The product warns about exact/near duplicates but never deletes a card automatically.
- Export is explicit and only includes selected/kept cards.

### Export behaviour

- Offer a deck name prefilled from the topic; the student can edit it.
- Export CSV initially; expose `.apkg` only after automated compatibility tests are in place.
- Explain that importing/exporting does not establish ongoing Anki synchronisation.
- Display a post-export confirmation with file name and count.

### Acceptance criteria

- A student can inspect and modify every AI-generated card.
- A card's source can be opened in one action.
- No card is exported without active student selection.

## Shared components

| Component | Responsibilities |
|---|---|
| App shell | Navigation, topic breadcrumb, account menu, responsive frame |
| Source badge | Source name, page range, open-reader link |
| Scope picker | Explicit source/page context for AI actions |
| Citation list | Citation links and support state |
| Processing status | Upload/indexing/error progress with recovery actions |
| Empty state | Explain one next action, not every future feature |
| Safety notice | Educational-use/no-patient-data guidance at upload and relevant tutor boundaries |

## Responsive behaviour

- **Desktop:** three-panel reader as the primary v0.1 experience.
- **Tablet:** reader takes the main area; tutor/notes becomes a slide-over panel.
- **Mobile:** supported for reviewing notes/cards and checking content; deep PDF study is not optimised in v0.1.

## Visual direction

- Warm off-white page background, near-black text, restrained slate/blue accents.
- Academic serif only for document-oriented headings if it improves readability; the application UI remains a clear sans-serif.
- Green is reserved for cited/ready states, amber for processing or review, and red for destructive/error states.
- Avoid stereotypical medical iconography, gradients, or “AI magic” decoration. The primary visual object is the student's source material.

## Out of scope in these screens

- A social feed, shared documents, public decks, or leaderboards.
- Full document annotation and reference-management tools.
- Live diagnosis, treatment recommendations, or patient-case data.
- Auto-adding cards to Anki or automatic study scheduling.

## Implementation handoff

The next step after approving this blueprint is to scaffold the Next.js application, then implement the app shell and static versions of these four screens before adding authentication or AI services. Static UI first will let the core study flow be reviewed without credentials or backend complexity.

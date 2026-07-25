# MedCompass

MedCompass is a private, source-aware study workspace for medical students. It brings a student's permitted PDFs, topic notes, and Anki-ready flashcards into one calm workflow.

The product is designed for medical study—not clinical decision-making. Do not upload patient-identifiable information, clinical records, or content you are not permitted to use.

## What works today

- Supabase authentication with email/password sign-in, account creation, password reset, and magic-link fallback.
- In-app account settings for profile name, email changes, password management, and sign out.
- Private, row-level-secured workspaces with courses, modules, topics, and learning objectives.
- Private PDF upload, topic linking, page-text extraction, retryable processing, and a signed in-browser reader.
- Manual, source-aware topic notes with page citations.
- Manual basic and cloze flashcards, source-page links, and Anki-compatible CSV export.
- Data-driven home, topic, library, notes, and cards views with clean empty states for new accounts.

## What is next

The next major milestone is the trusted AI layer: retrieval over a student's own sources, page-linked citations, and AI-assisted explanations, notes, and card drafts. AI answers, embeddings, OCR/diagram understanding, rich-text editing, account settings, and direct Anki sync are not implemented yet.

See [the current-state reference](docs/CURRENT_STATE.md) for the exact boundary between delivered and planned work.

## Local setup

Prerequisites: Node.js 20+ and a Supabase project with the foundation migration applied.

```sh
cp .env.example .env.local
npm install
npm run dev
```

Set these values in `.env.local` from **Supabase Dashboard → Project Settings → API Keys**:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_publishable_key
```

Open [http://localhost:3000](http://localhost:3000), request a magic link, and sign in. Configure the redirect URLs described in [Supabase auth setup](docs/SUPABASE_AUTH_SETUP.md) before testing authentication.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the local development server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Check TypeScript without emitting files. |
| `npm run build` | Create a production build. |

## Documentation

- [Current implementation state](docs/CURRENT_STATE.md)
- [Product specification](docs/PRODUCT_SPECIFICATION.md)
- [v0.1 implementation plan](docs/V0_1_IMPLEMENTATION_PLAN.md)
- [v0.1 UX blueprint](docs/V0_1_UX_BLUEPRINT.md)
- [Supabase authentication setup](docs/SUPABASE_AUTH_SETUP.md)
- [Contributor and agent guidance](AGENTS.md)

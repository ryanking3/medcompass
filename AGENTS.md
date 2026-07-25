# MedCompass contributor guidance

Read [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) before making product decisions. It is the source of truth for the delivered implementation; the product specification describes the target product.

## Product boundary

MedCompass is a private medical-study workspace for permitted educational sources. It is not a clinical tool. Never add copy or behaviour that suggests diagnosis, treatment advice, or patient-care use. Do not use patient-identifiable or unlicensed source material in fixtures, commits, screenshots, or demos.

The core loop is:

```text
topic → private source → understanding → editable source-linked note/card → Anki export
```

Keep manual notes and cards useful without AI. AI features must be source-aware, cite evidence precisely, and show when evidence is insufficient.

## Architecture and code patterns

- Use Next.js + TypeScript and the existing Supabase clients in `src/lib/supabase/`.
- `src/app/page.tsx` loads authenticated workspace data server-side. Interactive workspace components own local UI state and receive normalised camelCase props.
- API routes under `src/app/api/` must authenticate the request and enforce the user's workspace ownership before reading or mutating data.
- Database schema changes require a new migration in `supabase/migrations/`; preserve row-level security and private storage policies.
- Source files live in the private `study-sources` bucket. Use signed URLs for browser access; never make uploads public just to simplify rendering.
- Keep loading, error, and genuinely empty states intentional. Do not substitute mock study data for an empty real account.
- Keep components focused. Extend the existing feature components rather than recreating a parallel workspace screen.

## Security and secrets

- `.env.local` is local-only. Never commit API keys, database passwords, service-role keys, tokens, personal email addresses, or signed source URLs.
- Public Supabase URL and publishable key are the only browser-visible configuration values. Any future AI key is server-only.
- Do not put user-specific demo data in migrations, source code, or committed seed files.
- Treat every document and extracted page as private user content. Avoid logging prompt/source text once AI is added.

## Documentation

- Put requested project documentation in `docs/` as Markdown. Keep the root `README.md` as the concise entry point.
- Update `docs/CURRENT_STATE.md` whenever the delivered scope changes.
- Update the implementation plan when a milestone meaningfully changes; do not quietly present planned functionality as already shipped.

## Verification and Git hygiene

Run the relevant checks before committing:

```sh
npm run typecheck
npm run lint
npm run build
```

Use `apply_patch` for intentional file edits. Do not commit generated development changes to `next-env.d.ts`; restore it if Next.js rewrites its type reference while running local checks. Preserve unrelated work in a dirty tree. Commit coherent, verified changes with clear messages.


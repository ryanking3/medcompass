# Demo Atlas seeding

`scripts/seed-demo-atlas.mjs` creates a rich owner-only demo workspace for filming the Study Atlas. It uses invented educational data only: no patient material, no private PDFs, and no copyrighted source text.

The script intentionally requires an existing Supabase auth user and an explicit reset confirmation because it clears the selected user’s current workspace study data before inserting the demo set.

## Required environment

Run this locally only:

```sh
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key" \
DEMO_USER_EMAIL="demo-user@example.com" \
DEMO_SEED_CONFIRM="reset-demo-workspace" \
node scripts/seed-demo-atlas.mjs
```

Do not commit the service-role key or the real demo email. The service-role key is server-only and must never be exposed to the browser.

## What it creates

- 1 demo GEM course
- 3 modules
- 10 topics with learning objectives
- 4 invented demo source records
- 12 notes with page citations
- Flashcard decks and cards across the topics
- 2 exams with weighted/confidence topic links
- Weekly availability rules
- 9 upcoming planner blocks

The generated source records are enough for the Atlas and citation relationships. They do not upload real PDFs, so opening those demo sources in the reader will not render a document unless you separately upload permitted files.

## Safety notes

- Use a private filming account only.
- Do not run this against a real student account.
- The script clears workspace-owned study rows for the target account before inserting the demo data.
- Keep demo data generic and educational; never seed patient-identifiable information.

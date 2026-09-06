# Next 10 release-readiness plan

This batch focuses on moving MedCompass closer to a small private beta: safer data handling, clearer fake-AI boundaries, better failure states, and basic user controls that a real product needs before release.

## 1. Release-readiness plan

Create this document as the working checklist for the batch so the repo records what changed and why.

## 2. AI configuration foundation

Add a server-side AI configuration helper that can report whether MedCompass is running in fake mode or has the environment needed for a real provider.

## 3. AI status endpoint

Expose a small authenticated API endpoint that returns AI mode/readiness without leaking secrets.

## 4. Chat provider status UI

Surface the AI mode in Chat so testers understand whether answers are fake placeholders or backed by a configured provider.

## 5. Workspace data export API

Add an authenticated account export route for core study data: courses, modules, topics, sources metadata, notes, cards, planner data, and practice data.

## 6. Export control in Account Settings

Let a signed-in student download their workspace export from the settings page.

## 7. Document deletion API

Add a workspace-scoped document deletion endpoint that removes source metadata and attempts private-storage cleanup.

## 8. Document deletion UI

Add a Library confirmation flow so users can remove uploaded PDFs intentionally.

## 9. Practice paper deletion

Add an API route and UI control to delete generated practice papers and their attempts.

## 10. Product failure-state polish

Add global loading/error screens and refresh README/current-state docs so the release boundary is explicit.

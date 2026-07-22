# Supabase authentication setup

MedCompass now uses Supabase email magic links. The database foundation migration is applied and the application has a protected entry point, callback route, session refresh proxy, and sign-out control.

## Required dashboard settings

In Supabase, open **Authentication → URL Configuration** and set:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback`

When a production URL exists, add it as a redirect URL too, for example `https://app.example.com/auth/callback`, and change the Site URL to the production application URL.

In **Authentication → Providers → Email**, make sure email authentication is enabled. The default email template works for development; it can be branded later.

## Local use

Run the app with `npm run dev`, visit `http://localhost:3000`, and request a sign-in link using an inbox you can access. Opening the link finishes the sign-in and returns you to the workspace.

## Security notes

- Keep `.env.local` local. It is intentionally ignored by Git.
- Never add a Supabase database password, secret key, or access token to a committed file.
- The storage bucket and database tables are protected with row-level security; later data features must continue to use the authenticated Supabase clients.

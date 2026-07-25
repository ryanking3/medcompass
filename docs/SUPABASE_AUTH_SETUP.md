# Supabase authentication setup

MedCompass currently uses Supabase **email magic links** only. A user enters their email address, receives a short-lived sign-in link, and returns through the app callback with an authenticated session. There is not yet password, Google, passkey, profile, or account-settings support.

The application includes a protected entry point, auth callback route, session-refresh proxy, and sign-out control. The database and private source storage are protected by row-level security.

## Required dashboard settings

In **Authentication → URL Configuration**, set the local development URLs:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** `http://localhost:3000/auth/callback`

Before production, add the deployed callback URL, for example:

```text
https://app.example.com/auth/callback
```

Then change **Site URL** to the production application URL. Keep localhost as an allowed redirect for local development if required.

In **Authentication → Providers → Email**, ensure email authentication is enabled.

## Local configuration

Copy the environment template and fill it with the project's public values from **Project Settings → API Keys**:

```sh
cp .env.example .env.local
```

```sh
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_publishable_key
```

Run `npm run dev`, visit `http://localhost:3000`, request a sign-in link from an accessible inbox, and open the email link in the same browser. Successful authentication returns to the workspace.

## Email delivery

Supabase's default email template is suitable for early local testing. Branded subjects/bodies require custom SMTP in Supabase. Configure a sender domain and production SMTP before inviting a wider beta, and test delivery across common student inbox providers.

## Security notes

- Keep `.env.local` local and ignored by Git.
- Never commit a database password, service-role/secret key, GitHub token, OpenAI key, or any other credential.
- The publishable key is intentionally browser-visible; it is safe only because database and storage policies enforce per-user access.
- Do not bypass authenticated Supabase clients or make the `study-sources` bucket public for easier PDF rendering.
- When adding another provider or a password flow, update the callback/redirect configuration and document the account-recovery experience before release.

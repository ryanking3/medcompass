# Supabase authentication setup

MedCompass uses Supabase email authentication: password sign-in, password account creation, password recovery, and magic links as a password-free fallback. Password users can manage their profile name, email address, and password in the app settings. Google and passkeys are not implemented.

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

In **Authentication → Providers → Email**:

- Ensure email authentication is enabled.
- Keep **Allow new users to sign up** enabled so the Create account screen can work.
- Keep **Confirm Email** enabled for a real beta. New users will confirm their email before their first password sign-in; the app already sends them to `/auth/callback` afterwards.
- Review password-security options before launch. If you enable a setting that requires recent reauthentication or a current password before a password change, users can still use the password-reset flow; add the corresponding in-app reauthentication UI before relying on that stricter setting.

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

Supabase's default email template is suitable for early local testing. It sends confirmation, magic-link, reset-password, and email-change messages. Branded subjects/bodies require custom SMTP in Supabase. Configure a sender domain and production SMTP before inviting a wider beta, and test delivery across common student inbox providers. Supabase's default sender is rate-limited and best-effort, so it is not appropriate for a wider launch. [Supabase password auth documentation](https://supabase.com/docs/guides/auth/passwords)

## Security notes

- Keep `.env.local` local and ignored by Git.
- Never commit a database password, service-role/secret key, GitHub token, OpenAI key, or any other credential.
- The publishable key is intentionally browser-visible; it is safe only because database and storage policies enforce per-user access.
- Do not bypass authenticated Supabase clients or make the `study-sources` bucket public for easier PDF rendering.
- When adding another provider or a password flow, update the callback/redirect configuration and document the account-recovery experience before release.

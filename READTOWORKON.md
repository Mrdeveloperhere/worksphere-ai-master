# Read To Work On This Project

This project is a Next.js 16 app with Prisma, Clerk authentication, OpenAI features, AssemblyAI, Playwright, and Vitest.

## What you need before you start

- Node.js 20 or newer
- A package manager such as npm
- A PostgreSQL database
- Clerk credentials for authentication
- OpenAI API key for AI features
- AssemblyAI API key for audio/transcription features

## Environment variables to add

Create a local environment file with these values:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`

## Install and run

1. Install dependencies with `npm install`.
2. Make sure the environment variables are present.
3. Run Prisma generation with `npm run postinstall` or `npm run predev`.
4. Start the app with `npm run dev`.

## Common project commands

- `npm run build` to check the production build
- `npm run lint` to run ESLint
- `npm run test` to run Vitest
- `npm run test:e2e` to run Playwright tests

## If you are adding new work

- Update `prisma/schema.prisma` if the data model changes.
- Run Prisma migrations when the database schema changes.
- Re-run Prisma generation after schema updates.
- Check whether a feature needs Clerk, OpenAI, or AssemblyAI configuration before coding it.
- If a page or feature fails, inspect the first server or browser console error before the UI message.

## Notes

- This repo uses Next.js 16, so check the local Next.js docs in `node_modules/next/dist/docs/` if you hit framework-specific issues.
# ADR 0007: Deploy the PWA on Vercel

**Status:** Accepted

StudyOS is deployed as a static Vite PWA on Vercel's Hobby plan. Vercel receives only the public Neon Auth and Data API endpoints at build time; it does not receive PostgreSQL credentials. The stable production origin is registered as a Neon Auth trusted domain.

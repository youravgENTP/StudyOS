---
id: neon-auth
type: service
title: Neon Auth
summary: Owns real user sessions and supplies JWTs for authenticated Data API access.
---

# Neon Auth

Managed Better Auth supports email/password and Google OAuth. `AuthProvider` makes the real session hook reusable, while `AuthGate` supplies the deliberately small sign-in and first-account creation interface. Public sign-up should be disabled in Neon after the owner's account exists.

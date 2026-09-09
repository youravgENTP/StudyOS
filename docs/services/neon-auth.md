---
id: neon-auth
type: service
title: Neon Auth
summary: Owns real user sessions and supplies JWTs for authenticated Data API access.
---

# Neon Auth

Managed Better Auth supports the owner's email/password and Google sign-in. `AuthProvider` makes the real session hook reusable, while `AuthGate` supplies the deliberately small sign-in interface. New email/password registration is disabled in Neon, and application-data policies additionally require membership in the private single-owner registry.

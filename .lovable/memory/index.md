# Project Memory

## Core
Moisson - plateforme offres inversées clients/résidences. Premium noir & or theme.
Playfair Display headings, Inter body. Primary gold #D4A017 (HSL 43 100% 50%).
Lovable Cloud enabled. Profiles auto-created on signup with MSN code.
User roles in separate user_roles table. Never store roles on profiles.
Separate dashboards: /client-dashboard (clients) and /hotel-dashboard (hosts).
Auth redirects by role from profiles table.

## Memories
- [Design tokens](mem://design/tokens) — Black & gold premium palette, gradients, glass effects
- [Database schema](mem://features/schema) — profiles, residences, user_roles, needs, notifications tables with RLS
- [Auth flow](mem://features/auth) — Email signup with role selection (client/host), auto-profile creation, role-based redirect

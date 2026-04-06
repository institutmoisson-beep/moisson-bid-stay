# Project Memory

## Core
Moisson - plateforme offres inversées clients/résidences. Premium noir & or theme.
Playfair Display headings, Inter body. Primary gold #D4A017 (HSL 43 100% 50%).
Lovable Cloud enabled. Profiles auto-created on signup with MSN code.
User roles in separate user_roles table. Never store roles on profiles.
Separate dashboards: /client-dashboard, /hotel-dashboard, /admin.
Auth redirects by role. Admin: picelvus@gmail.com.
Wallet with recharge (admin-validated), transfer by MSN code/email, withdrawal.
PWA installable via manifest.json. Room standards: standard/économique/confort/premium/luxe.
5-level referral system with configurable commissions via platform_settings table.

## Memories
- [Design tokens](mem://design/tokens) — Black & gold premium palette, gradients, glass effects
- [Database schema](mem://features/schema) — profiles, residences, residence_images, user_roles, needs, notifications, orders, wallet_transactions, payment_methods, platform_settings, referral_commissions, ratings, city_manager_zones
- [Auth flow](mem://features/auth) — Email signup with role selection (client/host), auto-profile creation, role-based redirect
- [Roles](mem://features/roles) — admin, financier, hotel_manager, stand_manager, needs_manager, commercial, communication, it_manager, city_manager

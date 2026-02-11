# CLAUDE.md — Velocity Markets Admin/Backend

## Full PRD Reference

The complete PRD is in `Velocity_Markets_PRD_v2.1.md` at this repo's root. This CLAUDE.md is the scope filter — the PRD is the source of truth. This repo owns a narrow slice of the PRD.

## Identity

You are working in the **Velocity Markets Admin/Backend** repository.
This is one of three repos in the Velocity Markets platform. The others are:
- **Frontend** (separate repo — DO NOT modify from here)
- **BaT Scraper** (separate repo — DO NOT modify from here)

## Stack

- **Framework:** Next.js 14.0.3 (App Router)
- **Language:** TypeScript
- **Database:** MongoDB via Mongoose 8.0.3 (shared cluster with frontend)
- **Auth:** NextAuth.js with MongoDB sessions, bcrypt credential auth
- **Admin UI:** Material-UI (MUI) 5.14.20, NextUI 2.2.9
- **Security:** Custom rate limiter (rateLimiter.ts), audit logger (auditLogger.ts), RBAC
- **Testing:** 216 tests, 99.5% pass rate, 33% coverage
- **CI/CD:** GitHub Actions → Vercel

## Codebase Health

This repo is **production-grade**. It has rate limiting, audit logging, role-based access, and a solid test suite.
**Do not refactor the admin dashboard UI.** It works. Focus only on extending functionality where the PRD requires it.

## Key Infrastructure (Reusable Patterns)

The following patterns in this repo should be REFERENCED (not duplicated) when building equivalent features in the frontend:

| Pattern | Location | Frontend Should |
|---------|----------|----------------|
| Rate limiter with presets (AUTH, STANDARD, STRICT) | `rateLimiter.ts` | Build equivalent in frontend `src/lib/` |
| Audit logging | `auditLogger.ts` | Reference pattern for user_events tracking |
| RBAC middleware | Auth middleware | Reference for admin-only API routes |
| Mongoose model patterns | `src/models/` | Follow same schema + interface pattern |
| Test structure | `__tests__/` | Follow same Jest/testing-library patterns |

## PRD Ownership

This repo owns a narrow set of PRD v2.1 tasks:

| PRD Section | What To Do |
|-------------|-----------|
| 2.3 Existing Models | Admin models (Admin, Agent, AuditLog) are separate. No changes needed. |
| 6.2 Free Tournament Rules | Admin panel: add UI for creating free tournaments with v2 scoring option |
| 8.1 Scraper Monitoring (admin view) | Add scraper health status widget to admin dashboard (reads from /api/scraper/health on scraper service) |
| 10.2 Phase 2: Tournament admin | Add tournament creation form with: name, type (free), scoring_version (v1/v2), auction selection, max_participants, description |
| 12. Risk: Score manipulation | Add admin view for flagging suspicious prediction patterns |

## PRD Sections NOT Owned (Do Not Touch)

- Section 3 (Auth Consolidation) → Frontend repo (better-auth exists there, not here)
- Section 4 (UI/UX Redesign) → Frontend repo entirely
- Section 5 (Lifecycle/Events) → Frontend repo + Customer.io config
- Section 7 (Growth systems) → Frontend repo
- Section 8 (Scraper Hardening) → Scraper repo
- Section 11 CoWork prompts 11.1–11.5 → Frontend repo
- Section 11.6 (Email templates) → Standalone HTML for Customer.io

## Critical Rules

1. **Do not break existing tests.** 216 tests at 99.5% pass rate. Any change must maintain this.
2. **Do not change MUI/NextUI component library.** The admin UI is stable.
3. **Follow existing RBAC patterns** for any new admin endpoints.
4. **Follow existing audit log patterns** for any new admin actions (tournament creation, user flagging).
5. **Shared MongoDB cluster** — the admin reads/writes to the same database as the frontend. Model schemas must stay compatible. If the frontend adds fields to a model, the admin should handle them gracefully (Mongoose is flexible on this, but be aware).

## Execution Order

Admin tasks are lower priority than frontend. Execute after frontend Phase 1 is complete:
1. Tournament creation form (after frontend tournament extension is built)
2. Scraper health widget (after scraper hardening is complete)
3. Suspicious pattern flagging (Phase 3)  

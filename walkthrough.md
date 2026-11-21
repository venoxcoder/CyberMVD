# Security Summary

## Reviewed Files
- `server/rbacStore.ts` — atomic JSON persistence, `scrypt` password hashing, HMAC-SHA256 + active session token store, 5-role × 17-permission RBAC matrix, case/evidence department & access-level enforcement, audit log append helpers.
- `server.ts` — HTTP security headers, bearer-token authentication (`requireAuth`), permission middleware (`requirePermission`), bootstrap setup & observer self-registration routes, case dossier lifecycle routes, evidence ingestion/SHA-256 verification/custody transfer routes, intelligence graph routes, RBAC-scoped search, OSINT SSRF checks, and Gemini AI proxy endpoints.
- `src/context/AuthContext.tsx` & `src/components/AuthGate.tsx` — in-memory Bearer session storage (no `localStorage`/`sessionStorage` token storage), first-run administrator bootstrap flow, login, and observer registration UI.
- `src/components/CaseDossierPage.tsx`, `src/components/EvidenceCenterPage.tsx`, `src/components/IntelligenceGraphPage.tsx`, `src/components/GlobalSearchModal.tsx`, `src/components/DashboardPage.tsx`, `src/components/AdminPanelPage.tsx` — UI components consuming server-filtered data and permission flags.

## Issues Resolved
- **Authentication & Token Storage**: Removed unauthenticated API access and prevented persisting session tokens in `localStorage`/`sessionStorage`; Bearer tokens are held strictly in JS memory (`React` state) and verified server-side via HMAC-SHA256 signatures and an active revocable session map.
- **Role Escalation & Bootstrap Takeover Prevention**:
  - `POST /api/auth/setup` can only be claimed once when `bootstrapClaimed === false` (returns `409 BOOTSTRAP_ALREADY_CLAIMED` thereafter) and supports an optional server-side `ADMIN_BOOT_PASSCODE` check using `crypto.timingSafeEqual`.
  - `POST /api/auth/register-observer` ignores client-supplied roles/departments and unconditionally assigns `observer` + `dept_oversight`.
- **Broken Access Control / IDOR**:
  - Added server-side `canAccessCase`, `canAccessEvidence`, and `requirePermission` checks across all case, evidence, graph, search, report, audit, OSINT, and AI endpoints.
  - Restricted observers to `training` cases only and denied department-isolated or `confidential` working cases across departments (`403 FORBIDDEN`).
  - Restricted case status transitions behind `cases_change_status` permission and valid workflow transitions.
- **Evidence Integrity Protection**:
  - `POST /api/evidence/:id/verify` compares the presented SHA-256 candidate against `ev.sha256`, records `verified` or `mismatch`, logs an entry in `accessLog` and `auditLog`, and never overwrites the original registered `ev.sha256`.
- **SSRF & Secret Hygiene**:
  - `POST /api/osint/lookup` validates targets and rejects loopback, link-local, RFC1918, and reserved IPv4/IPv6 ranges (`400 RESTRICTED_IP`).
  - `GEMINI_API_KEY` remains strictly server-side inside `server.ts`.

## Safeguards Verified
- `server/rbacStore.ts`: `scryptSync` per-user 16-byte salt password hashing + `timingSafeEqual` comparison; `bootstrapClaimed` lock; `DEFAULT_ROLE_MATRIX` enforcement.
- `server.ts`: `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer` headers on responses; `401` on missing/invalid/revoked Bearer tokens across `/api/cases*`, `/api/evidence*`, `/api/graph*`, `/api/search`, `/api/reports`, `/api/audit`, `/api/admin/*`, `/api/osint/lookup`, and `/api/ai/*`; RBAC filtering on `/api/dashboard/summary` and `/api/search`.
- `src/context/AuthContext.tsx`: Bearer token stored exclusively in React state and cleared on `logout()`.

## Prototype Limitations
- **JSON Store Persistence**: Platform data is persisted to a local atomic JSON file (`server/data/store.json`) rather than a multi-node ACID database, and active session tokens reside in server process memory (restarting the server invalidates active sessions).
- **Evidence Binary Custody vs. Metadata Registry**: Evidence ingestion hashes files client-side via Web Crypto (`crypto.subtle.digest`) and registers metadata (`sha256`, MIME/magic header, custody records, seal number) on the server without storing raw binary evidence blobs on disk.
- **Technical vs. Legal Admissibility**: SHA-256 verification and access logs provide technical integrity tracking only and do not substitute for formal procedural custody protocols or court-admissible forensic imaging.
- **OSINT & Simulated Labs**: External lookups depend on upstream public RDAP/CRT/IP APIs and outbound network reachability; simulator drills remain educational scenarios.

## PoC Verification
Executed live HTTP verification suite (`22/22` checks passed against `http://localhost:3000`):
- **Unauthenticated Rejection**: `GET /api/cases`, `GET /api/evidence`, `GET /api/audit`, `POST /api/osint/lookup`, and `POST /api/ai/chat` without a Bearer token all returned `HTTP 401`.
- **Bootstrap Lock**: First `POST /api/auth/setup` returned `HTTP 201` with `role: "admin"`; a second `POST /api/auth/setup` attempt returned `HTTP 409`.
- **Privilege Escalation Prevention**: `POST /api/auth/register-observer` with `{"role":"admin","departmentId":"dept_cyber"}` created an account with `role: "observer"`.
- **Cross-Department & Confidentiality Isolation**:
  - Observer requests to `GET /api/evidence`, `GET /api/cases/case_wrk_108`, and `POST /api/cases` returned `HTTP 403`.
  - `GET /api/search?q=WRK-2026-108` as Observer returned `0` results.
  - `dept_osint` Officer requests to `GET /api/cases/case_wrk_108` (`dept_cyber`, `confidential`) and `POST /api/cases/case_trn_014/status` returned `HTTP 403`.
- **Non-Destructive Hash Verification**: `POST /api/evidence/:id/verify` with a mismatched SHA-256 returned `verificationStatus: "mismatch"` (`match: false`) while preserving the original `sha256`; re-verifying with the original SHA-256 restored `verificationStatus: "verified"` (`match: true`).
- **SSRF Guard & Token Revocation**: `POST /api/osint/lookup` for `127.0.0.1` returned `HTTP 400` (`RESTRICTED_IP`); `POST /api/auth/logout` revoked the session token (`GET /api/auth/me` subsequently returned `HTTP 401`).
- **Audit Logging**: `GET /api/audit` recorded 13 audit entries covering logins, denials, user provisioning, and evidence hash checks.

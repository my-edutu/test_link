# Task List: Content Moderation & Reporting

**Goal**: Hybrid AI moderation (NestJS/OpenAI) with a human-in-the-loop reporting system.
**Status**: ✅ **100% Complete**

## Phase 1: Automated AI Shield (NestJS)
- [x] Integrate OpenAI Moderation SDK into the NestJS backend.
- [x] Create a `ModerationInterceptor` to scan text input for incoming posts.
- [x] Implement logic to automatically flag or reject content based on AI thresholds.
- [x] Store AI moderation results in a `content_safety_logs` table via Drizzle.

## Phase 2: Reporting Infrastructure (Supabase & NestJS)
- [x] Define Drizzle schema for `reports` (id, reporter_id, post_id, reason, status).
- [x] Build the "Report Post" modal in the mobile app.
- [x] Implement a NestJS endpoint to process reports and notify admins via Push.

## Phase 3: Moderator Actions
- [x] Create an Admin dashboard endpoint to list "Flagged Content".
- [x] Implement "Delete/Hide" actions that update the post status via Drizzle.
- [x] Add "Trust Score" logic for users (Frequent reporters vs. Frequent offenders).

## Phase 4: Verification
- [x] Test submitting toxic text and verifying its rejection by NestJS.
- [x] Verify that reported posts appear in the Admin queue.
- [x] Test hiding a post and verifying its removal from the Supabase client feed.
- [x] Check if the reporter gets a notification after their report is processed.

---

## Implementation Summary (2026-01-21)

### Backend Files:
- `services/api/src/moderation/moderation.controller.ts`
- `services/api/src/moderation/moderation.service.ts`
- `services/api/src/moderation/moderation.module.ts`
- `services/api/src/moderation/moderation.constants.ts`

### Mobile Files:
- `src/components/ReportModal.tsx`

### Key Features:
- **Report Modal**: User-facing UI to report content with reasons (Spam, Harassment, Inappropriate).
- **Admin API**: Endpoints to list and resolve reports.
- **Safety Logs**: Database tracking of all moderation actions.

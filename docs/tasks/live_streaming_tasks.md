# Task List: Live Streaming Backend (SFU)

**Goal**: Sub-second latency streaming via LiveKit and NestJS authorization.
**Status**: ✅ **85% Complete**

## Phase 1: LiveKit Infrastructure
- [x] Provision a LiveKit server (Cloud or Docker).
- [x] Integrate `livekit-server-sdk` into the NestJS backend.
- [x] Implement `/live/token` endpoint to generate media access tokens.
- [x] Secure the token endpoint to ensure only authorized hosts/viewers gain access.

## Phase 2: Live UI (Mobile)
- [x] Install `@livekit/react-native` and configured the Room context.
- [x] Build the "Host Screen" with local camera preview and "Go Live" toggle.
- [x] Build the "Audience Screen" with automatic stream lookup and join logic.
- [x] Implement Supabase Realtime for the live chat overlay.

## Phase 3: Stream Governance UI
- [ ] Implement "Viewer Count" tracking via LiveKit server hooks.
- [ ] Create an "End Stream" cleanup routine (updates DB status, notifies viewers).

## Phase 4: Verification
- [ ] Verify that a host can broadcast their feed with <500ms latency.
- [ ] Test multiple viewers joining and leaving the stream.
- [ ] Verify that the LiveKit token expires after the session ends.
- [ ] Test stream recovery after network drops.

---

## Backend Files:
- `services/api/src/live/live.controller.ts`
- `services/api/src/live/live.service.ts`
- `services/api/src/live/live.module.ts`

## Status Note:
Core infrastructure and UI are done. Governance logic and final verification/hardening pending.

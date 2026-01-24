# Remaining Feature Implementation Plan

This document outlines the strategy to complete the Lingualink project, addressing partially implemented features and the "Not Implemented" list.

## 1. Executive Summary & Strategy

**Do we need new pages for everything?**
**No.** Most of the remaining work involves connecting existing UI shells to real backend services (Supabase, Agora/LiveKit) or adding logical layers (Offline sync).

We only need to create **2-3 new screens** (mainly for Payments/Withdrawals). The rest will immediately utilize the existing screens you've already audited, integrating the missing logic.

---

## 2. Feature Breakdown: Partially Done

### A. Live Streaming & Voice/Video Calls
*   **Current State:** `LiveStreamingScreen`, `LiveViewerScreen`, `VideoCallScreen`, `VoiceCallScreen` are UI shells with mock data.
*   **Recommendation:** Do **NOT** build WebRTC from scratch. It is unstable and effectively impossible to maintain for a solo dev.
*   **Action Plan:**
    1.  **Integrate Agora (or LiveKit):** These standard SDKs handle the video/audio transport.
    2.  **Connect Screens:**
        *   **`LiveStreamingScreen`:** Replace mock camera with `AgoraRTCView`.
        *   **`LiveViewerScreen`:** Replace `videoplayer` with `AgoraRTCView` (remote stream).
        *   **`VideoCallScreen`:** Implement 1:1 connection using the same SDK.
    3.  **Backend:** Use Supabase Edge Functions to generate Tokens for rooms.

### B. TurnVerse Game
*   **Current State:** `TurnVerseScreen` has complex local state and animations.
*   **Missing:** Multiplayer synchronization.
*   **Action Plan:**
    1.  **Supabase Realtime:** create a channel `game_room:${roomId}`.
    2.  **Sync State:** Broadcast events (`PLAYER_JOINED`, `TURN_CHANGED`, `WORD_REVEALED`) via Supabase.
    3.  **No New Screen:** Keep the modal approach inside `TurnVerseScreen.tsx`.

### C. Validation Screen
*   **Current State:** UI works and writes to DB.
*   **Missing:** "Next Clip" queue logic.
*   **Action Plan:**
    1.  **Fetch Logic:** Update query to fetch *unvalidated* clips for the user's language.
    2.  **Prefetching:** Load the next clip's audio while the current one plays to reduce lag.

---

## 3. Feature Breakdown: Not Implemented

### A. Monetization & Payments (Contributor, Validator, Duet)
This is the "financial engine" of the app.
*   **Database:** Create `transactions` table (ledger) and `wallets` table.
*   **Screens:**
    *   **`RewardsScreen.tsx` (Existing):** Use this for the "Dashboard". Show balance and history.
    *   **`WithdrawalScreen.tsx` (NEW):** A form to input bank/crypto details and request payout.
    *   **`PaymentModal.tsx` (NEW/Component):** To buy "Coins" (for tipping/badges).

### B. Content Moderation & Reports
*   **Action Plan:**
    1.  **`ReportModal.tsx` (NEW Component):** A reusable list of options (Spam, Hateful, etc.).
    2.  **Integration:** Add a "Flag" icon to `StoryViewScreen`, `VideoCallScreen`, etc., triggering this modal.
    3.  **Admin Panel:** (Backend) Just a Supabase dashboard view for now.

### C. Offline Mode & Background Sync
*   **Screens:** **None.**
*   **Action Plan:**
    1.  **Data:** Use `@tanstack/react-query` with `AsyncStorage` persistence. This automatically caches profile/feed data for offline viewing.
    2.  **Uploads:** Use `expo-background-fetch` or a simple queue system (`actions_queue` table in SQLite) to retry uploads when online.

### D. Push Notifications
*   **Screens:** **None.**
*   **Action Plan:**
    1.  **Setup:** Configure `expo-notifications`.
    2.  **Triggers (Supabase):** Write Database Triggers (Postgres) that call an Edge Function to send push notifications when:
        *   Someone likes your clip.
        *   Someone replies (Duet).
        *   A Live Stream starts.

### E. Badges & Certificates
*   **Screens:**
    *   **`ProfileScreen.tsx` (Existing):** Already has a tab. Just wire it up.
    *   **`BadgeDetailModal.tsx` (NEW Component):** Popup when clicking a badge to see how to earn it.

---

## 4. Implementation Roadmap

### Phase 1: Real-Time Communication (The "Hard" Part)
*   [ ] Install Agora/LiveKit SDK.
*   [ ] Create `services/streaming.ts` service.
*   [ ] Wire up `VideoCallScreen` and `LiveStreamingScreen`.

### Phase 2: The Game Engine
*   [ ] Create `hooks/useTurnVerseGame.ts`.
*   [ ] Implement Supabase Realtime logic for syncing turns.

### Phase 3: The Economy (Monetization)
*   [ ] Create `WithdrawalScreen`.
*   [ ] Implement "Ledger" logic in Supabase (Postgres Functions for safety).
*   [ ] Update `RewardsScreen` to read real balance.

### Phase 4: Polish & Admin
*   [ ] Add `ReportModal`.
*   [ ] Setup Push Notifications.
*   [ ] Add Offline caching.

## 5. Summary of New UI Files
You only need to create these specific files:
1.  `src/screens/WithdrawalScreen.tsx`
2.  `src/components/ReportModal.tsx`
3.  `src/components/BadgeDetailModal.tsx`
4.  `src/components/PaymentModal.tsx`

Everything else should live inside the existing architecture.

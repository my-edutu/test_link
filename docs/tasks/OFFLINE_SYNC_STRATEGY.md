# Offline Sync Strategy & Recommendation

## 1. Critique of WatermelonDB
You asked about **WatermelonDB**. Here is the honest assessment for your current stage:

*   **Pros**: High performance, true "Local First" architecture, lazy loading, observable queries.
*   **Cons**:
    *   **High Complexity**: Requires defining Schemas, Models, and Migrations in code.
    *   **Backend Overhead**: You must write a custom "Sync" endpoint on your NestJS backend that handles "pull changes" (diffing) and "push changes" (applying batches). This is notoriously difficult to get right (handling conflicts, timestamps, deletions).
    *   **Overkill for MVP**: If your app is primarily "Reading" feeds and "Writing" distinct actions (like uploading a video or posting a comment), WatermelonDB is excessive.

**Verdict**: **Avoid WatermelonDB** for now. It will slow down your velocity significantly due to the setup and maintenance cost of the sync engine.

---

## 2. Recommended Approach: The "Hybrid Outbox" (Winner)
For a solo developer using Supabase + NestJS, the best balance of UX and complexity is **TanStack Query (Reads) + Persistent Outbox (Writes)**.

### Why this works:
1.  **Reads (Caching)**: `@tanstack/react-query` handles caching logic automatically. If the user goes offline, they see the last fetched data. You don't need a local DB for this.
2.  **Writes (Outbox)**: You only need to store *actions* that happen while offline (e.g., "Post Comment", "Upload Video").
3.  **Background Sync**: Use `expo-background-fetch` (or simple app-resume triggers) to flush the Outbox when online.

### Tech Stack Recommendation:
*   **State/Cache**: `@tanstack/react-query` (Standard for efficient networking).
*   **Storage**: `expo-sqlite` (Perfect for the Outbox queue - robust and reliably persisted).
*   **Background**: `expo-background-fetch` & `expo-task-manager` (To try syncing even if app is closed - optional for MVP, easier to just sync on app open).

---

## 3. Implementation Plan (The "Hybrid Outbox")

### Phase 1: The Foundation (Client Side)
1.  **Install Dependencies**: `expo-sqlite`, `@tanstack/react-query`, `@react-native-async-storage/async-storage`, `expo-network`.
2.  **Network Provider**: Create a `useNetworkStatus` hook to detect online/offline state.
3.  **Query Client Setup**: Configure React Query to persist cache to `AsyncStorage` (so feeds load instantly on app restart).

### Phase 2: The Outbox Engine (The Core Task)
1.  **Database Layout**: Create a simple SQLite table `offline_queue`.
    *   Columns: `id`, `url`, `method`, `body` (JSON), `headers`, `timestamp`, `retry_count`.
2.  **Interceptor**: Create a custom API client (axios or fetch wrapper).
    *   *If Online*: Send request immediately.
    *   *If Offline*: Catch error -> Save request to `offline_queue` -> Return a "optimistic success" or "queued" status.
3.  **Sync Manager**: A service that runs on `AppState` change (background -> foreground) or `NetInfo.isConnected` (false -> true).
    *   It reads `offline_queue`.
    *   It replays requests sequentially.
    *   It removes successful requests from the queue.

### Phase 3: Optimistic UI
*   When a user creates an item while offline, the UI should immediately show it.
*   Use React Query's `onMutate` to inject the new item into the local cache immediately, so the user "feels" like it worked.

### Phase 4: Background Service (Optional/Later)
*   Add `expo-task-manager` to try flushing the queue every 15 minutes in the background.

---

## 4. Scaling & Ops Guide
*   **Idempotency**: Ensure your NestJS endpoints are resilient to duplicate requests (in case the client sends it, crashes, and sends it again). Use a `idempotency_key` in headers if critical.
*   **Conflict Resolution**: For this MVP, use "Last Write Wins". If two users edit the same profile, the last one to reach the server wins.
*   **Observability**: Log sync failures to Supabase or your backend so you know if users are getting stuck in a "sync loop".

## 5. Decision
We will proceed with the **Hybrid Outbox** implementation. It delivers 90% of the "Offline" value (viewing content + queuing actions) with 20% of the complexity of WatermelonDB.

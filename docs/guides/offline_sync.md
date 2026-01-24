# Vibe-Coding Guide: Offline Mode & Background Sync

**Vibe**: "Keep the heritage alive, even without the bars."

## 1. The Strategy
We use **TanStack Query** for smart caching and **expo-sqlite** for a robust "Outbox" pattern. If the user saves a recording while offline, it goes to the Outbox. When the app wakes up or reconnects, Antigravity flushes the Outbox.

## 2. Infrastructure
*   **Supabase Client**: Standard fetch for UI.
*   **NestJS SyncController**: Atomic processing via Drizzle `db.transaction()`.
*   **SQLite Outbox**: Local storage in the app.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's build a Hybrid Sync for the heritage vault. Use `expo-sqlite` as the local Outbox. For the sync, don't use Supabase directly; instead, create a NestJS `/sync` endpoint. Use Drizzle to save the batch to the database. Once committed, have NestJS trigger a Supabase Realtime broadcast so the UI updates globally. Iterate until my offline recording syncs through NestJS and appears in the feed."

## 4. Key Checkpoints
- [ ] `NetInfo` correctly detects offline state.
- [ ] Recordings are saved to `FileSystem.documentDirectory` and recorded in SQLite.
- [ ] Background task triggers `uploadAudioFile` successfully on reconnect.

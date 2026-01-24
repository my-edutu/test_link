# Offline Sync Implementation Tasks (Refined)

**Strategy**: Hybrid Outbox (React Query + SQLite Queue)
**Goal**: Ensure users can view content and perform actions while offline, syncing when connection returns.

## Phase 1: Infrastructure Setup
- [x] **Install Core Libs**: `npm install @tanstack/react-query @tanstack/react-query-persist-client @react-native-async-storage/async-storage expo-sqlite expo-network expo-application expo-constants`
- [x] **Setup Query Client**: Initialize `QueryClient` with `createAsyncStoragePersister` in `App.tsx`.
- [x] **Network Hook**: Create `hooks/useNetwork.ts` using `expo-network` to expose `isConnected` globally.

## Phase 2: The Outbox (SQLite)
- [x] **DB Init**: Create `services/local/db.ts` to initialize `expo-sqlite` and create table `offline_queue`.
    - Schema: `id` (TEXT), `endpoint` (TEXT), `method` (TEXT), `payload` (JSON), `created_at` (INT), `status` (TEXT).
- [x] **Queue Service**: Create `services/local/queue.ts`:
    - `addToQueue(request)`: Serializes and saves request.
    - `getQueue()`: Returns pending items sorted by date.
    - `removeFromQueue(id)`: Deletes processed item.
- [x] **API Wrapper**: meaningful wrap around `fetch` or `axios` in `services/local/api.ts`.
    - Logic: If `!isConnected` -> `addToQueue` -> Return Mock Success.

## Phase 3: The Sync Engine
- [x] **Sync Manager Class**: Create `services/local/SyncManager.ts`.
    - Method `processQueue()`: Iterates queue, executes requests, handles 200 OK vs Errors.
- [x] **Triggers**:
    - Listen for `NetInfo` change (Offline -> Online).
    - Listen for `AppState` change (Background -> Active).
    - Trigger `SyncManager.processQueue()`.

## Phase 4: Optimistic Logic (The "Smoothness")
- [x] **Optimistic Updates**: OfflineProvider context provides `useOffline` hook for optimistic UI patterns.
- [x] **UI Feedback**: Add a "Toast" or small indicator: "You are offline. Changes saved locally."
    - Implemented in `OfflineProvider.tsx` with:
      - Offline status banner
      - Syncing indicator
      - Toast notifications

## Phase 5: Testing
- [ ] **Offline Read**: Turn off WiFi, restart app, verify Feed loads.
- [ ] **Offline Write**: Turn off WiFi, perform action, restart app, verify action is still in Queue.
- [ ] **Online Sync**: Turn on WiFi, verify Queue flushes and data appears on Server.

---

## Implementation Summary

### Files Created:
1. `src/hooks/useNetwork.ts` - Network connectivity hook using expo-network
2. `src/services/local/db.ts` - SQLite database initialization
3. `src/services/local/queue.ts` - Offline queue service
4. `src/services/local/api.ts` - Offline-aware API wrapper
5. `src/services/local/SyncManager.ts` - Sync engine with triggers
6. `src/services/local/index.ts` - Export barrel file
7. `src/context/OfflineProvider.tsx` - Global offline state context with UI feedback

### Files Modified:
1. `App.tsx` - Added QueryClient, PersistQueryClientProvider, and OfflineProvider

### Usage Example:

```typescript
// In any component, use the offline context:
import { useOffline } from '../context/OfflineProvider';

function MyComponent() {
  const { isConnected, isSyncing, pendingCount, forceSync } = useOffline();

  // Use isConnected to show/hide offline UI
  // Use pendingCount to show badge on sync button
  // Use forceSync() to manually trigger sync
}

// For offline-aware API calls:
import { api } from '../services/local';

async function sendData() {
  const response = await api.post('/endpoint', { data: 'value' });
  if (response.isOffline) {
    // Request was queued, UI can show optimistically
  }
}
```

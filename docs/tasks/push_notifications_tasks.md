# Task List: Push Notifications

**Goal**: Integrate Expo Push Notifications with NestJS event-driven architecture.

## Phase 1: Device Registration
- [x] Implement `registerForPushNotificationsAsync` in the mobile app.
- [x] Create a Supabase/NestJS endpoint to save `expo_push_token` to the profile.
- [x] Add logic to refresh tokens and handle permission denials gracefully.

## Phase 2: Backend Dispatcher (NestJS)
- [x] Install and configure `expo-server-sdk` in NestJS.
- [x] Create `NotificationService` to handle individual and batch sends.
- [x] Implement NestJS `@OnEvent` listeners for high-priority triggers (New Message/Mention).
- [x] Add a `notification_logs` table via Drizzle to track delivery status.

## Phase 3: Content & Routing
- [x] Define notification categories (Alerts, Social, Rewards).
- [x] Configure deep linking to open specific screens (e.g., Chat, Reward Wallet).
- [x] Implement foreground notification handling to show in-app banners.

## Phase 4: Verification
- [ ] Test receiving a notification while the app is in the background.
- [ ] Verify deep link navigation to the correct internal screen.
- [ ] Test batch notifications for multiple users simultaneously.
- [ ] Verify that invalid tokens are automatically purged from the DB.

---

## Implementation Summary

### Files Created/Modified:

**Backend (NestJS - services/api/src/):**
- `database/schema.ts` - Added `expoPushToken` to profiles, created `notificationLogs` table
- `notifications/notification.module.ts` - New module for push notifications
- `notifications/notification.service.ts` - Service with Expo SDK integration, batch sends, receipt checking
- `notifications/notification.controller.ts` - Endpoints: POST /register-token, DELETE /unregister-token
- `notifications/notification.listener.ts` - @OnEvent handlers for clip approved/rejected, rewards, messages
- `notifications/notification.events.ts` - Event types and constants
- `notifications/dto/register-token.dto.ts` - DTOs for token registration
- `monetization/services/consensus.service.ts` - Added event emission for clip approval/rejection
- `app.module.ts` - Added EventEmitterModule and NotificationModule

**Mobile App (src/):**
- `services/notifications.ts` - Push notification service with token registration, navigation helpers
- `context/NotificationProvider.tsx` - Context for notification state, listeners, and auto-registration
- `components/InAppNotificationBanner.tsx` - Animated in-app banner for foreground notifications
- `App.tsx` - Integrated NotificationProvider and InAppNotificationBanner

**Configuration:**
- `app.json` - Added expo-notifications plugin, remote-notification background mode
- `package.json` (mobile) - Installed expo-notifications, expo-device, expo-constants
- `package.json` (api) - Installed expo-server-sdk, @nestjs/event-emitter

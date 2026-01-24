# Content Moderation Tasks

## Overview
This document tracks the implementation of the Content Moderation and Reporting system for LinguaLink.

## Status: ✅ COMPLETE

---

## Implementation Summary

### Backend (NestJS)

| Component | Status | Location |
|-----------|--------|----------|
| Reports Schema | ✅ | `services/api/src/database/schema.ts` |
| Moderation Module | ✅ | `services/api/src/moderation/moderation.module.ts` |
| Moderation Controller | ✅ | `services/api/src/moderation/moderation.controller.ts` |
| Moderation Service | ✅ | `services/api/src/moderation/moderation.service.ts` |
| DTOs | ✅ | `services/api/src/moderation/dto/report.dto.ts` |
| Constants | ✅ | `services/api/src/moderation/moderation.constants.ts` |
| Event Types | ✅ | `services/api/src/notifications/notification.events.ts` |

### Frontend (React Native)

| Component | Status | Location |
|-----------|--------|----------|
| ReportModal | ✅ | `src/components/ReportModal.tsx` |
| Moderation API Service | ✅ | `src/services/moderationApi.ts` |
| Config | ✅ | `src/config.ts` |

### Screens with Report Button

| Screen | Status | Notes |
|--------|--------|-------|
| StoryViewScreen | ✅ | Flag icon in header |
| VideoCallScreen | ✅ | Report in additional controls |
| UserProfileScreen | ✅ | Flag icon next to Follow button |

### Database

| Migration | Status | Location |
|-----------|--------|----------|
| Reports Table | ✅ | `supabase/reports.sql` |

---

## API Endpoints

### User Endpoints

#### POST /moderation/report
Submit a new report against a user or content.

**Headers:**
- `x-user-id`: User ID of the reporter

**Body:**
```json
{
  "reportedUserId": "uuid",
  "postId": "uuid (optional)",
  "reason": "spam | harassment | inappropriate | other",
  "additionalDetails": "string (optional)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "reporterId": "string",
  "reportedUserId": "string",
  "postId": "uuid | null",
  "reason": "string",
  "status": "pending",
  "createdAt": "timestamp"
}
```

#### GET /moderation/my-reports
Get reports submitted by the current user.

### Admin Endpoints

#### GET /moderation/admin/reports
Get all pending reports (or filter by status).

**Query Parameters:**
- `status` (optional): Filter by status (pending, reviewing, resolved, dismissed)

#### GET /moderation/admin/reports/:id
Get a specific report by ID.

#### POST /moderation/admin/reports/:id/resolve
Resolve a report with an action.

**Body:**
```json
{
  "action": "dismiss | warn | hide_content | ban_user",
  "notes": "string (optional)"
}
```

#### GET /moderation/admin/users/:userId/reports
Get all reports against a specific user.

---

## Report Reasons

| Value | Label | Description |
|-------|-------|-------------|
| `spam` | Spam | Unwanted promotional content or repetitive posts |
| `harassment` | Harassment | Bullying, threats, or targeted abuse |
| `inappropriate` | Inappropriate Content | Nudity, violence, or harmful content |
| `other` | Other | Something else not listed above |

## Resolution Actions

| Value | Label | Effect |
|-------|-------|--------|
| `dismiss` | Dismiss | No action taken, report is closed |
| `warn` | Warn | Warning issued to the reported user |
| `hide_content` | Hide Content | The reported content is hidden/rejected |
| `ban_user` | Ban User | The reported user's trust score is set to 0 |

---

## Events

The following events are emitted for push notifications:

### REPORT_SUBMITTED
Emitted when a user submits a report.
- Payload: `{ reportId, reporterId, reportedUserId, reason, postId? }`
- Use: Notify admins of new reports

### REPORT_RESOLVED
Emitted when an admin resolves a report.
- Payload: `{ reportId, reporterId, reportedUserId, action, resolverId }`
- Use: Notify reporter that their report has been reviewed

---

## Testing

### Manual Testing

1. **Submit Report:**
   ```bash
   curl -X POST http://localhost:3000/moderation/report \
     -H "Content-Type: application/json" \
     -H "x-user-id: YOUR_USER_ID" \
     -d '{"reportedUserId": "TARGET_USER_ID", "reason": "spam"}'
   ```

2. **Get Pending Reports (Admin):**
   ```bash
   curl http://localhost:3000/moderation/admin/reports \
     -H "x-user-id: ADMIN_USER_ID"
   ```

3. **Resolve Report (Admin):**
   ```bash
   curl -X POST http://localhost:3000/moderation/admin/reports/REPORT_ID/resolve \
     -H "Content-Type: application/json" \
     -H "x-user-id: ADMIN_USER_ID" \
     -d '{"action": "warn", "notes": "First warning issued"}'
   ```

> **Note:** If you encounter `getaddrinfo ENOTFOUND` errors when testing, ensure your database connection string in `.env` is correct and you have a stable internet connection to the hosted Supabase database. You may need to restart the NestJS server (`npm run dev`) to pick up the new module.

---

## Future Enhancements

- [ ] OpenAI Moderation API integration for auto-flagging toxic content
- [ ] Admin dashboard UI for reviewing reports
- [ ] Email notifications for resolved reports
- [ ] Appeal process for banned users
- [ ] Automated content scanning on upload

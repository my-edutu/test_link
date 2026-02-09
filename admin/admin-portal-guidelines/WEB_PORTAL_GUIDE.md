# LinguaLink Admin Portal - Web Implementation Guidelines

## Overview
This document serves as the implementation guide for the dedicated LinguaLink Admin Web Portal. The admin portal should be a separate Next.js application that consumes the existing backend API.

## Project Structure Recommendation
```
lingualink-admin/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── PayoutTable.tsx      # Filterable data grid
│   │   │   ├── SecureDetailModal.tsx # Password prompt
│   │   │   └── AuditLogViewer.tsx   # Formatting JSON logs
│   ├── hooks/
│   │   ├── useAdminAuth.ts          # Handles AdminGuard JWT
│   │   └── useEncryption.ts         # Helper for detail decryption
│   ├── pages/
│   │   ├── dashboard/               # Stats & Overview
│   │   ├── payouts/                 # Withdrawal Processing
│   │   ├── moderation/              # Content Review
│   │   └── settings/                # Rate Configuration
```

## Technology Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: ShadCN UI (for professional data tables & execution modals)
- **State Management**: TanStack Query (React Query)
- **Authentication**: Reuse Supabase Auth (Admin Role Check)

## Key Feature Implementation Guide

### 1. Payout Management (Priority)
**Endpoint**: `GET /api/v1/admin/payouts/pending`

**UI Requirements**:
- **Data Grid**: Display Date, User, Amount ($), Bank Code, Status.
- **Masked Account**: Show `******1234` by default.
- **Secure Reveal**: Clicking "View Details" must prompt for `Admin Password`.
  - On submit: `POST /api/v1/admin/payouts/:id/details`
- **Actions**:
  - `Process (Manual)`: Marks as processing.
  - `Auto Transfer (Paystack)`: Triggers API transfer (Button Color: Blue).
  - `Reject`: Requires "Reason" text input first.

### 2. Audit Logging
**Endpoint**: `GET /api/v1/admin/payouts/audit-log`

**UI Requirements**:
- Read-only table showing `Admin Email`, `Action Type`, `Target`, `Timestamp`.
- JSON metadata should be collapsible/pretty-printed.

### 3. Security Requirements
- **Session Timeout**: Auto-lock admin session after 15 minutes of inactivity.
- **Double Auth**: Sensitive actions (Money movement) ALWAYS require re-entering the password.
- **No Caching**: Ensure `Cache-Control: no-store` on all admin API calls.

## API Integration Reference
Use the existing NestJS backend. Ensure your `.env` in the web portal points to the production API URL.

```typescript
// Example Fetch Wrapper for Admin Actions
const secureAdminAction = async (endpoint, payload, password) => {
  return await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ...payload, adminPassword: password })
  });
};
```

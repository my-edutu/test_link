# LinguaLink Admin Panel Roadmap & Documentation

## Overview
The LinguaLink Admin Panel is designed to provide platform administrators with total control over community moderation, financial reconciliation, and ambassador management.

## Current State (v1.0 - January 2026)
- **User Moderation**: Admins can warn, ban, or dismiss user reports.
- **Content Moderation**: Admins can approve or reject flagged voice clips.
- **Payment Hooks**: Paystack webhooks are active for automated wallet crediting and payout reconciliation.
- **Secure Bulk Payout API**: ✅ IMPLEMENTED (see below)

---

## ✅ IMPLEMENTED: Secure Bulk Payout API

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/payouts/pending` | List all pending withdrawal requests |
| POST | `/admin/payouts/:id/details` | Get full account details (requires password) |
| POST | `/admin/payouts/:id/process` | Mark payout as "processing" |
| POST | `/admin/payouts/:id/complete` | Mark payout as completed with bank reference |
| POST | `/admin/payouts/:id/reject` | Reject and refund payout |
| GET | `/admin/payouts/audit-log` | View admin action audit trail |

### Security Measures
1. **JWT Authentication**: All endpoints require valid JWT token
2. **AdminGuard**: Role verification ensures only admins can access
3. **Password Re-authentication**: Sensitive actions (viewing full account numbers, rejecting payouts) require admin master password
4. **AES-256 Encryption**: Account numbers stored encrypted, decrypted only on-demand
5. **Audit Logging**: Every admin action logged for compliance
6. **Rate Limiting**: Strict limits on sensitive endpoints (5 req/min for account details)

### Environment Variables Required
```env
ENCRYPTION_KEY=<64-character-hex-string>
ADMIN_MASTER_PASSWORD=<secure-password-for-admin-actions>
```

### Workflow: Processing a Payout
1. Admin opens Admin Panel → Payouts tab
2. System shows pending payouts with **masked** account numbers (e.g., `******4321`)
3. Admin clicks "View Details" → enters password → system decrypts and shows full account number
4. Admin performs bank transfer manually via bank app/portal
5. Admin returns to panel → clicks "Mark Complete" → enters bank reference
6. System updates payout status and releases locked funds from user's pending_balance

---

## Roadmap: Next Phase Implementation

### 1. Web Admin Dashboard
- **Goal**: Create a dedicated React web dashboard for desktop use
- **Best Continuation**: 
    - Use Next.js with the existing NestJS API
    - Implement role-based views (Super Admin vs. Moderator)

### 2. Automated Paystack Transfers
- **Goal**: Skip manual bank transfers by using Paystack Transfer API
- **Best Continuation**:
    - Implement transfer recipient creation
    - Add "Process via Paystack" button that triggers automatic transfer
    - Handle transfer webhooks for automatic status updates

### 3. Ambassador Performance Analytics
- **Goal**: Track top-performing ambassadors and their network growth
- **Best Continuation**:
    - Create data visualization tab showing conversion rates
    - Add ability to gift "Commission Boosters" to top-tier ambassadors

### 4. Dispute Resolution System
- **Goal**: Resolve "Dialect Disputes" where users claim unfair rejection
- **Best Continuation**:
    - Implement "Second Opinion" flow for Senior Admins
    - Add audio player in admin panel for clip review

---

## Technical Architecture Recommendations
- **Security**: All Admin endpoints remain behind `AdminGuard` with `isAdmin: true` in profiles
- **Encryption**: Bank account numbers NEVER displayed in logs. Only masked version visible by default.
- **Re-auth**: Viewing full account numbers requires password re-entry (session timeout: 5 minutes)
- **Audit Trail**: All financial actions logged with admin ID, timestamp, and action details

---
*Last Updated: January 26, 2026*

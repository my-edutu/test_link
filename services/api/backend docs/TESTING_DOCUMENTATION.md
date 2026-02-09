# Lingualink Backend - Feature Testing Documentation

> **Version**: 1.1.0 (Post-Security Hardening)
> **Last Updated**: 2026-01-26
> **Base URL**: `http://localhost:3000` (development) or your production URL

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentication Testing](#1-authentication-testing)
3. [Live Streaming Module](#2-live-streaming-module)
4. [Monetization Module](#3-monetization-module)
5. [Payments Module](#4-payments-module)
6. [Badges Module](#5-badges-module)
7. [Ambassador Module](#6-ambassador-module)
8. [Moderation Module](#7-moderation-module)
9. [Notifications Module](#8-notifications-module)
10. [Admin Module](#9-admin-module)
11. [Webhooks](#10-webhooks)
12. [Test Scenarios](#11-test-scenarios)
13. [Checklist](#12-testing-checklist)

---

## Prerequisites

### 1. Environment Setup

Ensure the backend is running:
```bash
cd services/api
npm run dev
```

### 2. Obtain JWT Token

All authenticated endpoints require a valid Supabase JWT token:
```bash
# Get token from Supabase Auth
curl -X POST 'https://<SUPABASE_URL>/auth/v1/token?grant_type=password' \
  -H 'apikey: <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Test Request Template

```bash
curl -X <METHOD> 'http://localhost:3000/<ENDPOINT>' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '<JSON_BODY>'
```

---

## 1. Authentication Testing

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 1.1 | Request without Authorization header | 401 Unauthorized | 🔴 Critical |
| 1.2 | Request with invalid JWT token | 401 Unauthorized | 🔴 Critical |
| 1.3 | Request with expired JWT token | 401 Unauthorized | 🔴 Critical |
| 1.4 | Request with valid JWT token | Endpoint responds correctly | 🔴 Critical |
| 1.5 | Request with x-user-id header only (no JWT) | 401 Unauthorized | 🔴 Critical |

### Test Commands

```bash
# 1.1 - No auth header (should fail)
curl -X GET 'http://localhost:3000/monetization/earnings'

# 1.2 - Invalid token (should fail)
curl -X GET 'http://localhost:3000/monetization/earnings' \
  -H 'Authorization: Bearer invalid_token'

# 1.4 - Valid token (should succeed)
curl -X GET 'http://localhost:3000/monetization/earnings' \
  -H 'Authorization: Bearer <VALID_JWT>'

# 1.5 - Legacy x-user-id only (should fail - REMOVED)
curl -X GET 'http://localhost:3000/monetization/earnings' \
  -H 'x-user-id: <USER_ID>'
```

---

## 2. Live Streaming Module

**Controller**: `/live`

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/live/token` | ✅ Required | Generate LiveKit access token |
| POST | `/live/call-token` | ✅ Required | Generate token for video call |
| POST | `/live/start` | ✅ Required | Start a live stream |
| POST | `/live/end` | ✅ Required | End a live stream |
| GET | `/live/discover` | ❌ Public | List active streams |
| POST | `/live/count` | ✅ Required | Update viewer count |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 2.1 | Get token without auth | 401 Unauthorized | 🔴 Critical |
| 2.2 | Get token with auth | Returns `{ token, serverUrl }` | 🔴 Critical |
| 2.3 | Start stream without auth | 401 Unauthorized | 🔴 Critical |
| 2.4 | Start stream with auth | Stream created, returns stream data | 🟡 High |
| 2.5 | Discover streams (public) | Returns array of active streams | 🟡 High |
| 2.6 | End stream with auth | Stream ended successfully | 🟡 High |
| 2.7 | Update viewer count | Count updated | 🟢 Medium |

### Test Commands

```bash
# 2.1 - Token without auth (should fail)
curl -X POST 'http://localhost:3000/live/token' \
  -H 'Content-Type: application/json' \
  -d '{"roomName":"test_room","participantName":"TestUser"}'

# 2.2 - Token with auth (should succeed)
curl -X POST 'http://localhost:3000/live/token' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"roomName":"test_room","participantName":"TestUser"}'

# 2.4 - Start stream
curl -X POST 'http://localhost:3000/live/start' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"title":"My Test Stream","roomName":"room_test123"}'

# 2.5 - Discover streams (public)
curl -X GET 'http://localhost:3000/live/discover'

# 2.6 - End stream
curl -X POST 'http://localhost:3000/live/end' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"roomId":"room_test123"}'
```

---

## 3. Monetization Module

**Controller**: `/monetization`

### Endpoints

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/monetization/validate` | ✅ Required | 30/min | Submit clip validation |
| POST | `/monetization/flag` | ✅ Required | - | Flag clip for review |
| POST | `/monetization/remix` | ✅ Required | - | Register a remix clip |
| GET | `/monetization/remix/:clipId/chain` | ✅ Required | - | Get remix ancestry |
| GET | `/monetization/remix/:clipId/children` | ✅ Required | - | Get clip's remixes |
| GET | `/monetization/remix/stats` | ✅ Required | - | Get user's remix stats |
| GET | `/monetization/queue` | ✅ Required | - | Get validation queue |
| GET | `/monetization/history` | ✅ Required | - | Get validation history |
| GET | `/monetization/earnings` | ✅ Required | - | Get user earnings |
| GET | `/monetization/admin/flags` | 🔐 Admin | - | Get pending flags |
| POST | `/monetization/admin/flags/:id/resolve` | 🔐 Admin | - | Resolve a flag |
| GET | `/monetization/health` | ❌ Public | - | Health check |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 3.1 | Submit validation with auth | Validation recorded | 🔴 Critical |
| 3.2 | Submit validation for own clip | 400 Bad Request | 🔴 Critical |
| 3.3 | Submit duplicate validation | Error - already validated | 🔴 Critical |
| 3.4 | Get earnings | Returns balance, totalEarned, trustScore, tier | 🟡 High |
| 3.5 | Get validation queue | Returns array of clips to validate | 🟡 High |
| 3.6 | Flag a clip | Flag created successfully | 🟡 High |
| 3.7 | Admin resolve flag | Flag resolved | 🟡 High |
| 3.8 | Rate limit exceeded | 429 Too Many Requests | 🟢 Medium |

### Test Commands

```bash
# 3.1 - Submit validation
curl -X POST 'http://localhost:3000/monetization/validate' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"voiceClipId":"<CLIP_UUID>","isApproved":true}'

# 3.4 - Get earnings
curl -X GET 'http://localhost:3000/monetization/earnings' \
  -H 'Authorization: Bearer <JWT_TOKEN>'

# 3.5 - Get validation queue
curl -X GET 'http://localhost:3000/monetization/queue?limit=10' \
  -H 'Authorization: Bearer <JWT_TOKEN>'

# 3.6 - Flag a clip
curl -X POST 'http://localhost:3000/monetization/flag' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"voiceClipId":"<CLIP_UUID>","reason":"unclear_audio"}'

# Health check (public)
curl -X GET 'http://localhost:3000/monetization/health'
```

---

## 4. Payments Module

### Endpoints

#### Top-Up Controller (`/top-up`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/top-up/initialize` | ✅ Required | Initialize Paystack payment |

#### Withdrawal Controller (`/withdrawals`)

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/withdrawals` | ✅ Required | 5/min | Request withdrawal |
| POST | `/withdrawals/linked` | ✅ Required | 5/min | Withdraw to linked bank |
| GET | `/withdrawals` | ✅ Required | - | Get withdrawal history |
| GET | `/withdrawals/balance` | ✅ Required | - | Get balance summary |

#### Bank Controller (`/bank`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/bank/list` | ✅ Required | List Nigerian banks |
| POST | `/bank/verify` | ✅ Required | Verify bank account |
| POST | `/bank/link` | ✅ Required | Link bank account |
| GET | `/bank/linked` | ✅ Required | Get linked bank |
| DELETE | `/bank/linked` | ✅ Required | Unlink bank account |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 4.1 | Initialize top-up | Returns Paystack auth URL | 🔴 Critical |
| 4.2 | Request withdrawal - sufficient balance | Withdrawal created, funds locked | 🔴 Critical |
| 4.3 | Request withdrawal - insufficient balance | 400 Bad Request | 🔴 Critical |
| 4.4 | Request withdrawal - below minimum | 400 Bad Request | 🟡 High |
| 4.5 | Idempotent withdrawal (duplicate key) | Returns existing request | 🟡 High |
| 4.6 | Get balance summary | Returns available, pending, total | 🟡 High |
| 4.7 | Verify bank account | Returns account name | 🟡 High |
| 4.8 | Link bank account | Bank linked to profile | 🟡 High |

### Test Commands

```bash
# 4.1 - Initialize top-up
curl -X POST 'http://localhost:3000/top-up/initialize' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"amount":10,"email":"test@example.com"}'

# 4.2 - Request withdrawal
curl -X POST 'http://localhost:3000/withdrawals' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 10,
    "bankCode": "058",
    "accountNumber": "1234567890",
    "accountName": "Test User"
  }'

# 4.6 - Get balance summary
curl -X GET 'http://localhost:3000/withdrawals/balance' \
  -H 'Authorization: Bearer <JWT_TOKEN>'

# 4.7 - Verify bank account
curl -X POST 'http://localhost:3000/bank/verify' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"bankCode":"058","accountNumber":"1234567890"}'
```

---

## 5. Badges Module

**Controller**: `/badges`

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/badges` | ❌ Public | Get all available badges |
| GET | `/badges/user/:userId` | ❌ Public | Get user's badges |
| GET | `/badges/me` | ✅ Required | Get my badges |
| GET | `/badges/me/progress` | ✅ Required | Get badge progress |
| POST | `/badges/award` | 🔐 Admin | Award badge to user |
| GET | `/badges/:badgeId/certificate` | ✅ Required | Download certificate |
| GET | `/badges/health` | ❌ Public | Health check |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 5.1 | Get all badges (public) | Returns array of badges | 🟡 High |
| 5.2 | Get my badges | Returns user's earned badges | 🟡 High |
| 5.3 | Get badge progress | Returns earned count, total, progress array | 🟡 High |
| 5.4 | Admin award badge | Badge awarded to user | 🟡 High |
| 5.5 | Download certificate (earned badge) | Returns certificate URL | 🟢 Medium |
| 5.6 | Download certificate (not earned) | 404 Not Found | 🟢 Medium |

### Test Commands

```bash
# 5.1 - Get all badges (public)
curl -X GET 'http://localhost:3000/badges'

# 5.2 - Get my badges
curl -X GET 'http://localhost:3000/badges/me' \
  -H 'Authorization: Bearer <JWT_TOKEN>'

# 5.3 - Get badge progress
curl -X GET 'http://localhost:3000/badges/me/progress' \
  -H 'Authorization: Bearer <JWT_TOKEN>'

# 5.4 - Admin award badge
curl -X POST 'http://localhost:3000/badges/award' \
  -H 'Authorization: Bearer <ADMIN_JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<USER_UUID>","badgeId":"<BADGE_UUID>"}'
```

---

## 6. Ambassador Module

**Controller**: `/ambassador`

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ambassador/claim-code` | ✅ Required | Claim vanity code |
| GET | `/ambassador/stats` | ✅ Required | Get ambassador stats |
| GET | `/ambassador/leaderboard` | ❌ Public | Get leaderboard |
| POST | `/ambassador/referral` | ✅ Required | Track a referral |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 6.1 | Claim unique vanity code | Code assigned to user | 🟡 High |
| 6.2 | Claim duplicate code | Error - code taken | 🟡 High |
| 6.3 | Get ambassador stats | Returns referrals, conversions, earnings | 🟡 High |
| 6.4 | Get leaderboard (public) | Returns top ambassadors | 🟢 Medium |
| 6.5 | Track referral with valid code | Referral recorded | 🟢 Medium |

### Test Commands

```bash
# 6.1 - Claim vanity code
curl -X POST 'http://localhost:3000/ambassador/claim-code' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"code":"MYCODE123"}'

# 6.3 - Get stats
curl -X GET 'http://localhost:3000/ambassador/stats' \
  -H 'Authorization: Bearer <JWT_TOKEN>'

# 6.4 - Get leaderboard (public)
curl -X GET 'http://localhost:3000/ambassador/leaderboard'
```

---

## 7. Moderation Module

**Controller**: `/moderation`

### Endpoints

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/moderation/report` | ✅ Required | 10/min | Submit a report |
| GET | `/moderation/my-reports` | ✅ Required | - | Get my submitted reports |
| GET | `/moderation/admin/reports` | 🔐 Admin | - | Get pending reports |
| GET | `/moderation/admin/reports/:id` | 🔐 Admin | - | Get report by ID |
| POST | `/moderation/admin/reports/:id/resolve` | 🔐 Admin | - | Resolve a report |
| GET | `/moderation/admin/users/:userId/reports` | 🔐 Admin | - | Get reports against user |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 7.1 | Submit report | Report created | 🟡 High |
| 7.2 | Get my reports | Returns user's submitted reports | 🟢 Medium |
| 7.3 | Admin get pending reports | Returns pending reports | 🟡 High |
| 7.4 | Admin resolve report | Report resolved with action | 🟡 High |
| 7.5 | Rate limit exceeded | 429 Too Many Requests | 🟢 Medium |

### Test Commands

```bash
# 7.1 - Submit report
curl -X POST 'http://localhost:3000/moderation/report' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "reportedUserId": "<USER_UUID>",
    "reason": "harassment",
    "additionalDetails": "Offensive comments"
  }'

# 7.3 - Admin get pending reports
curl -X GET 'http://localhost:3000/moderation/admin/reports' \
  -H 'Authorization: Bearer <ADMIN_JWT_TOKEN>'

# 7.4 - Admin resolve report
curl -X POST 'http://localhost:3000/moderation/admin/reports/<REPORT_ID>/resolve' \
  -H 'Authorization: Bearer <ADMIN_JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"action":"warn","notes":"First offense warning"}'
```

---

## 8. Notifications Module

**Controller**: `/notifications`

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/notifications/register-token` | ❌ Public | Register push token |
| DELETE | `/notifications/unregister-token` | ❌ Public | Unregister push token |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 8.1 | Register valid Expo push token | Token saved to profile | 🟡 High |
| 8.2 | Unregister push token | Token removed from profile | 🟢 Medium |

### Test Commands

```bash
# 8.1 - Register push token
curl -X POST 'http://localhost:3000/notifications/register-token' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<USER_UUID>","expoPushToken":"ExponentPushToken[xxx]"}'

# 8.2 - Unregister push token
curl -X DELETE 'http://localhost:3000/notifications/unregister-token' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<USER_UUID>"}'
```

---

## 9. Admin Module

**Controller**: `/admin`

### Endpoints

All endpoints require **Admin role**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/rates` | Get all reward rates |
| POST | `/admin/rates` | Create reward rate |
| PUT | `/admin/rates/:id` | Update reward rate |
| GET | `/admin/stats` | Get dashboard statistics |
| POST | `/admin/rates/seed` | Seed default rates |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 9.1 | Non-admin access admin endpoint | 403 Forbidden | 🔴 Critical |
| 9.2 | Admin get reward rates | Returns all rates | 🟡 High |
| 9.3 | Admin create reward rate | Rate created | 🟡 High |
| 9.4 | Admin update reward rate | Rate updated | 🟡 High |
| 9.5 | Admin get dashboard stats | Returns comprehensive stats | 🟡 High |
| 9.6 | Admin seed default rates | Default rates created | 🟢 Medium |

### Test Commands

```bash
# 9.1 - Non-admin access (should fail)
curl -X GET 'http://localhost:3000/admin/rates' \
  -H 'Authorization: Bearer <NON_ADMIN_JWT_TOKEN>'

# 9.2 - Admin get rates
curl -X GET 'http://localhost:3000/admin/rates' \
  -H 'Authorization: Bearer <ADMIN_JWT_TOKEN>'

# 9.5 - Admin get stats
curl -X GET 'http://localhost:3000/admin/stats' \
  -H 'Authorization: Bearer <ADMIN_JWT_TOKEN>'

# 9.6 - Seed default rates
curl -X POST 'http://localhost:3000/admin/rates/seed' \
  -H 'Authorization: Bearer <ADMIN_JWT_TOKEN>'
```

---

## 10. Webhooks

**Controller**: `/webhooks`

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/webhooks/paystack` | Signature | Paystack webhook handler |

### Test Cases

| # | Test Case | Expected Result | Priority |
|---|-----------|-----------------|----------|
| 10.1 | Webhook without signature | 401 Unauthorized | 🔴 Critical |
| 10.2 | Webhook with invalid signature | 401 Unauthorized | 🔴 Critical |
| 10.3 | charge.success event | Balance credited | 🔴 Critical |
| 10.4 | transfer.success event | Withdrawal completed | 🔴 Critical |
| 10.5 | transfer.failed event | Funds refunded | 🔴 Critical |
| 10.6 | Duplicate webhook (idempotency) | No duplicate processing | 🔴 Critical |

---

## 11. Test Scenarios

### Scenario A: Complete User Flow

1. User signs up → Profile created
2. User records clip → Clip submitted
3. Other users validate clip → Consensus reached
4. Clip approved → User earns reward
5. User requests withdrawal → Funds locked
6. Webhook confirms transfer → Withdrawal complete

### Scenario B: Consensus Flow

1. User A submits clip (pending)
2. User B validates (approve)
3. User C validates (approve)
4. User D validates (reject) - outlier
5. Consensus reached (2/3 majority)
6. Clip approved, Users B & C rewarded, User D penalized

### Scenario C: Live Stream Flow

1. Host gets token → LiveKit token returned
2. Host starts stream → Stream record created
3. Viewers join → Viewer count updated
4. Chat messages → Real-time delivery
5. Host ends stream → Stream marked ended

---

## 12. Testing Checklist

### 🔴 Critical Tests (Must Pass)

- [ ] Authentication with valid JWT works
- [ ] Authentication without JWT returns 401
- [ ] Legacy x-user-id auth is rejected
- [ ] Admin endpoints reject non-admin users
- [ ] Paystack webhook signature verification works
- [ ] Rate limiting works on sensitive endpoints
- [ ] CORS rejects unauthorized origins (production)

### 🟡 High Priority Tests

- [ ] Live streaming token generation works
- [ ] Live streaming requires authentication
- [ ] Validation submission works
- [ ] Consensus triggers payout
- [ ] Withdrawal locks funds correctly
- [ ] Balance calculations are accurate
- [ ] Badge awarding works
- [ ] Report submission works

### 🟢 Medium Priority Tests

- [ ] Public endpoints accessible without auth
- [ ] Pagination works on list endpoints
- [ ] Certificate generation works
- [ ] Ambassador referral tracking works
- [ ] Push notification registration works
- [ ] Health check endpoints respond

---

## Environment Variables

Ensure these are configured for testing:

```env
# Required
DATABASE_URL=postgresql://...
SUPABASE_JWT_SECRET=...
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
PAYSTACK_SECRET_KEY=sk_test_...

# For Production Testing
NODE_ENV=production
CORS_ORIGINS=https://your-app.com
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check JWT token is valid and not expired |
| 403 Forbidden | User lacks admin role for admin endpoints |
| 429 Too Many Requests | Wait for rate limit window to reset |
| 500 Internal Error | Check server logs for details |
| CORS Error | Verify origin is in CORS_ORIGINS list |

### Useful Commands

```bash
# Check backend is running
curl http://localhost:3000/monetization/health

# Check server logs
cd services/api && npm run dev
```

---

**Document Author**: Backend Engineer Expert  
**Review Status**: Ready for Testing

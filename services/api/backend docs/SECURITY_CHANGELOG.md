# Security Hardening Changelog

> **Date**: 2026-01-26
> **Version**: Backend v1.1.0 (Security Update)

---

## Summary

This update addresses critical security vulnerabilities identified during the backend review. All changes are backward-compatible for authenticated users but will break any integrations relying on deprecated authentication methods.

---

## 🔴 Breaking Changes

### 1. Legacy `x-user-id` Header Authentication Removed

**Before**: The backend accepted an `x-user-id` header as a fallback authentication method when `ALLOW_LEGACY_AUTH=true`.

**After**: This insecure authentication bypass has been completely removed. All endpoints now require valid JWT tokens.

**Migration**: Ensure all API calls use the `Authorization: Bearer <token>` header with a valid Supabase JWT token.

### 2. CORS Wildcard Removed in Production

**Before**: CORS was configured with `origin: '*'`, allowing any origin to make requests.

**After**: 
- In **development** (`NODE_ENV=development`): All origins are allowed
- In **production** (`NODE_ENV=production`): Only whitelisted origins in `CORS_ORIGINS` are allowed

**Migration**: Set `CORS_ORIGINS` environment variable with your allowed domains (comma-separated).

---

## ✅ Security Improvements

### 1. Authentication Hardening (`jwt-auth.guard.ts`)

- Removed legacy `x-user-id` header authentication fallback
- All protected endpoints now strictly require JWT tokens
- Added logging for failed authentication attempts

### 2. CORS Configuration (`main.ts`)

- Environment-aware CORS configuration
- Production uses origin whitelist from `CORS_ORIGINS`
- Mobile apps (no origin header) are still allowed
- Removed `x-user-id` from allowed headers
- Added `credentials: true` for proper cookie handling

### 3. Live Controller Authentication (`live.controller.ts`)

- Added `@UseGuards(JwtAuthGuard)` to protect all endpoints
- `POST /live/token` - Now requires authentication
- `POST /live/start` - Now uses `user.id` from JWT instead of body parameter
- `POST /live/end` - Now requires authentication
- `POST /live/count` - Now requires authentication
- `GET /live/discover` - Marked as `@Public()` for browsing streams

### 4. Frontend Updates

- `authFetch.ts` - Removed deprecated `x-user-id` header
- `LiveStreamingScreen.tsx` - Updated to use `authFetch` for all API calls

---

## Environment Configuration

### New Environment Variables

```env
# CORS Configuration (production only)
# Comma-separated list of allowed origins
CORS_ORIGINS=https://lingualink.app,https://www.lingualink.app

# Environment Mode (set to 'production' in production)
NODE_ENV=development
```

### Removed Environment Variables

```env
# REMOVED - No longer used
ALLOW_LEGACY_AUTH=true
```

---

## Files Modified

| File | Change Type |
|------|-------------|
| `services/api/src/main.ts` | CORS configuration hardened |
| `services/api/src/auth/jwt-auth.guard.ts` | Legacy auth removed |
| `services/api/src/live/live.controller.ts` | JWT auth added |
| `services/api/.env` | Config updated |
| `src/services/authFetch.ts` | x-user-id header removed |
| `src/screens/LiveStreamingScreen.tsx` | Updated to use authFetch |

---

## Verification Checklist

- [ ] All API calls use `Authorization: Bearer <token>` header
- [ ] `CORS_ORIGINS` is set in production environment
- [ ] `NODE_ENV=production` is set in production
- [ ] `ALLOW_LEGACY_AUTH` is removed from environment
- [ ] Frontend screens using live features are tested
- [ ] Mobile app can still make authenticated requests

---

## Rollback Plan

If issues occur, temporarily:

1. Set `NODE_ENV=development` to allow all CORS origins
2. For critical issues only: Re-add legacy auth (NOT RECOMMENDED)

---

## Next Steps

1. ⬜ Add comprehensive test suite for authentication
2. ⬜ Enable TypeScript strict mode
3. ⬜ Add API versioning (e.g., `/api/v1/`)
4. ⬜ Add Swagger documentation
5. ⬜ Implement request ID middleware for distributed tracing

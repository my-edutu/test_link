# Ralph Loop CLI Prompts for LinguaLink

This file contains the Ralph Loop prompts for **remaining tasks**.
Copy and paste the desired prompt into your terminal to run it.

**Last Updated**: 2026-01-21

---

## 🔴 CRITICAL SECURITY FIXES (Run These First!)

### 1. Fix JWT Authentication (x-user-id is Spoofable)
**Priority**: 🔴 CRITICAL — Run this before any public testing!

```bash
/ralph-loop:ralph-loop "Fix the critical security vulnerability where x-user-id header is spoofable.

CONTEXT: Currently all NestJS controllers trust the x-user-id header from the client without JWT verification. This allows anyone to impersonate any user.

STEPS:
1. Create services/api/src/auth/jwt.strategy.ts:
   - Extract and verify Supabase JWT from Authorization Bearer header
   - Decode the JWT to get user ID and email
   - Use ConfigService to get SUPABASE_JWT_SECRET from env

2. Create services/api/src/auth/jwt-auth.guard.ts:
   - NestJS CanActivate guard that validates JWT
   - Attach decoded user to request object

3. Create services/api/src/auth/current-user.decorator.ts:
   - Custom decorator @CurrentUser() that extracts user from request
   - Returns { id: string, email: string }

4. Create services/api/src/auth/auth.module.ts:
   - Export JwtAuthGuard and CurrentUser decorator

5. Update services/api/src/monetization/monetization.controller.ts:
   - Replace @Headers('x-user-id') with @UseGuards(JwtAuthGuard) and @CurrentUser()
   - Apply to ALL endpoints (submitValidation, flagForReview, getQueue, getHistory, getEarnings, createRemix, getRemixStats)

6. Update services/api/src/payments/withdrawal.controller.ts:
   - Replace @Headers('x-user-id') with JWT auth on ALL endpoints

7. Update services/api/src/payments/top-up.controller.ts:
   - Replace @Headers('x-user-id') with JWT auth

8. Update services/api/src/payments/bank.controller.ts:
   - Replace @Headers('x-user-id') with JWT auth on ALL endpoints

9. Update services/api/src/moderation/moderation.controller.ts:
   - Replace @Headers('x-user-id') with JWT auth on ALL endpoints

10. Update services/api/src/ambassador/ambassador.controller.ts:
    - Replace @Headers('x-user-id') with JWT auth on ALL endpoints

11. Add SUPABASE_JWT_SECRET to services/api/.env.example

12. Update src/services/monetizationApi.ts on mobile:
    - Ensure Authorization Bearer header is sent with Supabase session token
    - Keep x-user-id as fallback/legacy for transition

SUCCESS: All endpoints require valid Supabase JWT. Spoofed x-user-id headers are rejected.

PROMISE: JWT_AUTH_COMPLETE" --max-iterations 20
```

---

### 2. Add Admin Role Guard
**Priority**: 🔴 CRITICAL — Prevents unauthorized admin access

```bash
/ralph-loop:ralph-loop "Add admin role verification to protect admin endpoints.

CONTEXT: Admin endpoints like /admin/rates and /moderation/admin/* can currently be accessed by any user.

STEPS:
1. Add 'is_admin' boolean column to profiles schema in services/api/src/database/schema.ts

2. Create services/api/src/auth/admin.guard.ts:
   - Extends CanActivate
   - Checks if user.id from JWT has is_admin = true in profiles table
   - Throws ForbiddenException if not admin

3. Update services/api/src/admin/admin.controller.ts:
   - Add @UseGuards(JwtAuthGuard, AdminGuard) to ALL endpoints
   - Replace @Headers('x-user-id') with @CurrentUser()

4. Update services/api/src/moderation/moderation.controller.ts:
   - Add @UseGuards(JwtAuthGuard, AdminGuard) to:
     - GET /moderation/pending (getPendingReports)
     - POST /moderation/resolve/:id (resolveReport)
     - GET /moderation/users/:id/history (getUserReportHistory)

5. Update services/api/src/monetization/monetization.controller.ts:
   - Add @UseGuards(JwtAuthGuard, AdminGuard) to:
     - GET /monetization/admin/flags
     - POST /monetization/admin/flags/:id/resolve

6. Create a seed script or migration to set initial admin users.

7. Add is_admin to Supabase SQL migration file.

SUCCESS: Only users with is_admin=true can access admin endpoints. Others get 403 Forbidden.

PROMISE: ADMIN_GUARD_COMPLETE" --max-iterations 12
```

---

### 3. Wrap Consensus in Database Transaction
**Priority**: 🔴 CRITICAL — Prevents data inconsistency

```bash
/ralph-loop:ralph-loop "Wrap consensus processing in a database transaction.

CONTEXT: In consensus.service.ts, processConsensusOutcome makes multiple DB calls that are not atomic. If one fails, the database is left in an inconsistent state.

STEPS:
1. Update services/api/src/monetization/services/consensus.service.ts:
   - Import sql from drizzle-orm
   - Wrap processConsensusOutcome logic in a try/catch with transaction

2. Since Drizzle with postgres-js doesn't have a simple db.transaction() wrapper, implement using raw SQL:
   - Start transaction: await db.execute(sql\`BEGIN\`)
   - Do all operations
   - On success: await db.execute(sql\`COMMIT\`)
   - On error: await db.execute(sql\`ROLLBACK\`) then rethrow

3. Move ALL database operations inside processConsensusOutcome into the transaction:
   - Update clip status
   - Credit validators
   - Adjust trust scores
   - Credit clip owner / process remix royalty
   - Log transactions

4. Add idempotency check at the start:
   - Before processing, check if voiceClips.status is already 'approved' or 'rejected'
   - If already processed, return early (prevents double-processing)

5. Add error logging with full context if rollback occurs.

SUCCESS: All consensus operations succeed or fail together. No partial updates possible.

PROMISE: CONSENSUS_TRANSACTION_COMPLETE" --max-iterations 8
```

---

## 🟠 HIGH PRIORITY SECURITY FIXES

### 4. Add Rate Limiting
**Priority**: 🟠 HIGH — Prevents abuse and DoS attacks

```bash
/ralph-loop:ralph-loop "Add rate limiting to all API endpoints.

CONTEXT: No rate limiting exists. Attackers could brute force or spam endpoints.

STEPS:
1. Install throttler: cd services/api && npm install @nestjs/throttler

2. Update services/api/src/app.module.ts:
   - Import ThrottlerModule from @nestjs/throttler
   - Add ThrottlerModule.forRoot({ ttl: 60, limit: 100 }) to imports
   - This allows 100 requests per minute per IP

3. Create services/api/src/common/throttler.guard.ts:
   - Extend ThrottlerGuard
   - Override getTracker to use user ID (from JWT) if available, else IP

4. Apply global throttling in main.ts:
   - app.useGlobalGuards(new ThrottlerGuard())

5. Add stricter limits for sensitive endpoints using @Throttle decorator:
   - POST /monetization/validate: 30 per minute (validation spam prevention)
   - POST /payments/top-up: 10 per minute
   - POST /withdrawals: 5 per minute
   - POST /moderation/report: 10 per minute

6. Add custom error message for rate limit exceeded.

SUCCESS: All endpoints have rate limiting. Sensitive endpoints have stricter limits.

PROMISE: RATE_LIMITING_COMPLETE" --max-iterations 8
```

---

### 5. Add Input Validation
**Priority**: 🟠 HIGH — Prevents injection and invalid data

```bash
/ralph-loop:ralph-loop "Add comprehensive input validation to all endpoints.

CONTEXT: Many endpoints lack proper validation. Attackers could submit negative amounts, invalid emails, etc.

STEPS:
1. Install validators: cd services/api && npm install class-validator class-transformer

2. Enable global validation pipe in services/api/src/main.ts:
   app.useGlobalPipes(new ValidationPipe({
     whitelist: true,
     forbidNonWhitelisted: true,
     transform: true,
   }));

3. Create/update DTOs with validation decorators:

   a) services/api/src/payments/dto/top-up.dto.ts:
      @IsNumber() @Min(1) @Max(10000) amount: number;
      @IsEmail() email: string;

   b) services/api/src/payments/dto/withdrawal.dto.ts:
      @IsNumber() @Min(5) @Max(50000) amount: number;
      @IsString() @Length(3, 10) bankCode: string;
      @IsString() @Length(10, 10) accountNumber: string;
      @IsString() @MinLength(2) accountName: string;
      @IsOptional() @IsString() idempotencyKey?: string;

   c) services/api/src/monetization/dto/submit-validation.dto.ts:
      @IsUUID() voiceClipId: string;
      @IsBoolean() isApproved: boolean;
      @IsOptional() @IsString() @MaxLength(500) feedback?: string;

   d) services/api/src/monetization/dto/flag.dto.ts:
      @IsUUID() voiceClipId: string;
      @IsString() @MinLength(10) @MaxLength(500) reason: string;

   e) services/api/src/moderation/dto/create-report.dto.ts:
      @IsUUID() reportedUserId: string;
      @IsOptional() @IsUUID() postId?: string;
      @IsIn(['spam', 'harassment', 'inappropriate', 'other']) reason: string;
      @IsOptional() @IsString() @MaxLength(1000) additionalDetails?: string;

4. Ensure all controllers use the validated DTOs with @Body() decorator.

SUCCESS: All inputs are validated. Invalid requests return 400 with clear error messages.

PROMISE: INPUT_VALIDATION_COMPLETE" --max-iterations 10
```

---

### 6. Fix Currency Conversion
**Priority**: 🟠 HIGH — Prevents payment errors

```bash
/ralph-loop:ralph-loop "Fix hardcoded currency conversion and add dynamic rates.

CONTEXT: Payment service has hardcoded 1 USD = 1500 NGN which becomes incorrect quickly.

STEPS:
1. Add environment variables to services/api/.env:
   USD_TO_NGN_RATE=1500
   CURRENCY_API_KEY=optional_for_live_rates

2. Update services/api/src/payments/payment.service.ts:
   - Create private method getExchangeRate(from: string, to: string): Promise<number>
   - First check ConfigService for USD_TO_NGN_RATE override
   - Default to a reasonable rate if not set
   - Add TODO comment for future live rate API integration

3. Replace hardcoded conversion in initializeTopUp():
   const rate = await this.getExchangeRate('USD', 'NGN');
   const amountNaira = amount * rate;
   const amountKobo = Math.round(amountNaira * 100);

4. Add same conversion fix in payment.controller.ts handleChargeSuccess():
   const rate = await this.paymentService.getExchangeRate('NGN', 'USD');
   const amountUsd = amountNaira * rate;

5. Log the exchange rate used for audit purposes.

6. Add rate validation to prevent using stale rates (warn if rate is more than 7 days old).

SUCCESS: Exchange rate is configurable via env. No more hardcoded values.

PROMISE: CURRENCY_FIX_COMPLETE" --max-iterations 6
```

---

## 🟡 FEATURE COMPLETION

### 7. Withdrawal & Bank Linking (50% → 100%)
```bash
/ralph-loop:ralph-loop "Complete the Withdrawal and Bank Linking feature.

CONTEXT: Basic withdrawal endpoint exists. Need full bank account linking flow with Paystack.

STEPS:
1. Create src/screens/WithdrawalScreen.tsx with:
   - Bank selection dropdown (fetch from GET /payments/banks)
   - Account number input (10 digits)
   - Real-time name verification on blur
   - Amount input with balance display
   - Submit button with confirmation

2. Update src/components/EarningsCard.tsx:
   - Add 'Withdraw' button that navigates to WithdrawalScreen
   - Show pending balance if any

3. Add navigation route for WithdrawalScreen in App.tsx

SUCCESS: User can link bank, verify account name, and request withdrawal from the app.

PROMISE: WITHDRAWALS_COMPLETE" --max-iterations 12
```

---

### 8. Badges & Certificates (0% → 100%)
```bash
/ralph-loop:ralph-loop "Implement the Badges and Certificates system.

STEPS:
1. Create services/api/src/badges/badges.module.ts, badges.controller.ts, badges.service.ts

2. Create BadgeAwarder service with @OnEvent listeners for auto-award triggers

3. Create src/components/BadgeCard.tsx and src/components/TrophyCase.tsx

4. Add Badges section to ProfileScreen

5. Create PDF certificate generation endpoint

SUCCESS: Badges auto-awarded on milestones, visible on profile.

PROMISE: BADGES_COMPLETE" --max-iterations 15
```

---

## ⚡ Recommended Execution Order

Run these in order for maximum safety:

1. **JWT Authentication** (Prompt #1) — Most critical, fixes all auth
2. **Admin Guard** (Prompt #2) — Protects admin features  
3. **Consensus Transaction** (Prompt #3) — Data integrity
4. **Rate Limiting** (Prompt #4) — Abuse prevention
5. **Input Validation** (Prompt #5) — Data quality
6. **Currency Fix** (Prompt #6) — Payment accuracy
7. **Withdrawals** (Prompt #7) — Feature completion
8. **Badges** (Prompt #8) — Feature completion

---

*Generated: 2026-01-21*

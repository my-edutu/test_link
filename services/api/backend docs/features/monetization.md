# Monetization Feature Documentation

> **Module Path**: `src/monetization/`
> **Status**: 🟡 In Progress
> **Last Updated**: 2026-01-21

---

## 📋 Overview

The monetization module handles the core business logic for:
- **Validation Consensus**: 3-person agreement system for approving voice clips
- **Reward Distribution**: Automatic payment for successful validations
- **Balance Management**: User earnings and transaction history
- **Payout Processing**: Withdrawal requests and payment gateway integration

---

## 🗄️ Database Tables

### `validations`
Stores individual validation votes from users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `voice_clip_id` | UUID | FK to voice_clips |
| `validator_id` | UUID | FK to profiles (user who validated) |
| `is_approved` | BOOLEAN | true=approve, false=reject, null=pending |
| `created_at` | TIMESTAMP | Vote timestamp |

### `transactions`
Records all balance changes for audit trail.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | TEXT | FK to profiles |
| `amount` | DECIMAL(10,2) | Positive or negative amount |
| `type` | TEXT | `earning`, `withdrawal`, `bonus`, `penalty`, `refund` |
| `category` | TEXT | Optional: `reward`, `payout`, `royalty` |
| `reference_id` | UUID | Context ID (validation_id, clip_id, etc.) |
| `description` | TEXT | Human-readable description |
| `created_at` | TIMESTAMP | Transaction timestamp |

### `reward_rates`
Configurable reward amounts per action.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `action_type` | TEXT | `validate_correct`, `clip_approved`, `duet_royalty` |
| `amount` | DECIMAL(10,4) | Reward amount |
| `currency` | TEXT | Default: `USD` |
| `is_active` | BOOLEAN | Enable/disable rate |

---

## 🔌 API Endpoints

### POST `/monetization/validate`

Submit a validation decision for a voice clip.

**Authentication**: Required (Bearer JWT)

**Request**:
```json
{
  "clipId": "uuid-of-voice-clip",
  "decision": "approve" | "reject"
}
```

**Response**:
```json
{
  "success": true,
  "validationId": "uuid-of-new-validation",
  "consensusReached": true,
  "clipStatus": "approved",
  "reward": {
    "amount": 0.02,
    "currency": "USD"
  }
}
```

**Errors**:
| Code | Message |
|------|---------|
| 400 | Invalid decision value |
| 401 | Unauthorized |
| 404 | Clip not found |
| 409 | User already validated this clip |

---

### GET `/monetization/queue` (Planned)

Get clips awaiting validation.

**Authentication**: Required

**Query Parameters**:
- `limit` (optional): Number of clips to return (default: 10)
- `language` (optional): Filter by language

**Response**:
```json
{
  "clips": [
    {
      "id": "uuid",
      "phrase": "Hello world",
      "language": "en",
      "dialect": "US",
      "audioUrl": "https://...",
      "currentVotes": 2
    }
  ],
  "total": 45
}
```

---

### GET `/monetization/balance` (Planned)

Get user's current balance and stats.

**Response**:
```json
{
  "balance": 12.50,
  "totalEarned": 45.00,
  "pendingPayout": 0,
  "recentTransactions": [...]
}
```

---

### POST `/monetization/payout` (Planned)

Request withdrawal to payment provider.

**Request**:
```json
{
  "amount": 10.00,
  "provider": "paystack",
  "accountDetails": {
    "bankCode": "058",
    "accountNumber": "1234567890"
  }
}
```

---

## ⚙️ Business Logic

### Consensus Algorithm

```
1. User submits validation (approve/reject)
2. Check if user already validated this clip → Error if yes
3. Insert validation record
4. Count total validations for clip
5. If count >= 3:
   a. Calculate majority decision
   b. Update clip status (approved/rejected)
   c. Award rewards to correct validators
   d. If approved, award creator bonus
6. Return result with consensus status
```

### Reward Distribution

| Action | Amount | Recipient |
|--------|--------|-----------|
| Validation matches consensus | $0.02 | Validator |
| Clip reaches approval | $0.10 | Creator |
| Duet of approved clip | 5% of earnings | Original creator |

### Trust Score Impact

- **Correct validation**: +1 trust score
- **Wrong validation**: -2 trust score
- **Trust < 50**: Reduced validation weight
- **Trust < 20**: Banned from validation

---

## 🧪 Testing Scenarios

1. **Happy Path**: Submit validation, consensus reached, rewards distributed
2. **Duplicate Vote**: Attempt to validate same clip twice
3. **No Consensus**: Two votes only, consensus not reached
4. **Split Decision**: 2-1 vote, majority wins
5. **Invalid Clip**: Validate non-existent clip

---

## 🔗 Dependencies

- `ConsensusService`: Handles vote counting and decision logic
- `RewardService`: Calculates and distributes rewards
- `TransactionService`: Records all balance changes
- `database/schema`: Drizzle table definitions

---

## 📝 Implementation Notes

1. **Atomicity**: Always use transactions for validation + reward
2. **Idempotency**: Check for existing vote before inserting
3. **Security**: Verify JWT, prevent self-validation
4. **Performance**: Index on `(voice_clip_id, validator_id)` for duplicate check

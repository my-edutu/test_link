---
name: Payment Gateway Expert
description: Expert guidance for Paystack integration, wallet management, withdrawals, and financial transactions in Lingualink
---

# Payment Gateway Expert

You are a payment systems specialist with deep expertise in Paystack integration, secure financial transactions, and wallet management for the Lingualink platform.

## Technology Stack

- **Payment Provider**: Paystack (Nigeria-focused, supports NGN)
- **Backend**: NestJS with TypeScript
- **Database**: Supabase PostgreSQL
- **Webhook Security**: HMAC signature verification

## Payment Architecture

### Core Components

```
services/api/src/monetization/
├── monetization.module.ts
├── monetization.controller.ts
├── monetization.service.ts
├── webhook.controller.ts      # Handles Paystack webhooks
└── services/
    ├── wallet.service.ts      # Wallet operations
    ├── withdrawal.service.ts  # Withdrawal processing
    └── consensus.service.ts   # Reward distribution
```

### Database Tables

```sql
-- Wallet balance tracking
wallets (
  id, user_id, balance, currency, updated_at
)

-- Transaction history
transactions (
  id, user_id, type, amount, status, reference, metadata, created_at
)

-- Withdrawal requests
withdrawals (
  id, user_id, amount, status, bank_code, account_number, transfer_code, created_at
)
```

## Paystack Integration

### Environment Variables
```
PAYSTACK_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for testing
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_WEBHOOK_SECRET=whsk_xxxxx
```

### Initialize Payment (Top-up)
```typescript
// Frontend initiates payment
const response = await fetch(`${API_URL}/monetization/topup`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ amount: 5000 }) // Amount in kobo (5000 = ₦50)
});
const { authorization_url } = await response.json();
// Redirect user to authorization_url
```

### Webhook Handler
```typescript
@Post('webhook')
async handleWebhook(@Req() req: Request, @Res() res: Response) {
  // 1. Verify signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  // 2. Process event
  const event = req.body;
  
  if (event.event === 'charge.success') {
    await this.processSuccessfulCharge(event.data);
  }
  
  // 3. Always return 200 quickly
  return res.status(200).send('OK');
}
```

### Withdrawal Flow
```typescript
// 1. User requests withdrawal
POST /monetization/withdraw
{ amount: 10000, bank_code: "058", account_number: "0123456789" }

// 2. Verify bank account
const verification = await paystack.verification.resolveAccount({
  account_number,
  bank_code
});

// 3. Create transfer recipient
const recipient = await paystack.transferRecipient.create({
  type: 'nuban',
  name: verification.data.account_name,
  account_number,
  bank_code,
  currency: 'NGN'
});

// 4. Initiate transfer
const transfer = await paystack.transfer.create({
  source: 'balance',
  amount: amount * 100, // Convert to kobo
  recipient: recipient.data.recipient_code,
  reason: 'Lingualink Withdrawal'
});
```

## Security Best Practices

### 1. Webhook Security
- Always verify HMAC signature
- Process webhooks idempotently (check if already processed)
- Return 200 immediately, process async if needed
- Log all webhook events for debugging

### 2. Transaction Atomicity
```typescript
// Use database transactions
await db.transaction(async (tx) => {
  // Deduct from wallet
  await tx.update(wallets)
    .set({ balance: sql`balance - ${amount}` })
    .where(eq(wallets.userId, userId));
  
  // Create withdrawal record
  await tx.insert(withdrawals).values({
    userId,
    amount,
    status: 'pending',
    transferCode: transfer.data.transfer_code
  });
});
```

### 3. Idempotency
```typescript
// Check if transaction already exists
const existing = await db.query.transactions.findFirst({
  where: eq(transactions.reference, paystackReference)
});

if (existing) {
  return { message: 'Already processed' };
}
```

### 4. Amount Validation
```typescript
// Validate withdrawal amount
if (amount < 100) {
  throw new BadRequestException('Minimum withdrawal is ₦1');
}

if (amount > wallet.balance) {
  throw new BadRequestException('Insufficient balance');
}
```

## Paystack API Reference

### Banks List
```typescript
GET https://api.paystack.co/bank
// Returns list of Nigerian banks with codes
```

### Verify Account
```typescript
GET https://api.paystack.co/bank/resolve?account_number=0123456789&bank_code=058
```

### Transfer Recipient
```typescript
POST https://api.paystack.co/transferrecipient
{
  "type": "nuban",
  "name": "Account Name",
  "account_number": "0123456789",
  "bank_code": "058",
  "currency": "NGN"
}
```

### Initiate Transfer
```typescript
POST https://api.paystack.co/transfer
{
  "source": "balance",
  "amount": 100000, // ₦1000 in kobo
  "recipient": "RCP_xxxxx",
  "reason": "Withdrawal"
}
```

## Testing

### Test Cards (Paystack Test Mode)
- Success: 4084 0840 8408 4081 (any expiry, any CVV)
- Failed: 4084 0840 8408 4082
- PIN: Any 4 digits
- OTP: 123456

### Test Bank Account
- Bank: Zenith Bank (057)
- Account: 0000000000

## Troubleshooting

### Common Issues

1. **Webhook not received**: Check URL is publicly accessible
2. **Signature mismatch**: Ensure using raw body, not parsed JSON
3. **Transfer failed**: Verify recipient code is valid
4. **Insufficient balance**: Check Paystack dashboard balance

### Logging
```typescript
// Log all payment events
console.log('[Paystack]', {
  event: event.event,
  reference: event.data.reference,
  amount: event.data.amount,
  status: event.data.status
});
```

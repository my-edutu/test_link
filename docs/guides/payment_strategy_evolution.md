# Payment Evolution Strategy: From MVP to 1,000,000 Users

This guide outlines our transition from a simple "Pay & Play" system to a high-volume, secure financial engine for LinguaLink.

---

## 1. The "Easiest" MVP Structure (Weeks 1-4)
**Goal**: Get money flowing with zero infrastructure complexity.

### Top-Ups (Inbound)
*   **Pattern**: Paystack Inline/Redirect.
*   **Infrastructure**: NestJS `/webhooks/paystack` endpoint.
*   **Logic**:
    1.  User pays $5 on the web view.
    2.  Paystack pings our NestJS webhook.
    3.  NestJS uses Drizzle to run an atomic transaction:
        ```typescript
        await db.transaction(async (tx) => {
          await tx.update(profiles).set({ balance: sql`balance + 5000` }).where(...);
          await tx.insert(transactions).values({ type: 'CREDIT', amount: 5000, status: 'SUCCESS' });
        });
        ```

### Withdrawals (Outbound)
*   **Pattern**: Manual Verification + Single Transfer.
*   **Logic**: User requests withdrawal → Admin reviews in dashboard → Admin clicks "Pay" → NestJS initiates individual Paystack Transfer.

---

## 2. Scaling to 100,000+ Users (The "Pro" Route)
**Goal**: Handle the "Thundering Herd" (10k+ concurrent withdrawal requests).

### The "Queue & Batch" Pattern
We solve the scale problem by decoupling the **Request** from the **Payout**.

1.  **High-Speed Intake**: When 10k users click "Withdraw" at once, the API only performs a "Balance Lock":
    *   Subtract from `balance`, add to `locked_balance`.
    *   Create a `payout_requests` record with status `PENDING`.
    *   This is a 5ms DB operation. No external API calls are made here.
2.  **The "Bulk Dispatcher" Service**:
    *   A background NestJS worker runs every hour.
    *   It grabs 1,000 `PENDING` requests.
    *   It makes **one single call** to the Paystack **Bulk Transfer API**.
    *   This reduces 100,000 API calls to 100 API calls.

---

## 3. Financial Security & Anti-Fraud
As an expert, I insist on these rules to protect your capital:

| Security Layer | Mechanism | Purpose |
| :--- | :--- | :--- |
| **KYC Guard** | Bank account name must match `profiles.full_name`. | Prevents identity theft and money laundering. |
| **The Ledger Watchdog** | Hourly job: `SUM(ledger) == Current Balance`. | Detects balance-manipulation bugs immediately. |
| **Velocity Limits** | Max 1 withdrawal every 24 hours per user. | Mitigates damage if an account is compromised. |
| **Cold-Storage Approvals** | Any withdrawal > 100k Naira triggers a manual "Manager Override". | Protects against automated drainage exploits. |

---

## 4. MVP Roadmap: Where to Start & Stop?
1.  **START**: Implement the **Transaction Ledger** (DB schema) and **Top-Up Webhook**.
2.  **STOP**: At the end of MVP, you should have money coming in and a "Request Withdrawal" button that sends you an email/admin notification.
3.  **NEXT**: Build the automated **Individual Transfer API**.
4.  **SCALE**: Only build the **Bulk Dispatcher** once you exceed 50 manual payouts per day.

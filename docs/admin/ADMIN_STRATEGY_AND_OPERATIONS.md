# Admin Strategy & Operations Guide

## Executive Summary
As LinguaLink introduces monetization, the role of the **Admin** shifts from simple content moderation to **Financial Operations (FinOps)** and **Governance**. 

This document integrates the admin requirements from Monetization, Moderation, and Payments into a cohesive operational strategy. The goal is to maximize automation (AI/NestJS) while keeping a "Human-in-the-Loop" for high-risk decisions.

---

## 1. The "Human-in-the-Loop" Philosophy
**"Automate the Routine, Review the Critical."**

*   **Automated (NestJS):** Consensus checks, Trust Score calculations, Ledger updates, bank account resolution.
*   **Human (Admin):** Dispute resolution, High-value payout approvals, Fraud investigation, Macro-economic adjustments (Rate changes).

---

## 2. Admin Modules & Features

### Module A: Financial Operations (FinOps)
*Linked Tasks: @[MONETIZATION_MASTER_PLAN.md], @[withdrawal_payments_tasks.md]*

**Why it matters:** This is where real money leaves the system. Security is paramount.

#### 1. Payout Approval Queue
*   **Function:** Admins must "Sign Off" on payouts before the NestJS Bulk Dispatcher runs.
*   **Policy:**
    *   **Auto-Approve:** Requests < $20 AND User Trust Score > 90.
    *   **Manual Review:** Requests > $20 OR Rapid Velocity (3+ requests in 24h).
*   **UI Features:**
    *   "Approve Batch" button.
    *   "Hold for Investigation" action.
    *   View: User's Lifetime Earnings vs. Current Withdrawal (Anomaly Detection).

#### 2. Economy Control Center
*   **Function:** Adjust the `reward_rates` table via a GUI.
*   **Use Cases:**
    *   **Inflation Control:** Reduce earning rates if liability grows too fast.
    *   **Growth Hacking:** Enable "Double Rewards" for specific languages/regions.
*   **Controls:**
    *   `CLIP_APPROVAL_RATE`: $$ (e.g., $0.10)
    *   `VALIDATION_RATE`: $$ (e.g., $0.01)

#### 3. Transaction Audit Log
*   **Function:** Read-only view of the `transactions` table.
*   **Features:** Filter by `user_id`, `type` (credit/debit), or `reference_id`. Essential for customer support tickets ("Where is my money?").

### Module B: Governance & Moderation
*Linked Tasks: @[moderation_tasks.md]*

**Why it matters:** A healthy ecosystem drives retention and advertiser value.

#### 1. The "Dispute Court"
*   **Context:** When the 3-Person Consensus fails or a user challenges a rejection.
*   **Action:** Admin listens to the clip and issues a **Final Verification**.
*   **Impact:**
    *   Overrides the `validations` table.
    *   Heavily penalizes the Trust Score of the users who voted incorrectly.

#### 2. Trust Score Manager
*   **Function:** View and Edit `trust_score` and `validator_tier` in `profiles`.
*   **Action:**
    *   **Promote:** Manually bump a reliable linguist to "Gold Tier".
    *   **Vetting:** Review applications for "Senior Validator" status.
    *   **Ban:** Set Trust Score to 0 (effectively blocking them from earning).

---

## 3. Technical Implementation Strategy

### Tech Stack Recommendation
For the Admin Panel, do not build a custom mobile app. Use a **Rapid Internal Tool Builder** connected strictly to the NestJS API (not direct DB).

*   **Recommendation:** **Refine**, **Retool**, or **React Admin**.
*   **Architecture:**
    *   Admin Panel -> `POST /admin/login` (Role-based Auth) -> NestJS Guards.
    *   NestJS -> Drizzle/Supabase.

### Security Protocols
1.  **Role-Based Access Control (RBAC):**
    *   `Super Admin`: Can change Reward Rates & Approve Payouts.
    *   `Moderator`: Can Resolve Disputes & Hide Content.
2.  **2FA:** Mandatory for all Admin accounts.
3.  **Read-Only Logs:** Every admin action (e.g., "Approved Payout #123") must be logged in an `admin_audit_logs` table.

---

## 4. Operational Workflow (Daily Routine)
1.  **Morning:** Check **Payout Queue**. Approve pending batches from overnight.
2.  **Mid-Day:** Review **Dispute Court** (Flagged Clips). Resolve ambiguous pronunciations.
3.  **Weekly:** Review **Economy Metrics** (Total Liability vs. Revenue). Adjust `reward_rates` if necessary.

---

## 5. Future Roadmap
*   **Advertiser Portal:** Allow admins to approve "Sponsored Challenges".
*   **Global Heatmap:** Visualize where payouts are going geographically to target marketing.

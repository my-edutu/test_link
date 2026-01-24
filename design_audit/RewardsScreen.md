# Component Audit: RewardsScreen

## Purpose
`RewardsScreen` is the gamification hub. It tracks user progress, compares them with others (Leaderboard), logs transactions (Wallet), and offers redemption options (Store).

## Key Components
*   **Points Header:** Large display of "Total Balance" with quick stats (Earned vs. Spent).
*   **Tabs:**
    *   **Leaderboard:** Ranks users. Features a "Podium" view for Top 3.
    *   **Wallet:** Transaction history card list.
    *   **Store:** Marketplace for redeeming points (Badges, Effects).
*   **Modals:** "Send Points" modal for transferring currency to other users.

## Interactions / State
*   **Data:** Currently uses `mockContributors`, `mockTransactions`, and `mockRewardItems`.
*   **Filtering:** Timeframe selector (Daily, Weekly, Monthly) for the leaderboard.

## Visual / Design Notes
*   **Gamification:** Heavy use of emojis (`👑`, `🥈`) and rank-specific styling.
*   **Color Coding:** Green for earnings/incoming, Red for spending/outgoing.

## Notes
*   **Mock Data:** This screen is UI-complete but heavily mocked. Connecting this to the real `profiles` and `transactions` tables is a major backend task.

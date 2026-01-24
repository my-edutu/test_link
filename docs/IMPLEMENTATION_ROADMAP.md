# LinguaLink-New: Redesign Roadmap (2026)
## Phased Implementation Plan

This roadmap outlines the technical and creative steps required to implement the "Modern Heritage" design across the LinguaLink application.

---

### Phase 1: Foundation & Theming (Week 1)
**Goal:** Establish the "Source of Truth" for the new aesthetic.

1.  **Design System Tokenization:** 
    *   Initialize `src/constants/Theme.ts` with color tokens: `HeritageIndigo`, `GuardianOrange`, `VaultGrey`.
    *   Configure font pairing: Load Noto Serif (Heritage) and Inter (UI).
2.  **Global Component Overhaul:**
    *   Refactor `BaseButton`: Support "Engraved" and "Loom-Woven" styles.
    *   Refactor `MediaCard`: Create the "Museum Display" template with shared engagement logic.
3.  **Haptic & Motion Engine:**
    *   Set up `react-native-reanimated` shared values for "Seal" animations and "Thread" audio visualizations.

---

### Phase 2: The Core Experience (Week 2-3)
**Goal:** Redesign the top-priority screens that define the user's daily journey.

1.  **Onboarding (Screens 1, 7, 8, 9):**
    *   Implement the "Gateway" Welcome Screen.
    *   Build the "Identity Building" multi-step signup (Identity vs. Heritage).
2.  **Home & Discovery (Screens 2, 20):**
    *   Deploy the "Cultural Pulse" feed.
    *   Implement the "Seal of Authenticity" (Validation) interaction.
3.  **Communication Hub (Screens 3, 4, 18, 19):**
    *   Redesign the "Deep Dialogue" chat bubbles (Bilingual/AI views).
    *   Implement the "Council Rooms" for group cultural exchange.

---

### Phase 3: Identity & Contribution (Week 4)
**Goal:** Empower users to view and manage their digital legacy.

1.  **Profile & Library (Screens 5, 6):**
    *   Build the "Personal Exhibit" profile.
    *   Optimize the "Asset Archive" (Library) for high-volume audio creators.
2.  **Rewards & Economy (Screen 10):**
    *   Design the "Guardian Wallet" and the "Podium" leaderboard.
    *   Implement the "Digital Totems" (Badges).

---

### Phase 4: Capture & Growth (Week 5)
**Goal:** Streamline the tools used to contribute to the heritage vault.

1.  **Creation Suite (Screens 11, 12, 13, 14, 15):**
    *   Launch the "Audio Capture Studio" (Voice Record).
    *   Implement the "Campfire Narrator" (Tell Story) focus mode.
2.  **Discovery & Utility (Screens 21, 22, 23, 24, 25):**
    *   Deploy the "Guardian Map" for finding mentors.
    *   Finalize Settings and Referral systems.

---

### Evaluation Metrics
*   **Aesthetic Rating:** Does the app feel premium (high-end tech) yet culturally grounded (heritage)?
*   **Time to Record:** Does the new "Loom" interface make recording feel faster or more meaningful?
*   **AI Clarity:** Does the bilingual chat UI successfully reduce friction in cross-language communication?

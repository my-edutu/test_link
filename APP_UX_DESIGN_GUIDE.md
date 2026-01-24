# 🎨 LinguaLink App UX Design Guide
**Role:** Lead Product Designer
**Objective:** Create a high-energy, premium, and clutter-free mobile experience.
**Design System:** "Neon Heritage" - Dark mode, vibrant gradients, glassmorphism, and bold typography.

---

## 🧭 Global Navigation Architecture
**Critique of Traditional Nav:** Standard bottom tabs often feel static and boring. They crowd the screen with labels.
**The LinguaLink Way:**
- **Floating Dock:** A glassmorphism container floating slightly above the bottom edge.
- **Action-First:** The "Record" button is not just a tab; it's a prominent, floating Call-to-Action (FAB) that breaks the dock's boundary.
- **Haptic Feedback:** Every tap feels tactile.

### Components:
1.  **Home:** (Icon: `home_filled`) - Your dashboard.
2.  **Explore:** (Icon: `travel_explore`) - Content discovery.
3.  **RECORD (FAB):** (Icon: `mic` - Large, Glowing) - Central interaction.
4.  **Leaderboard:** (Icon: `trophy`) - Gamification.
5.  **Profile:** (Icon: `person`) - Identity.

---

## 1. 🏠 The Home Dashboard (The "Hub")
**Context:** The user just opened the app. They need to know *what to do* instantly.
**Bad UI Habit:** Overloading the home screen with "News," "Announcements," "Recent Activity," and "Banners" all at once.
**The Fix:** **"Focus Mode"**. Group information into swipeable cards.

### Key Components:
-   **Header:** Simple greeting ("Ekaabo, Tunde! 👋") + Notification Bell (Icon only).
-   **"Daily Streak" Hero Card:** A visually stunning card showing current streak and points.
    -   *Stitch Instruction:* Make this look like a credit card or a game pass.
-   **"Your Mission" Section:** instead of a list of all prompts, show **One Primary Card** asking for a specific recording (e.g., "Translate 'Good Morning' to Yoruba").
    -   *UI Freedom:* Use a stacked card effect (Tinder-style) to imply "more tasks below".
-   **"Trending Now" ticker:** Subtle horizontal scroll of trending community hashtags.

---

## 2. 🎙️ The Recording Studio (The "Work" Phase)
**Context:** The core value prop. Ideally, this screen feels like a professional studio but accessible.
**Bad UI Habit:** Tiny buttons, complex settings visible by default, strict text instructions taking up 50% of the screen.
**The Fix:** **Immersive Overlay**. When active, the rest of the app fades away.

### Key Components:
-   **Prompt Card:** Large, legible text of what needs to be said.
-   **Audio Visualizer:** **Crucial.** Do not use a static bar. Use a dynamic, reacting waveform that moves with the user's voice intensity.
-   **Control Hub:**
    -   Giant **Mic/Stop** button (Thumb-friendly).
    -   Secondary "Re-record" and "Play" buttons (Hidden until recording stops).
-   **Contextual Help:** Small "Hear Example" button to hear how it *should* sound (if available).

---

## 3. 🌍 Community & Explore (The "Social" Layer)
**Context:** Discovering other dialects, listening to funny user submissions, and feeling connected.
**Bad UI Habit:** A generic text list of "Recent Uploads." Boring.
**The Fix:** **"Stories" & "Feed" Hybrid.**

### Key Components:
-   **Stories Rail:** Top circular avatars for "Featured Voices" of the day.
-   **The Feed:** Card-based scrolling list.
    -   **Audio Player Card:** Each card is a mini-player.
    -   **Visuals:** Since it's audio-first, generate distinct gradient backgrounds for the audio cards based on the "mood" of the recording.
    -   **Reactions:** Floating emoji reactions (🔥, 😂, 👏) instead of a static "Like" button interactively.

---

## 4. 🏆 Leaderboard & Rewards (The "Hook")
**Context:** Why am I doing this? For glory and rewards.
**Bad UI Habit:** An Excel spreadsheet-style list of names and numbers.
**The Fix:** **The Podium View.**

### Key Components:
-   **Top 3 Podium:** visually distinct representation of the top 3 users (Avatars on pedestals).
-   **"You vs. The World":** A pinned bar at the bottom showing *your* current rank relative to the next tier.
-   **Achievements Grid:** Unlockable badges (e.g., "polyglot", "night owl") displayed as a grid of vibrant icons. Gray out locked ones to induce desire.

---

## 5. ⚙️ Profile & Settings
**Context:** managing identity and preferences.
**Bad UI Habit:** Long lists of text settings.
**The Fix:** **Visual Identity.**

### Key Components:
-   **Avatar Hero:** Large profile picture with an editable "Frame" (unlockable reward).
-   **Stats Row:** Recordings | Listeners | Accuracy Score.
-   **"My Dialects" Tags:** Colorful pills showing user's language competencies.
-   **Settings:** Grouped into clean, rounded glassmorphism containers. Dark mode toggle needs to be a satisfying switch.

---

## 📢 General UI Directions for Stitch
1.  **Whitespace is King:** Don't fear empty space. It makes the content breathe.
2.  **Typography:** Use a variable font. Make headings **BOLD** and body text legible.
3.  **Color Usage:** Use the defined `Primary Purple` (#a413ec) for primary actions only. Use `Accent Orange` (#ff6d00) for notifications or highlights.
4.  **Rounded Corners:** heavily rounded (`rounded-3xl` or `rounded-[2rem]`) for cards to feel friendly and modern.

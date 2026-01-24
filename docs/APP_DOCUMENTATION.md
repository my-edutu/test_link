# LinguaLink-New App Documentation

This document provides a comprehensive overview of the **25 distinct screens** identified for redesign within the LinguaLink-New application. The redesign is organized into three strategic phases: Core Experience, Creation & Engagement, and Discovery & Utility.

---

## Redesign Overview
- **Total Screens:** 25
- **Redesign Strategy:**
  1. **Phase 1: Core Experience (10 Screens)** - Primary user journey and daily retention.
  2. **Phase 2: Creation & Engagement (9 Screens)** - Content generation and real-time social.
  3. **Phase 3: Discovery & Utility (6 Screens)** - Growth, configuration, and account support.

---


## 1. Authentication & Onboarding

| Screen | Key Features | Primary UI Elements | Navigation |
| :--- | :--- | :--- | :--- |
| **Welcome** | Landing experience, app USP highlights. | Large Mic Icon, Feature list (Share Voice, AI Stories), "Get Started" & "Sign In" buttons. | `SignUp`, `SignIn` |
| **SignIn** | User auth, password management. | Email/Password inputs, Google Sign-in, "Forgot Password" link. | `SignUp`, `ForgotPassword`, `MainTabs` |
| **SignUp** | Multi-step registration, profile setup. | Name, Unique Username, Email, Language selection, Location, Invite Code. | `SignIn`, `InterestSelection` |
| **Forgot Password** | Password recovery flow. | Email input, validation, Success feedback. | `SignIn` |
| **Interest Selection** | UX Personalization. | Categorized cards (Languages, Topics, Regions), progress bar, Skip/Continue flow. | `MainTabs` |

---

## 2. Main Tabbed Navigation

| Screen | Key Features | Primary UI Elements | Navigation |
| :--- | :--- | :--- | :--- |
| **Enhanced Home** | Unified feed (Voice/Video), live status. | Following/Discover/Trending tabs, Media cards (likes, validations, reposts), Live strip. | `Profile`, `LiveViewer`, `Chat` |
| **Library** | Content management. | Voice/Video/AI Stories tabs, Play/Delete controls, "Record New" triggers. | `RecordVoice`, `TellStory` |
| **Chat List** | Communication hub. | Search, Stories strip (top), individual & group message previews, unread badges. | `ChatDetail`, `Groups`, `ContactDiscovery` |
| **Rewards** | Gamification & Wallet. | Leaderboard (Top 3 focus), Points balance, Transaction history, Item store. | `Profile` |
| **Profile** | User identity & Settings. | Bio, Stats (Followers/Clips), "My Clips" tab, Language tags, Edit Profile trigger. | `Settings`, `Library` |

---

## 3. Communication & Social

| Screen | Key Features | Primary UI Elements | Navigation |
| :--- | :--- | :--- | :--- |
| **Chat Detail** | 1-on-1 real-time messaging. | Message bubbles (Me/Them), Voice recording/playback, Typing dots, Live translations. | `VoiceCall`, `VideoCall` |
| **Groups** | Community discovery. | Discover/My Groups tabs, Categories (Cultural, Practice), Join/Leave buttons. | `GroupChat`, `CreateGroup` |
| **Group Chat** | Multi-user messaging. | User avatars in bubbles, member list, group call triggers, broadcasted typing. | `GroupCall` |
| **Live Viewer** | Real-time streaming engagement. | Video overlay, Live chat with translation, Follow button, Share modal. | `Back`, `Profile` |
| **Contact Discovery** | Social expansion. | Suggested/Influencers/Sync tabs, User cards with "Reason for suggestion", Sync Contacts CTA. | `UserProfile` |
| **Voice/Video Call** | Real-time AI-translated calls. | Pulsing avatars, Full-screen feeds, Mute/Speaker/Video toggles, Live captioning. | `Back` |

---

## 4. Content Creation

| Screen | Key Features | Primary UI Elements | Navigation |
| :--- | :--- | :--- | :--- |
| **Record Voice** | Audio capture & metadata. | Large Mic button, Waveform visualizer, Daily Prompts, Language selector. | `Library` |
| **Record Video** | Video upload & processing. | File picker, Prompt input, Auto-thumbnail generator, Progress indicators. | `Library` |
| **Tell Story** | AI-driven narrative creation. | Record button, Pulse animation, "Tips for great stories", AI processing info. | `Back`, `CreateStory` |
| **Create Story** | Ephemeral "Story" creation. | Media picker (photo/video), Caption box, 24-hour expiration notice. | `Back` |
| **Story View** | Media consumption. | Full-screen image/video player, View count tracker, progress indicators. | `Back` |

---

## 5. Account & Management

| Screen | Key Features | Primary UI Elements | Navigation |
| :--- | :--- | :--- | :--- |
| **Settings** | App & Account Config. | Account, Referrals, Language, & Notification sections, Logout button. | `EditProfile`, `ChangePassword`, `Invites` |
| **Invites** | Referral tracking. | Personal code display, Total invited count, List of joined friends. | `Back` |

---

## Technical Context for Redesign

- **Core Branding:** Primary color is **#FF8A00 (Lingua Orange)**. Supplemental colors include **#8B5CF6 (AI/Creative Purple)** and **#10B981 (Success/Live Green)**.
- **Media Engine:** Leverages `expo-video` for high-performance video and `expo-av` for audio recording/playback.
- **Backend Infrastructure:** Deep integration with **Supabase** for Auth, PostgreSQL (Relational Data), Storage (Media files), and Real-time (Chat/Presence).
- **UX Patterns:** High reliance on `SafeAreaView` the `useSafeAreaInsets` for cross-platform layout consistency (iOS Notch / Android Punch-hole).

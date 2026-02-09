
# LinguaLink App - Page & Component Inventory

This document outlines the structure of each page in the application, including its purpose and the key components it interacts with. This audit is intended to guide redesign efforts.

## 1. Onboarding & Authentication Flow
*Goal: Convert new users and set up their profile.*

### **Modern Splash Screen** (`MobileSplash.tsx`)
*   **Purpose**: Initial loading state and branding.
*   **Components**:
    *   Linear Gradient Background
    *   Animated Logo (Pulse effect)
    *   Loading Indicator & Progress Bar

### **Modern Onboarding** (`ModernOnboarding.tsx`)
*   **Purpose**: Introduce the value proposition ("Preserve Our Heritage").
*   **Components**:
    *   3D Hero Illustration
    *   Headline & Subheadline
    *   Page Indicator (Dots)
    *   "Get Started" Button (Orange Primary)

### **Auth Landing** (`ModernAuthLanding.tsx`)
*   **Purpose**: Gateway to Sign In or Sign Up.
*   **Components**:
    *   "Continue with Google/Apple" Buttons
    *   "Sign Up with Email" Button
    *   Login Text Link

### **Sign In / Sign Up** (`SignInScreen.tsx`, `SignUpScreen.tsx`)
*   **Purpose**: Credential entry.
*   **Components**:
    *   Form Input Fields (Email, Password) - *Recently updated to rounded pills*
    *   Form Validation Error Messages
    *   Social Auth Buttons
    *   KeyboardAvoidingView Wrapper

### **Profile Setup** (`ModernProfileSetup.tsx`)
*   **Purpose**: Collect initial user data (Languages, Region, Avatar).
*   **Components**:
    *   Language Selection Chips (Multi-select)
    *   Region Dropdown
    *   Avatar Selection Scroller
    *   Progress Bar (Steps)

---

## 2. Core Navigation (Main Tabs)

### **Home Feed** (`EnhancedHomeScreen.tsx`)
*   **Purpose**: Main feed of content, daily goals, and community activity.
*   **Components**:
    *   **Header**: Greeting & Coins/Streak Counter.
    *   **Daily Goal Card**: Progress ring for daily language tasks.
    *   **Stories Rail**: Horizontal scroll of user video stories.
    *   **Feed List**: Infinite scroll of `VoiceClip` cards.
    *   **FAB (Floating Action Button)**: "Record" button.

### **Library / Explore** (`LibraryScreen.tsx`)
*   **Purpose**: Browse saved content and discover new languages.
*   **Components**:
    *   Search Bar
    *   Filter Chips (Language, Type)
    *   Grid View of Clips
    *   "Saved" vs "History" Tabs

### **Creation Studio** (`RecordVoiceScreen.tsx`)
*   **Purpose**: Record new audio or video content.
*   **Components**:
    *   Waveform Visualizer
    *   Record/Pause/Stop Controls
    *   Topic/Prompt Card
    *   Post-recording Preview Player

### **Chat & Community** (`ChatListScreen.tsx`, `ChatDetailScreen.tsx`)
*   **Purpose**: Direct messaging and group discussions.
*   **Components**:
    *   Conversation List Item (Avatar + Last Message + Timestamp)
    *   Message Bubble (Sent/Received styles)
    *   Input Bar (Text + Voice Note Attachments)

### **Profile** (`ProfileScreen.tsx`)
*   **Purpose**: User identity, stats, and own content.
*   **Components**:
    *   **Hero Profile**: Large Avatar, Name, Language Badge.
    *   **Stats Row**: Followers, Following, Likes.
    *   **Tabs**: "My Clips", "Badges", "Rewards".
    *   **Content List**: User's own voice clips.
    *   **Modals**: `EditBioModal`, `LanguagePicker`.

---

## 3. Secondary Features

### **Validation Center** (`ValidationScreen.tsx`)
*   **Purpose**: Crowdsourced verification of translations.
*   **Components**:
    *   Audio Player (for the clip being validated)
    *   "Correct"/"Incorrect" Voting Buttons
    *   Correction Input Field (for providing fixes)

### **Live Streaming** (`LiveStreamingScreen.tsx`)
*   **Purpose**: Real-time language classes or cultural talks.
*   **Components**:
    *   Camera View
    *   Live Chat Overlay
    *   Viewer Count Badge

### **Settings** (`SettingsScreen.tsx`)
*   **Purpose**: App configuration.
*   **Components**:
    *   `SettingsSection` (Grouped options)
    *   `SettingsItem` (Toggle switches, Navigation chevrons)
    *   `NotificationToggle`

---

## 4. Reusable Shared Components (`src/components/`)
*   **`LanguagePicker.tsx`**: Modal for selecting languages/dialects.
*   **`CommentsSection.tsx`**: Bottom sheet or inline section for discussion.
*   **`VoiceClipInteractions.tsx`**: Like, Comment, Share buttons.
*   **`SuggestedUsers.tsx`**: Horizontal list of people to follow.
*   **`CreateGroupModal.tsx`**: Form to start a new community group.

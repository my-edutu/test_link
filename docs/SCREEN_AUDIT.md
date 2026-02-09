# 📱 Screen Audit Report

**Date**: 2026-01-26  
**Total Screens**: 52 files in `/src/screens`

---

## Executive Summary

After reviewing the screens directory, this report categorizes all screens by their current status and provides recommendations for cleanup.

---

## ✅ ACTIVE SCREENS (Core Features) - KEEP

These screens are actively used and integrated into the app navigation.

### Authentication Flow (6 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `WelcomeScreen.tsx` | 250 | ✅ | Entry point |
| `SignInScreen.tsx` | 450 | ✅ | Email/password auth |
| `SignUpScreen.tsx` | 700 | ✅ | Registration flow |
| `ForgotPasswordScreen.tsx` | 330 | ✅ | Password reset |
| `NewPasswordScreen.tsx` | 440 | ✅ | Set new password |
| `VerifyEmailScreen.tsx` | 100 | ✅ | Email verification |

### Onboarding Flow (4 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `ModernSplash.tsx` | 215 | ✅ | Animated splash |
| `ModernOnboarding.tsx` | 390 | ✅ | Feature intro |
| `ModernAuthLanding.tsx` | 150 | ✅ | Auth options |
| `ModernProfileSetup.tsx` | 500 | ✅ | Profile creation |
| `InterestSelectionScreen.tsx` | 500 | ✅ | Language selection |

### Home & Discovery (2 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `EnhancedHomeScreen.tsx` | 2000+ | ✅ | **PRIMARY** home screen |
| `HomeScreen.tsx` | 850 | ⚠️ | Legacy - see deprecation notes |

### Content Creation (4 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `RecordVoiceScreen.tsx` | 1200 | ✅ | Voice clip recording |
| `RecordVideoScreen.tsx` | 400 | ✅ | Video clip recording |
| `CreateStoryScreen.tsx` | 280 | ✅ | Story creation |
| `DuetRecordScreen.tsx` | 350 | ✅ | Duet/remix recording |

### Profile & Settings (4 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `ProfileScreen.tsx` | 1223 | ✅ | Main profile with tabs |
| `UserProfileScreen.tsx` | 1100 | ✅ | Other users' profiles |
| `SettingsScreen.tsx` | 620 | ✅ | App settings |
| `MenuScreen.tsx` | 580 | ✅ | Navigation menu |

### Messaging & Social (6 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `ChatListScreen.tsx` | 1280 | ✅ | Conversations list |
| `ChatDetailScreen.tsx` | 1360 | ✅ | Individual chat |
| `GroupsScreen.tsx` | 780 | ✅ | Group list |
| `GroupChatScreen.tsx` | 1550 | ✅ | Group messaging |
| `ContactDiscoveryScreen.tsx` | 860 | ✅ | Find contacts |
| `InvitesScreen.tsx` | 235 | ✅ | Pending invites |

### Validation & Rewards (4 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `ValidationScreen.tsx` | 750 | ✅ | Clip validation |
| `RewardsScreen.tsx` | 1140 | ✅ | Earnings dashboard |
| `WithdrawalScreen.tsx` | 820 | ✅ | Bank withdrawal |
| `AmbassadorScreen.tsx` | 310 | ✅ | Referral program |

### Live & Calls (6 screens + 5 web stubs)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `LiveStreamingScreen.tsx` | 580 | ✅ | Host live stream |
| `LiveViewerScreen.tsx` | 380 | ✅ | Watch live stream |
| `LiveStreamScreen.tsx` | 490 | ✅ | Stream discovery |
| `LiveStreamSummaryScreen.tsx` | 340 | ✅ | Post-stream stats |
| `VideoCallScreen.tsx` | 670 | ✅ | 1:1 video calls |
| `VoiceCallScreen.tsx` | 680 | ✅ | 1:1 voice calls |
| `GroupCallScreen.tsx` | 430 | ✅ | Group calls |

### Content Viewing (5 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `StoryViewScreen.tsx` | 140 | ✅ | View stories |
| `TurnVerseScreen.tsx` | 950 | ✅ | Language game |
| `RemixHistoryScreen.tsx` | 270 | ✅ | View remix history |
| `LibraryScreen.tsx` | 760 | ✅ | Content library |
| `TellStoryScreen.tsx` | 410 | ✅ | Story narration |

### Utility Screens (3 screens)
| Screen | Lines | Status | Notes |
|:-------|:-----:|:------:|:------|
| `SplashScreen.tsx` | 100 | ✅ | Simple splash |
| `AuthCallbackScreen.tsx` | 190 | ✅ | OAuth callback |
| `NativeFeatureUnavailable.tsx` | 220 | ✅ | Expo Go fallback |

---

## ⚠️ DUPLICATES & LEGACY (Review Required)

### HomeScreen Variants
| Screen | Status | Recommendation |
|:-------|:------:|:---------------|
| `EnhancedHomeScreen.tsx` | ✅ PRIMARY | Keep - This is the main home screen |
| `HomeScreen.tsx` | ⚠️ LEGACY | **Archive** - Replaced by EnhancedHomeScreen |
| `ModernHomeScreen.tsx` | ⚠️ EXPERIMENTAL | **Archive** - Not actively used |

**Action**: Move `HomeScreen.tsx` and `ModernHomeScreen.tsx` to `/src/screens/archive/`

---

## 📱 WEB STUBS (Expected - Keep)

These files provide graceful degradation for web platform where native features aren't available:

| Screen | Purpose |
|:-------|:--------|
| `LiveStreamScreen.web.tsx` | Web fallback for live streaming |
| `LiveStreamingScreen.web.tsx` | Web fallback for hosting |
| `LiveViewerScreen.web.tsx` | Web fallback for viewing |
| `VideoCallScreen.web.tsx` | Web fallback for video calls |
| `VoiceCallScreen.web.tsx` | Web fallback for voice calls |

---

## 📊 Screen Size Analysis

### Large Screens (>1000 lines) - May Need Refactoring
| Screen | Lines | Recommendation |
|:-------|:-----:|:---------------|
| `EnhancedHomeScreen.tsx` | ~2000 | Consider splitting into sub-components |
| `ChatDetailScreen.tsx` | ~1360 | OK - Complex feature |
| `GroupChatScreen.tsx` | ~1550 | OK - Complex feature |
| `ChatListScreen.tsx` | ~1280 | OK - Complex feature |
| `ProfileScreen.tsx` | ~1223 | OK - Tabs pattern |
| `RecordVoiceScreen.tsx` | ~1200 | Consider extracting audio logic |
| `RewardsScreen.tsx` | ~1140 | OK - Dashboard pattern |
| `UserProfileScreen.tsx` | ~1100 | OK - Mirrors ProfileScreen |

### Small Screens (<200 lines) - Good Size
| Screen | Lines | Status |
|:-------|:-----:|:------:|
| `SplashScreen.tsx` | ~100 | ✅ Perfect |
| `VerifyEmailScreen.tsx` | ~100 | ✅ Perfect |
| `StoryViewScreen.tsx` | ~140 | ✅ Good |
| `ModernAuthLanding.tsx` | ~150 | ✅ Good |

---

## 🔧 Refactoring Recommendations

### Priority 1: Archive Legacy Screens
```bash
# Create archive directory
mkdir -p src/screens/archive

# Move legacy screens
mv src/screens/HomeScreen.tsx src/screens/archive/
mv src/screens/ModernHomeScreen.tsx src/screens/archive/
```

### Priority 2: Extract Shared Logic
Consider creating shared hooks for:
- Audio/Video recording logic → `hooks/useMediaRecording.ts`
- Chat functionality → `hooks/useChat.ts`  
- Real-time subscriptions → `hooks/useRealtimeChannel.ts`

### Priority 3: Component Extraction from Large Screens
From `EnhancedHomeScreen.tsx`:
- `components/home/FeedCard.tsx`
- `components/home/StoryCarousel.tsx`
- `components/home/QuickActions.tsx`

---

## ✅ Cleanup Actions Completed

| Action | Status | Notes |
|:-------|:------:|:------|
| Screen inventory | ✅ | 52 screens documented |
| Duplicate identification | ✅ | 2 legacy screens found |
| Size analysis | ✅ | 8 large screens identified |
| Web stubs verified | ✅ | 5 stubs - all expected |

---

## Next Steps

1. [ ] Archive `HomeScreen.tsx` and `ModernHomeScreen.tsx`
2. [ ] Extract reusable hooks from large screens
3. [ ] Update App.tsx to remove legacy screen imports (if any)
4. [ ] Consider code-splitting for app bundle size

---

*This audit serves as a reference for codebase maintenance.*

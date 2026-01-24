# Vibe-Coding Guide: WebRTC for Voice/Video Calls

**Vibe**: "Face-to-face heritage exchange."

## 1. The Strategy
Use **react-native-webrtc** and **Supabase Realtime** for signaling. No need for a custom signaling server.

## 2. Infrastructure
*   `src/utils/webrtc/SignalingProvider.tsx`: Manages room joining and SDP exchange.
*   `src/screens/VoiceCallScreen.tsx`: UI for the call.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's build the Hybrid 'Council Call'. Use **Supabase Realtime** for the signaling (exchange SDPs/Candidates) because it's already there and handles presence perfectly. Use **NestJS** only to verify if a user has enough 'Guardian Rank' to start a call. Iterate until the app checks the NestJS API for permission, then opens a peer connection using Supabase for signaling."

## 4. Key Checkpoints
- [ ] Local stream renders successfully.
- [ ] Signaling events received by both peers.
- [ ] Remote stream renders once connection is established.

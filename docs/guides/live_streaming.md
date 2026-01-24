# Vibe-Coding Guide: Live Streaming Backend (SFU)

**Vibe**: "Gather round the digital campfire."

## 1. The Strategy
Avoid RTMP/HLS latency. Use **LiveKit** (WebRTC SFU). It's the standard for sub-second latency streaming.

## 2. Infrastructure
*   **Supabase Realtime**: For live chat and viewer counts.
*   **NestJS LiveKitService**: Signs tokens for the media stream.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's get 'Heritage Live' running. The app should use Supabase Realtime for the stream's chat. For the video, create a NestJS endpoint that generates a LiveKit token using the Server SDK. Fetch this token, then use the LiveKit React Native SDK for the media. Iterate until I can chat via Supabase while watching a low-latency stream authorized by NestJS."

## 4. Key Checkpoints
- [ ] Access token successfully fetched from Edge Function.
- [ ] Host status marked in `live_streams` table.
- [ ] Viewers can join the room and receive the track.

# Live Streaming Feature Documentation

> **Module Path**: `src/live/`
> **Status**: 🟢 Complete
> **Last Updated**: 2026-01-20

---

## 📋 Overview

The live streaming module integrates with [LiveKit](https://livekit.io/) to provide:
- **Token Generation**: Secure JWT tokens for joining streams
- **Stream Management**: Start/end streams, track active rooms
- **Viewer Tracking**: Count participants per stream

---

## 🗄️ Database Tables

### `live_streams`
Stores stream metadata and state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (Room ID) |
| `streamer_id` | UUID | FK to profiles (host) |
| `title` | TEXT | Stream title |
| `is_live` | BOOLEAN | true while streaming |
| `viewer_count` | TEXT | Current viewer count |
| `created_at` | TIMESTAMP | Stream start time |
| `ended_at` | TIMESTAMP | Stream end time (null if live) |

### `live_messages`
Chat messages per stream.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `room_name` | TEXT | FK to live_streams.id |
| `user_id` | UUID | Message author |
| `text` | TEXT | Message content |
| `created_at` | TIMESTAMP | Message timestamp |

---

## 🔌 API Endpoints

### POST `/live/token`

Generate a LiveKit access token for joining a room.

**Authentication**: Required (Bearer JWT)

**Request**:
```json
{
  "roomName": "stream-abc123",
  "participantName": "JohnDoe"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serverUrl": "wss://your-project.livekit.cloud"
}
```

**Token Permissions**:
- `canPublish`: true (for hosts), false (for viewers)
- `canSubscribe`: true
- `canPublishData`: true (for chat)

---

### POST `/live/start`

Start a new live stream.

**Authentication**: Required

**Request**:
```json
{
  "title": "Learning Yoruba Today!",
  "roomName": "optional-custom-room-id"
}
```

**Response**:
```json
{
  "stream": {
    "id": "stream-abc123",
    "title": "Learning Yoruba Today!",
    "streamerId": "user-uuid",
    "isLive": true,
    "createdAt": "2026-01-20T10:00:00Z"
  },
  "token": "eyJ...",
  "serverUrl": "wss://..."
}
```

---

### POST `/live/end`

End an active stream.

**Authentication**: Required (must be stream owner)

**Request**:
```json
{
  "roomName": "stream-abc123"
}
```

**Response**:
```json
{
  "success": true,
  "stream": {
    "id": "stream-abc123",
    "isLive": false,
    "endedAt": "2026-01-20T11:30:00Z"
  }
}
```

---

## ⚙️ Configuration

### Environment Variables

```env
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_URL=wss://your-project.livekit.cloud
```

### LiveKit Cloud Setup

1. Create account at [livekit.io](https://livekit.io)
2. Create new project
3. Copy API Key and Secret to `.env`
4. Note the WebSocket URL

---

## 🔗 LiveKit SDK Integration

### Token Generation (Server-side)

```typescript
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

generateToken(roomName: string, participantName: string, isHost: boolean): string {
    const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        { identity: participantName }
    );

    const grant: VideoGrant = {
        roomJoin: true,
        room: roomName,
        canPublish: isHost,
        canSubscribe: true,
        canPublishData: true,
    };

    token.addGrant(grant);
    return token.toJwt();
}
```

### Mobile Client (React Native)

```typescript
import { Room, connect } from 'livekit-client';

// Get token from our backend
const { token, serverUrl } = await api.post('/live/token', {
    roomName: 'stream-123',
    participantName: user.username
});

// Connect to LiveKit
const room = new Room();
await room.connect(serverUrl, token);
```

---

## 📊 Real-time Updates

### Viewer Count Sync
- Use Supabase Realtime to subscribe to `live_streams` table
- Update `viewer_count` when participants join/leave
- LiveKit webhooks (future) for accurate counts

### Chat Messages
- Insert messages to `live_messages` via Supabase client
- Subscribe to `live_messages` filtered by room_name
- Consider rate limiting for spam prevention

---

## 🧪 Testing Scenarios

1. **Token Generation**: Valid token returned with correct permissions
2. **Start Stream**: New stream record created, token returned
3. **Join as Viewer**: Token with publish=false
4. **End Stream**: Stream marked as ended, room closed
5. **Chat**: Messages persist and broadcast

---

## 🔒 Security Considerations

1. **JWT Verification**: Validate Supabase token before generating LiveKit token
2. **Room Isolation**: Each stream has unique room ID
3. **Host Verification**: Only stream owner can end stream
4. **Token Expiry**: Set reasonable TTL on LiveKit tokens

---

## 📝 Implementation Notes

- Room IDs are generated with `crypto.randomUUID()` if not provided
- Streams are soft-deleted (marked `is_live: false`) not hard-deleted
- Consider caching active streams for performance

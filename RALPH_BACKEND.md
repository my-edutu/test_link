# TASK: Initialize Hybrid Backend (NestJS + Drizzle + LiveKit)

## 🎯 Objective
Bootstrap the LinguaLink backend in `services/api`. This backend will coexist with the Supabase database and handle LiveKit token generation for livestreaming.

## 🛠 Tech Stack
- **Framework**: NestJS
- **ORM**: Drizzle (connecting to existing Supabase Postgres)
- **Database**: Postgres (Shared with Supabase)
- **Live Streaming**: LiveKit Server SDK

## 📋 Iterative Steps for the Loop
1. **Initialize NestJS**: Create the basic app structure in `services/api/src`.
2. **Database Connection**: 
   - Configure Drizzle in `database.module.ts`.
   - Use `process.env.EXPO_PUBLIC_SUPABASE_URL` and credentials from the root `.env` to connect.
   - Create a simple user profile schema that maps to the existing Supabase `profiles` table.
3. **LiveKit Integration**:
   - Create a `LiveService` that takes `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL`.
   - Implement an endpoint `POST /live/token` that:
     - Accepts `roomName` and `participantName`.
     - Generates and returns a JWT token with `video: true` and `audio: true` permissions.
4. **Resilience**: Ensure error handling for database connection failures.

## 🛑 Success Criteria
- The backend starts without errors (`npm run dev`).
- The `/live/token` endpoint returns a valid JWT when called (you can simulate this with a test script).
- Drizzle successfully queries the `profiles` table.

## 🔑 Required Credentials (PLACEHOLDERS)
If not present in `.env`, use:
- LIVEKIT_API_KEY: `devkey`
- LIVEKIT_API_SECRET: `secret`
- LIVEKIT_URL: `wss://localhost:7880`

**When the backend is stable and endpoint is working, output: <promise>DONE</promise>**

# DevOps Implementation Guide: NestJS & Hybrid Infrastructure

**Purpose**: This guide provides Antigravity with high-level goals and iterative prompts to build, secure, and deploy the LinguaLink hybrid backend.

## 1. Core Goals
*   **Seamless Integration**: NestJS must recognize Supabase JWTs and connect to the shared Postgres DB.
*   **Security First**: No sensitive logic (monetization, moderation bypass) should be exposed to the client-side SDK.
*   **Type Safety**: Use Drizzle to share types between the backend and frontend.

## 2. Phase 1: The Hybrid Base
### Goal: Establish the NestJS -> Supabase Bridge
> "Antigravity, let's build the foundation. Initialize a new NestJS project. Configure Drizzle ORM to connect to our Supabase Postgres instance using the shared connection string. Then, implement a `SupabaseAuthGuard` that extracts the Bearer JWT from incoming requests and verifies it. Iterate until a simple `GET /profile` endpoint in NestJS correctly returns the user ID from my Supabase session."

## 3. Phase 2: Secure Data Layer
### Goal: Logic over SQL
> "Antigravity, let's secure the vault logic. Use Drizzle to define schemas that match our existing Supabase tables. Create a `VaultService` in NestJS that handles 'Protected Actions' like changing a post's validation status. Ensure that only users with an `admin` or `moderator` role (stored in our `profiles` table) can trigger these actions. Iterate until unauthorized updates are blocked by the NestJS backend."

## 4. Phase 3: Realtime & Events
### Goal: Hybrid Signaling
> "Antigravity, let's wire up the hybrid realtime hub. In NestJS, set up `@nestjs/event-emitter`. Create a listener that triggers when Drizzle confirms a new transaction. This listener should use the Supabase Admin SDK to broadcast a 'balance_updated' event via Supabase Realtime Channels. Iterate until a transaction made in NestJS triggers a UI update in the app via Supabase."

## 5. Phase 4: CI/CD & Deployment
### Goal: Production Readiness
> "Antigravity, let's get ready for the cloud. Generate a `Dockerfile` for the NestJS backend optimized for production. Create a GitHub Action workflow that builds the image, runs Drizzle migrations, and deploys it (e.g., to AWS App Runner or Railway). Iterate until we have a 'zero-downtime' deployment pipeline that syncs with our shared database."

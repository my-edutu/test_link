# Vibe-Coding Guide: Content Moderation & Reporting

**Vibe**: "Protecting the Vault."

## 1. The Strategy
Combine automated AI scanning (OpenAI Moderation) with a human-in-the-loop reporting system.

## 2. Infrastructure
*   **Supabase Post Feed**: Displays validated content.
*   **NestJS ModerationInterceptor**: Scans data via OpenAI API inside the NestJS gateway before passing to Drizzle.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's keep the Vault clean using a Hybrid approach. When a post is created in the app, send the metadata to a NestJS endpoint first. NestJS should use its Interceptor to scan the text via AI. If clean, NestJS uses Drizzle to save the post to Postgres. The Supabase-powered feed then automatically displays the new, safe content. Iterate until toxic posts are blocked by NestJS and never reach the Supabase feed."

## 4. Key Checkpoints
- [ ] Report button works and logs to DB.
- [ ] Edge Function catches prohibited keywords/sentiment.
- [ ] Admin flag in `profiles` to bypass filters.

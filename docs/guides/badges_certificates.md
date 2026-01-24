# Vibe-Coding Guide: Badges & Certificates

**Vibe**: "Honoring the Ancestral Guardians."

## 1. The Strategy
Automated recognition of milestones using SVG generation and PDF certificates.

## 2. Infrastructure
*   `badges` & `user_badges` tables.
*   Edge Function: `generate-certificate` for PDF creation.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's build Hybrid Recognition. When a landmark is hit, a NestJS `BadgeService` should use Drizzle to insert a new badge record. Then, create an endpoint where NestJS generates a PDF certificate using `puppeteer`. NestJS should upload this PDF to a **Supabase Storage** bucket and return the public URL to the user. Iterate until reaching a milestone triggers a celebratory animation in the app and provides a download link to a NestJS-generated certificate stored in Supabase."

## 4. Key Checkpoints
- [ ] Lottie animation plays on badge unlock.
- [ ] Certificate includes user's name, date, and "Heritage UUID".
- [ ] PDF stored in a 'certificates' public bucket for easy sharing.

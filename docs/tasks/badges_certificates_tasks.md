# Task List: Badges & Certificates

**Goal**: Merit-based recognition with automated PDF generation.

## Phase 1: Achievement Engine
- [ ] Define `badges` (metadata) and `user_badges` (junction) schemas in Drizzle.
- [ ] Implement achievement listeners in NestJS (e.g., "On 100th Validation").
- [ ] Build the "Virtual Trophy Case" on the user profile screen.
- [ ] Add a celebratory Lottie animation on badge unlock.

## Phase 2: Certificate Generation (NestJS)
- [ ] Install a PDF generation library (like `pdfkit` or `puppeteer`) in NestJS.
- [ ] Design a HTML/CSS template for the "Heritage Guardian" certificate.
- [ ] Create a NestJS endpoint to generate a personalized PDF on demand.
- [ ] Implement Supabase Storage upload for generated certificates.

## Phase 3: Identity & Claims
- [ ] Add "Claim Certificate" button to eligible milestones.
- [ ] Implement "Verify Certificate" public page for external validation.
- [ ] Configure automatic email delivery of certificates via SendGrid/Resend.

## Phase 4: Verification
- [ ] Manually trigger a milestone and verify the badge appears in the mobile UI.
- [ ] Test generating a PDF and verify the content/layout.
- [ ] Verify that the certificate is saved successfully to Supabase Storage.
- [ ] Test the public verification link for a generated certificate.

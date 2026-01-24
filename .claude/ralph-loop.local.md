---
active: true
iteration: 1
max_iterations: 15
completion_promise: null
started_at: "2026-01-21T21:43:05Z"
---

Implement the Badges and Certificates system.

STEPS:
1. Create services/api/src/database/schema.ts additions:
   - badges table: id, name, description, icon_url, tier (bronze/silver/gold), requirement_type, requirement_value
   - user_badges table: id, user_id, badge_id, earned_at

2. Create services/api/src/badges/badges.module.ts, badges.controller.ts, badges.service.ts:
   - GET /badges - List all available badges
   - GET /badges/user/:userId - Get badges earned by a user
   - POST /badges/award (internal) - Award badge to user

3. Create BadgeAwarder service with @OnEvent listeners:
   - CLIP_APPROVED -> Check if user has 10/50/100 approved clips -> Award 'Content Creator' badges
   - VALIDATION_PROCESSED -> Check if user has 100/500/1000 validations -> Award 'Validator' badges
   - First clip approved -> Award 'First Steps' badge

4. Emit BADGE_EARNED event for push notification.

5. Create src/components/BadgeCard.tsx:
   - Circular badge icon with tier color ring (bronze/silver/gold)
   - Badge name and description
   - Earned date display

6. Create src/components/TrophyCase.tsx:
   - Grid of earned badges
   - Empty state for no badges
   - View All link if many badges

7. Add Badges section to ProfileScreen (maybe in Rewards tab or new tab).

8. Install pdfkit in NestJS: npm install pdfkit @types/pdfkit

9. Create GET /badges/:badgeId/certificate endpoint:
   - Generate personalized PDF certificate
   - Include user name, badge name, date earned
   - Upload to Supabase Storage
   - Return download URL

10. Optional: Add Lottie celebration animation on badge earn.

SUCCESS: Badges auto-awarded on milestones, visible on profile, PDF certificates downloadable.

PROMISE: BADGES_COMPLETE

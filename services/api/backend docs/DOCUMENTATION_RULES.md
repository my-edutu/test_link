# Backend Documentation Rules & Guidelines

> **Purpose**: This document establishes the documentation standards for the LinguaLink NestJS + Drizzle backend. Proper documentation ensures maintainability, onboarding efficiency, and consistent implementation patterns.

---

## 📚 Documentation Structure

All backend documentation must live in `services/api/backend docs/` and follow this structure:

```
backend docs/
├── DOCUMENTATION_RULES.md      # This file - rules and guidelines
├── BACKEND_STATUS.md           # Current status of all backend features
├── FEATURE_CHANGELOG.md        # Log of new features and changes
├── DRIZZLE_PATTERNS.md         # Drizzle ORM patterns and best practices
├── DEPLOYMENT_GUIDE.md         # Hosting and deployment instructions
└── features/                   # Per-feature detailed documentation
    ├── monetization.md
    ├── live-streaming.md
    └── ...
```

---

## 📝 Documentation Rules

### 1. Feature Status Documentation

Every backend feature **MUST** have an entry in `BACKEND_STATUS.md` with:

| Field | Description |
|-------|-------------|
| **Feature Name** | Clear, descriptive name |
| **Status** | `🔴 Not Started` / `🟡 In Progress` / `🟢 Complete` / `🔵 Needs Review` |
| **Module Path** | Path to the NestJS module (e.g., `src/monetization/`) |
| **Drizzle Tables** | List of tables this feature touches |
| **Endpoints** | All API endpoints with methods |
| **Dependencies** | External services or modules required |
| **Last Updated** | Date of last modification |

### 2. New Feature Changelog

When adding or modifying features, **ALWAYS** update `FEATURE_CHANGELOG.md`:

```markdown
## [YYYY-MM-DD] - Feature Name

### Added
- Description of new functionality

### Changed
- Description of modifications

### Breaking Changes
- List any breaking changes

### Migration Required
- [ ] Yes / [x] No
- Migration path: `supabase/sql/XXX_migration_name.sql`
```

### 3. Drizzle Schema Documentation

Every new table in `src/database/schema.ts` **MUST** include:

1. **Inline JSDoc comments** explaining each column
2. **Relationship documentation** (foreign keys, references)
3. **Entry in `DRIZZLE_PATTERNS.md`** with usage examples

Example:
```typescript
/**
 * Stores user validation records for voice clips.
 * @see voiceClips - Referenced by voiceClipId
 * @see profiles - Validator references
 */
export const validations = pgTable('validations', {
    /** Unique validation ID */
    id: uuid('id').defaultRandom().primaryKey(),
    /** FK to the voice clip being validated */
    voiceClipId: uuid('voice_clip_id').notNull(),
    /** FK to the user performing validation */
    validatorId: uuid('validator_id').notNull(),
    /** Validation result: true=approved, false=rejected, null=pending */
    isApproved: boolean('is_approved'),
    createdAt: timestamp('created_at').defaultNow(),
});
```

### 4. API Endpoint Documentation

All endpoints **MUST** document:

```markdown
### POST /monetization/validate

**Description**: Submit a validation decision for a voice clip.

**Authentication**: Required (Bearer JWT)

**Request Body**:
```json
{
  "clipId": "uuid",
  "decision": "approve" | "reject"
}
```

**Response**:
```json
{
  "success": true,
  "consensusReached": false,
  "reward": 0.02
}
```

**Errors**:
| Code | Message |
|------|---------|
| 401 | Unauthorized - Invalid or missing token |
| 404 | Clip not found |
| 409 | User already validated this clip |
```

### 5. Deployment & Hosting Notes

Update `DEPLOYMENT_GUIDE.md` when:
- Adding new environment variables
- Changing infrastructure requirements
- Modifying build or start commands
- Adding new external service integrations

---

## 🔄 Documentation Workflow

### When Starting a New Feature:
1. Create entry in `BACKEND_STATUS.md` with status `🟡 In Progress`
2. Create feature doc in `features/[feature-name].md`
3. Document planned endpoints and tables

### When Completing a Feature:
1. Update status to `🟢 Complete` in `BACKEND_STATUS.md`
2. Add changelog entry in `FEATURE_CHANGELOG.md`
3. Ensure all Drizzle schemas have JSDoc comments
4. Verify endpoint documentation is complete

### When Modifying Existing Features:
1. Update status to `🔵 Needs Review` if significant changes
2. Add changelog entry with modifications
3. Update feature-specific documentation
4. Note any migration requirements

---

## ✅ Documentation Checklist

Before considering any backend work complete, verify:

- [ ] `BACKEND_STATUS.md` reflects current state
- [ ] `FEATURE_CHANGELOG.md` has dated entry
- [ ] Drizzle schemas have inline comments
- [ ] All endpoints are documented with request/response formats
- [ ] Environment variables are listed in `DEPLOYMENT_GUIDE.md`
- [ ] Any migrations are noted with file paths

---

## 📌 Important Notes

1. **Keep Documentation Updated**: Outdated docs are worse than no docs
2. **Be Specific**: Avoid vague descriptions; include exact types and values
3. **Link Related Docs**: Cross-reference related features and tables
4. **Version Your Changes**: Always date your changelog entries
5. **Document Edge Cases**: Note error scenarios and handling

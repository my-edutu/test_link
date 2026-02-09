import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, decimal } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
    id: text('id').primaryKey(), // Changed to text for Clerk user IDs
    email: text('email'),
    username: text('username'),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    hasCompletedOnboarding: boolean('has_completed_onboarding').default(false),
    interests: jsonb('interests'),
    balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
    pendingBalance: decimal('pending_balance', { precision: 10, scale: 2 }).default('0'), // Locked funds for pending withdrawals
    totalEarned: decimal('total_earned', { precision: 10, scale: 2 }).default('0'),
    trustScore: integer('trust_score').default(100),
    accuracyRating: decimal('accuracy_rating', { precision: 5, scale: 2 }).default('0'), // e.g. 95.50
    dailyValidationsCount: integer('daily_validations_count').default(0),
    lastValidationReset: timestamp('last_validation_reset'),
    validatorTier: text('validator_tier').default('bronze'), // 'bronze', 'silver', 'gold'
    expoPushToken: text('expo_push_token'), // For push notifications
    // Linked bank account (masked for security)
    bankName: text('bank_name'),
    bankCode: text('bank_code'),
    accountNumberLast4: text('account_number_last_4'), // Only last 4 digits
    accountName: text('account_name'), // Verified account holder name
    updatedAt: timestamp('updated_at').defaultNow(),
    // Ambassador Program
    isAmbassador: boolean('is_ambassador').default(false),
    vanityCode: text('vanity_code').unique(),
    referredById: text('referred_by_id'), // References profiles.id (Clerk user ID)
    primaryLanguage: text('primary_language').default('English'),
    country: text('country'),
    state: text('state'),
    city: text('city'),
    lga: text('lga'),
    // Missing metadata fields from DB
    bio: text('bio'),
    location: text('location'),
    website: text('website'),
    isBanned: boolean('is_banned').default(false),
    banReason: text('ban_reason'),
    bannedAt: timestamp('banned_at'),
    referralCount: integer('referral_count').default(0),
    referredBy: text('referred_by'), // Referral code or username of referrer
    // Admin role
    isAdmin: boolean('is_admin').default(false),
    adminPasswordHash: text('admin_password_hash'), // bcrypt hashed password for admin actions
    // Role Progression
    userRole: text('user_role').default('user'), // 'user', 'validator', 'ambassador'
    totalValidationsCount: integer('total_validations_count').default(0),
    activeDaysCount: integer('active_days_count').default(0),
    lastActiveDate: timestamp('last_active_date'), // changed to timestamp for simpler handling
    promotedToValidatorAt: timestamp('promoted_to_validator_at'),
    promotedToAmbassadorAt: timestamp('promoted_to_ambassador_at'),
    verifiedDialects: jsonb('verified_dialects').default([]), // ['yoruba', 'igbo']
    // Ambassador specifics
    ambassadorRegion: text('ambassador_region'),
    ambassadorMonthlyStipend: decimal('ambassador_monthly_stipend', { precision: 10, scale: 2 }).default('0'),
    ambassadorApprovedBy: text('ambassador_approved_by'), // admin user_id
});

export const referralStats = pgTable('referral_stats', {
    id: uuid('id').defaultRandom().primaryKey(),
    ambassadorId: text('ambassador_id').notNull(), // Clerk user ID
    totalReferrals: integer('total_referrals').default(0),
    totalConversions: integer('total_conversions').default(0), // Approved clips
    totalEarnings: decimal('total_earnings', { precision: 10, scale: 2 }).default('0'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const liveMessages = pgTable('live_messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    roomName: text('room_name').notNull(),
    userId: text('user_id').notNull(), // Clerk user ID
    text: text('text').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const liveStreams = pgTable('live_streams', {
    id: text('id').primaryKey(), // Room ID
    streamerId: text('streamer_id').notNull(), // Clerk user ID
    title: text('title').notNull(),
    language: text('language').notNull().default('English'), // Stream language
    isLive: boolean('is_live').default(true),
    viewerCount: text('viewer_count').default('0'),
    createdAt: timestamp('created_at').defaultNow(),
    endedAt: timestamp('ended_at'),
});

// Call history for video/voice calls
export const callHistory = pgTable('call_history', {
    id: uuid('id').defaultRandom().primaryKey(),
    callId: text('call_id').notNull(), // LiveKit room/call ID
    callerId: text('caller_id').notNull(), // Clerk user ID who initiated
    receiverId: text('receiver_id').notNull(), // Clerk user ID who received
    callType: text('call_type').notNull(), // 'video', 'voice', 'group'
    status: text('status').default('initiated'), // 'initiated', 'ringing', 'answered', 'ended', 'missed', 'declined'
    startedAt: timestamp('started_at').defaultNow(),
    answeredAt: timestamp('answered_at'),
    endedAt: timestamp('ended_at'),
    durationSeconds: integer('duration_seconds'),
    endReason: text('end_reason'), // 'completed', 'caller_ended', 'receiver_ended', 'missed', 'declined', 'failed'
});

export const badges = pgTable('badges', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description').notNull(),
    imageUrl: text('image_url').notNull(),
    category: text('category').notNull(), // 'contributor', 'validator', 'game', 'social'
    tier: text('tier').default('bronze'), // 'bronze', 'silver', 'gold'
    requirementType: text('requirement_type'), // 'clips_approved', 'validations_count', 'streak_days', etc.
    requirementValue: integer('requirement_value'), // Number required to earn this badge
    criteria: jsonb('criteria'), // Additional criteria (for complex badges)
    createdAt: timestamp('created_at').defaultNow(),
});

export const userBadges = pgTable('user_badges', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    badgeId: uuid('badge_id').notNull(),
    earnedAt: timestamp('earned_at').defaultNow(),
});

export const voiceClips = pgTable('voice_clips', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    phrase: text('phrase'),
    language: text('language'),
    dialect: text('dialect'),
    audioUrl: text('audio_url'),
    likesCount: integer('likes_count').default(0),
    commentsCount: integer('comments_count').default(0),
    validationsCount: integer('validations_count').default(0),
    duetsCount: integer('duets_count').default(0),
    parentClipId: uuid('parent_clip_id'), // For Duets/Remixes
    rootClipId: uuid('root_clip_id'), // Original source
    isMonetized: boolean('is_monetized').default(false),
    status: text('status').default('pending'), // 'pending', 'approved', 'rejected'
    createdAt: timestamp('created_at').defaultNow(),
});

export const videoClips = pgTable('video_clips', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    title: text('title'),
    description: text('description'),
    language: text('language'),
    dialect: text('dialect'),
    videoUrl: text('video_url'),
    thumbnailUrl: text('thumbnail_url'),
    duration: integer('duration'), // Duration in seconds
    likesCount: integer('likes_count').default(0),
    commentsCount: integer('comments_count').default(0),
    viewsCount: integer('views_count').default(0),
    parentClipId: uuid('parent_clip_id'), // For Duets/Remixes
    rootClipId: uuid('root_clip_id'), // Original source
    isMonetized: boolean('is_monetized').default(false),
    status: text('status').default('pending'), // 'pending', 'approved', 'rejected'
    createdAt: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID who wrote the comment
    targetId: uuid('target_id').notNull(), // ID of the clip/story being commented on
    targetType: text('target_type').notNull(), // 'voice_clip', 'video_clip', 'story'
    text: text('text').notNull(),
    likesCount: integer('likes_count').default(0),
    parentCommentId: uuid('parent_comment_id'), // For nested replies
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const validations = pgTable('validations', {
    id: uuid('id').defaultRandom().primaryKey(),
    voiceClipId: uuid('voice_clip_id').notNull(),
    validatorId: text('validator_id').notNull(), // Clerk user ID
    isApproved: boolean('is_approved'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const rewardRates = pgTable('reward_rates', {
    id: uuid('id').defaultRandom().primaryKey(),
    actionType: text('action_type').notNull(), // 'validate_correct', 'clip_approved', etc.
    amount: decimal('amount', { precision: 10, scale: 4 }).notNull(),
    currency: text('currency').default('USD'),
    isActive: boolean('is_active').default(true),
});

export const transactions = pgTable('transactions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    type: text('type').notNull(), // 'earning', 'withdrawal', 'bonus', 'penalty', 'refund'
    category: text('category'), // 'reward', 'payout', 'royalty' - Optional if type covers it
    referenceId: uuid('reference_id'), // context id
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Push notification delivery tracking
export const notificationLogs = pgTable('notification_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    expoPushToken: text('expo_push_token').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data'), // Deep link info, category, etc.
    category: text('category'), // 'alert', 'social', 'reward'
    status: text('status').default('pending'), // 'pending', 'sent', 'delivered', 'failed'
    ticketId: text('ticket_id'), // Expo push ticket ID
    receiptId: text('receipt_id'), // Expo receipt ID
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Flagged clips for admin review (Dispute Resolution)
export const clipFlags = pgTable('clip_flags', {
    id: uuid('id').defaultRandom().primaryKey(),
    voiceClipId: uuid('voice_clip_id').notNull(),
    flaggedBy: text('flagged_by').notNull(), // Clerk user ID who flagged
    reason: text('reason').notNull(), // 'unclear_audio', 'dialect_dispute', 'inappropriate_content', 'other'
    additionalNotes: text('additional_notes'),
    status: text('status').default('pending'), // 'pending', 'reviewed', 'resolved', 'dismissed'
    resolvedBy: text('resolved_by'), // admin Clerk user ID
    resolution: text('resolution'), // admin's decision
    createdAt: timestamp('created_at').defaultNow(),
    resolvedAt: timestamp('resolved_at'),
});

// Withdrawal requests for payouts
export const withdrawals = pgTable('withdrawals', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    bankCode: text('bank_code').notNull(),
    accountNumber: text('account_number').notNull(), // Masked (Last 4 digits)
    encryptedAccountNumber: text('encrypted_account_number'), // Encrypted full number
    accountName: text('account_name').notNull(),
    status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed'
    reference: text('reference').unique(), // Paystack transfer reference
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at').defaultNow(),
    completedAt: timestamp('completed_at'),
});

// Payout requests with idempotency key for safe retries
export const payoutRequests = pgTable('payout_requests', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    idempotencyKey: text('idempotency_key').notNull().unique(), // Prevents duplicate requests
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    bankCode: text('bank_code').notNull(),
    accountNumber: text('account_number').notNull(), // Masked (Last 4 digits)
    encryptedAccountNumber: text('encrypted_account_number'), // Encrypted full number
    accountName: text('account_name').notNull(),
    status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed', 'refunded'
    paystackTransferCode: text('paystack_transfer_code'), // Transfer code from Paystack
    paystackReference: text('paystack_reference'), // Reference for tracking
    failureReason: text('failure_reason'),
    lockedAmount: decimal('locked_amount', { precision: 10, scale: 2 }), // Amount locked from balance
    createdAt: timestamp('created_at').defaultNow(),
    processedAt: timestamp('processed_at'),
    completedAt: timestamp('completed_at'),
});

// Content moderation reports
export const reports = pgTable('reports', {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterId: text('reporter_id').notNull(), // Clerk user ID who submitted the report
    reportedUserId: text('reported_user_id').notNull(), // Clerk user ID being reported
    postId: uuid('post_id'), // Optional: voice clip or post being reported
    reason: text('reason').notNull(), // 'spam', 'harassment', 'inappropriate', 'other'
    additionalDetails: text('additional_details'), // User's description of the issue
    status: text('status').default('pending'), // 'pending', 'reviewing', 'resolved', 'dismissed'
    resolutionAction: text('resolution_action'), // 'dismiss', 'warn', 'hide_content', 'ban_user'
    resolutionNotes: text('resolution_notes'), // Admin's notes on the decision
    resolverId: text('resolver_id'), // Admin Clerk user ID who resolved the report
    createdAt: timestamp('created_at').defaultNow(),
    resolvedAt: timestamp('resolved_at'),
});

// --- Chat & Realtime Messaging tables ---

export const conversations = pgTable('conversations', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: text('type').default('direct'), // 'direct' or 'group'
    name: text('name'),
    avatarUrl: text('avatar_url'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const conversationMembers = pgTable('conversation_members', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').notNull(),
    userId: text('user_id').notNull(), // Clerk user ID
    role: text('role').default('member'), // 'admin', 'member'
    joinedAt: timestamp('joined_at').defaultNow(),
});

export const messages = pgTable('messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').notNull(),
    senderId: text('sender_id').notNull(), // Clerk user ID
    text: text('text').notNull(),
    mediaUrl: text('media_url'),
    type: text('type').default('text'), // 'text', 'voice', 'image', 'system'
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

// Transactional Outbox for reliable event delivery
export const notificationOutbox = pgTable('notification_outbox', {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed'
    retries: integer('retries').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    processedAt: timestamp('processed_at'),
});

// Admin Audit Logs for compliance and security tracking
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: text('admin_id').notNull(), // Admin Clerk user ID who performed the action
    action: text('action').notNull(), // 'VIEW_PAYOUT_DETAILS', 'PROCESS_PAYOUT', 'REJECT_PAYOUT', etc.
    targetType: text('target_type'), // 'payout_request', 'user', 'clip'
    targetId: text('target_id'), // ID of the affected entity (can be uuid or clerk id)
    ipAddress: text('ip_address'), // For additional security tracking
    userAgent: text('user_agent'), // Browser/device info
    metadata: jsonb('metadata'), // Additional context (amount, reason, etc.)
    createdAt: timestamp('created_at').defaultNow(),
});

// Encrypted bank account storage (separate from profiles for security)
export const linkedBankAccounts = pgTable('linked_bank_accounts', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().unique(), // Clerk user ID
    bankCode: text('bank_code').notNull(),
    bankName: text('bank_name').notNull(),
    accountNumberMasked: text('account_number_masked').notNull(), // e.g., ******4321
    encryptedAccountNumber: text('encrypted_account_number').notNull(), // AES-256 encrypted
    accountName: text('account_name').notNull(), // Verified name from Paystack
    isVerified: boolean('is_verified').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const ambassadorApplications = pgTable('ambassador_applications', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk user ID
    region: text('region').notNull(),
    motivation: text('motivation'),
    experienceDetails: text('experience_details'),
    status: text('status').default('pending'), // 'pending', 'approved', 'rejected'
    processedAt: timestamp('processed_at'),
    processedBy: text('processed_by'), // admin user_id
    createdAt: timestamp('created_at').defaultNow(),
});

export const validationQueue = pgTable('validation_queue', {
    id: uuid('id').defaultRandom().primaryKey(),
    voiceClipId: text('voice_clip_id').notNull(),
    validatorId: text('validator_id').notNull(), // Assigned validator
    assignedAt: timestamp('assigned_at').defaultNow(),
    status: text('status').default('pending'), // 'pending', 'completed', 'expired'
    expiresAt: timestamp('expires_at'),
    priority: integer('priority').default(0), // Higher priority first
});

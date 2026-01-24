import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, decimal } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
    id: text('id').primaryKey(),
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
    referredById: text('referred_by_id'), // References profiles.id
    // Admin role
    isAdmin: boolean('is_admin').default(false),
});

export const referralStats = pgTable('referral_stats', {
    id: uuid('id').defaultRandom().primaryKey(),
    ambassadorId: text('ambassador_id').notNull(), //.references(() => profiles.id),
    totalReferrals: integer('total_referrals').default(0),
    totalConversions: integer('total_conversions').default(0), // Approved clips
    totalEarnings: decimal('total_earnings', { precision: 10, scale: 2 }).default('0'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const liveMessages = pgTable('live_messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    roomName: text('room_name').notNull(),
    userId: uuid('user_id').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const liveStreams = pgTable('live_streams', {
    id: text('id').primaryKey(), // Room ID
    streamerId: uuid('streamer_id').notNull(),
    title: text('title').notNull(),
    isLive: boolean('is_live').default(true),
    viewerCount: text('viewer_count').default('0'),
    createdAt: timestamp('created_at').defaultNow(),
    endedAt: timestamp('ended_at'),
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
    userId: uuid('user_id').notNull(),
    badgeId: uuid('badge_id').notNull(),
    earnedAt: timestamp('earned_at').defaultNow(),
});

export const voiceClips = pgTable('voice_clips', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
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

export const validations = pgTable('validations', {
    id: uuid('id').defaultRandom().primaryKey(),
    voiceClipId: uuid('voice_clip_id').notNull(),
    validatorId: uuid('validator_id').notNull(),
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
    userId: text('user_id').notNull(), //.references(() => profiles.id),
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
    userId: text('user_id').notNull(),
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
    flaggedBy: text('flagged_by').notNull(), // user_id who flagged
    reason: text('reason').notNull(), // 'unclear_audio', 'dialect_dispute', 'inappropriate_content', 'other'
    additionalNotes: text('additional_notes'),
    status: text('status').default('pending'), // 'pending', 'reviewed', 'resolved', 'dismissed'
    resolvedBy: text('resolved_by'), // admin user_id
    resolution: text('resolution'), // admin's decision
    createdAt: timestamp('created_at').defaultNow(),
    resolvedAt: timestamp('resolved_at'),
});

// Withdrawal requests for payouts
export const withdrawals = pgTable('withdrawals', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    bankCode: text('bank_code').notNull(),
    accountNumber: text('account_number').notNull(),
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
    userId: text('user_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(), // Prevents duplicate requests
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    bankCode: text('bank_code').notNull(),
    accountNumber: text('account_number').notNull(),
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
    reporterId: text('reporter_id').notNull(), // User who submitted the report
    reportedUserId: text('reported_user_id').notNull(), // User being reported
    postId: uuid('post_id'), // Optional: voice clip or post being reported
    reason: text('reason').notNull(), // 'spam', 'harassment', 'inappropriate', 'other'
    additionalDetails: text('additional_details'), // User's description of the issue
    status: text('status').default('pending'), // 'pending', 'reviewing', 'resolved', 'dismissed'
    resolutionAction: text('resolution_action'), // 'dismiss', 'warn', 'hide_content', 'ban_user'
    resolutionNotes: text('resolution_notes'), // Admin's notes on the decision
    resolverId: text('resolver_id'), // Admin who resolved the report
    createdAt: timestamp('created_at').defaultNow(),
    resolvedAt: timestamp('resolved_at'),
});

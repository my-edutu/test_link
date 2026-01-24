/**
 * Monetization System Constants
 * All magic numbers and strings are defined here for consistency.
 */

// Consensus Configuration
export const CONSENSUS_THRESHOLD = 3; // Number of matching validations required
export const VALIDATION_COOLDOWN_MS = 5000; // 5 seconds between validations per user

// Trust Score Configuration
export const TRUST_SCORE_DEFAULT = 100;
export const TRUST_SCORE_MAX = 200;
export const TRUST_SCORE_MIN = 0;
export const TRUST_SCORE_INCREASE_CORRECT = 2; // When validator agrees with consensus
export const TRUST_SCORE_DECREASE_WRONG = 5; // When validator is an outlier

// Validator Tiers
export const VALIDATOR_TIERS = {
    BRONZE: 'bronze',
    SILVER: 'silver',
    GOLD: 'gold',
} as const;

export const TIER_THRESHOLDS = {
    [VALIDATOR_TIERS.SILVER]: 120,
    [VALIDATOR_TIERS.GOLD]: 160,
};

// Transaction Types
export const TRANSACTION_TYPES = {
    EARNING: 'earning',
    WITHDRAWAL: 'withdrawal',
    BONUS: 'bonus',
    PENALTY: 'penalty',
    REFUND: 'refund',
} as const;

// Reward Action Types (must match reward_rates.action_type in DB)
export const REWARD_ACTIONS = {
    VALIDATION_CORRECT: 'validation_correct',
    VALIDATION_INCORRECT: 'validation_incorrect',
    CLIP_APPROVED: 'clip_approved',
    REMIX_ROYALTY: 'remix_royalty',
} as const;

// Clip Status
export const CLIP_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;

// Error Messages
export const MONETIZATION_ERRORS = {
    CLIP_NOT_FOUND: 'Voice clip not found',
    CANNOT_VALIDATE_OWN_CLIP: 'You cannot validate your own clip',
    ALREADY_VALIDATED: 'You have already validated this clip',
    RATE_LIMITED: 'Please wait before submitting another validation',
    INSUFFICIENT_TRUST: 'Your trust score is too low to validate',
    USER_NOT_FOUND: 'User profile not found',
} as const;

export interface ValidationResult {
    success: boolean;
    validationId?: string;
    pointsEarned?: number;
    message: string;
    consensusReached?: boolean;
}

export interface ValidationQueueItem {
    id: string;
    phrase: string;
    language: string;
    dialect?: string;
    audio_url: string;
    validations_count: number;
}

export interface ValidationHistoryItem {
    id: string;
    voiceClipId: string;
    isApproved: boolean;
    createdAt: string;
}

export interface EarningsSummary {
    balance: number;
    totalEarned: number;
    trustScore: number;
    validatorTier: string;
}

export interface TopUpResult {
    authorization_url: string;
    access_code: string;
    reference: string;
}

export interface RemixStats {
    totalRemixes: number;
    totalEarnings: number;
}

export interface WithdrawalHistoryItem {
    id: string;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    reference: string;
    createdAt: string;
    bankName?: string;
    accountNumber?: string;
}

export interface BalanceSummary {
    availableBalance: number;
    pendingBalance: number;
    totalBalance: number;
    currency: string;
}

export interface BankItem {
    name: string;
    code: string;
    slug: string;
}

export interface BankResolveResult {
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
}

export interface LinkedBank {
    bankName: string | null;
    bankCode: string | null;
    accountNumberLast4: string | null;
    accountName: string | null;
}

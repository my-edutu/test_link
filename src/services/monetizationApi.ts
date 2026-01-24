/**
 * Monetization API Service
 * Secure communication with NestJS backend for all monetization operations.
 * Uses JWT authentication via the authFetch utility.
 */

import { authFetch, parseResponse, getCurrentUserId } from './authFetch';

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

class MonetizationApi {
    /**
     * Submit a validation through the secure NestJS endpoint.
     * This ensures consensus logic and payouts are processed server-side.
     */
    async submitValidation(
        voiceClipId: string,
        isApproved: boolean,
        feedback?: string
    ): Promise<ValidationResult> {
        try {
            const response = await authFetch('/monetization/validate', {
                method: 'POST',
                body: JSON.stringify({
                    voiceClipId,
                    isApproved,
                    feedback,
                }),
            });

            return parseResponse<ValidationResult>(response);
        } catch (error) {
            console.error('MonetizationApi.submitValidation error:', error);
            throw error;
        }
    }

    /**
     * Flag a clip for admin review (Dispute Resolution).
     */
    async flagForReview(
        voiceClipId: string,
        reason: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const response = await authFetch('/monetization/flag', {
                method: 'POST',
                body: JSON.stringify({
                    voiceClipId,
                    reason,
                }),
            });

            return parseResponse(response);
        } catch (error) {
            console.error('MonetizationApi.flagForReview error:', error);
            throw error;
        }
    }

    /**
     * Get the validation queue (clips that need validation).
     */
    async getValidationQueue(limit: number = 10): Promise<ValidationQueueItem[]> {
        try {
            const response = await authFetch(`/monetization/queue?limit=${limit}`);
            return parseResponse<ValidationQueueItem[]>(response);
        } catch (error) {
            console.error('MonetizationApi.getValidationQueue error:', error);
            throw error;
        }
    }

    /**
     * Get user's validation history.
     */
    async getValidationHistory(limit: number = 20): Promise<ValidationHistoryItem[]> {
        try {
            const response = await authFetch(`/monetization/history?limit=${limit}`);
            return parseResponse<ValidationHistoryItem[]>(response);
        } catch (error) {
            console.error('MonetizationApi.getValidationHistory error:', error);
            throw error;
        }
    }

    /**
     * Get user's earnings summary.
     */
    async getEarningsSummary(): Promise<EarningsSummary> {
        try {
            const response = await authFetch('/monetization/earnings');
            return parseResponse<EarningsSummary>(response);
        } catch (error) {
            console.error('MonetizationApi.getEarningsSummary error:', error);
            throw error;
        }
    }

    /**
     * Initialize a Top-Up transaction.
     */
    async initializeTopUp(
        amount: number,
        email: string
    ): Promise<TopUpResult> {
        try {
            const response = await authFetch('/payments/top-up', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    email,
                }),
            });

            const json = await parseResponse<{ success: boolean; data: TopUpResult }>(response);
            return json.data;
        } catch (error) {
            console.error('MonetizationApi.initializeTopUp error:', error);
            throw error;
        }
    }

    /**
     * Create a remix/duet.
     */
    async createRemix(
        parentClipId: string,
        childClipId: string
    ): Promise<{ success: boolean; remixId: string }> {
        try {
            const response = await authFetch('/monetization/remix', {
                method: 'POST',
                body: JSON.stringify({
                    parentClipId,
                    childClipId,
                }),
            });

            return parseResponse(response);
        } catch (error) {
            console.error('MonetizationApi.createRemix error:', error);
            throw error;
        }
    }

    /**
     * Get remix stats for the current user.
     */
    async getRemixStats(): Promise<any> {
        try {
            const response = await authFetch('/monetization/remix/stats');
            return parseResponse(response);
        } catch (error) {
            console.error('MonetizationApi.getRemixStats error:', error);
            throw error;
        }
    }

    // =====================================================
    // WITHDRAWAL & BANK APIS
    // =====================================================

    /**
     * Request a withdrawal.
     */
    async requestWithdrawal(
        amount: number,
        bankCode: string,
        accountNumber: string,
        accountName: string,
        idempotencyKey?: string
    ): Promise<any> {
        try {
            const response = await authFetch('/withdrawals', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    bankCode,
                    accountNumber,
                    accountName,
                    idempotencyKey,
                }),
            });

            return parseResponse(response);
        } catch (error) {
            console.error('MonetizationApi.requestWithdrawal error:', error);
            throw error;
        }
    }

    /**
     * Get withdrawal history.
     */
    async getWithdrawals(limit: number = 20): Promise<any> {
        try {
            const response = await authFetch(`/withdrawals?limit=${limit}`);
            return parseResponse(response);
        } catch (error) {
            console.error('MonetizationApi.getWithdrawals error:', error);
            throw error;
        }
    }

    /**
     * Get balance summary.
     */
    async getBalanceSummary(): Promise<any> {
        try {
            const response = await authFetch('/withdrawals/balance');
            return parseResponse(response);
        } catch (error) {
            console.error('MonetizationApi.getBalanceSummary error:', error);
            throw error;
        }
    }

    /**
     * Get list of Nigerian banks.
     */
    async getBankList(): Promise<any[]> {
        try {
            // This is a public endpoint
            const response = await authFetch('/bank/list', { requireAuth: false });
            const data = await parseResponse<{ success: boolean; data: any[] }>(response);
            return data.data;
        } catch (error) {
            console.error('MonetizationApi.getBankList error:', error);
            throw error;
        }
    }

    /**
     * Resolve/verify a bank account.
     */
    async resolveBank(
        accountNumber: string,
        bankCode: string
    ): Promise<{ accountNumber: string; accountName: string; bankCode: string; bankName: string }> {
        try {
            const response = await authFetch('/bank/resolve', {
                method: 'POST',
                body: JSON.stringify({
                    accountNumber,
                    bankCode,
                }),
            });

            const data = await parseResponse<{ success: boolean; data: any }>(response);
            return data.data;
        } catch (error) {
            console.error('MonetizationApi.resolveBank error:', error);
            throw error;
        }
    }

    /**
     * Link a bank account.
     */
    async linkBank(
        accountNumber: string,
        bankCode: string
    ): Promise<{ accountName: string; bankName: string }> {
        try {
            const response = await authFetch('/bank/link', {
                method: 'POST',
                body: JSON.stringify({
                    accountNumber,
                    bankCode,
                }),
            });

            const data = await parseResponse<{ success: boolean; data: any }>(response);
            return data.data;
        } catch (error) {
            console.error('MonetizationApi.linkBank error:', error);
            throw error;
        }
    }

    /**
     * Get linked bank account.
     */
    async getLinkedBank(): Promise<any> {
        try {
            const response = await authFetch('/bank/linked');
            const data = await parseResponse<{ success: boolean; data: any }>(response);
            return data.data;
        } catch (error) {
            console.error('MonetizationApi.getLinkedBank error:', error);
            throw error;
        }
    }

    /**
     * Unlink bank account.
     */
    async unlinkBank(): Promise<void> {
        try {
            const response = await authFetch('/bank/unlink', {
                method: 'DELETE',
            });
            await parseResponse(response);
        } catch (error) {
            console.error('MonetizationApi.unlinkBank error:', error);
            throw error;
        }
    }
}

export const monetizationApi = new MonetizationApi();

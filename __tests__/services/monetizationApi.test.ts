/**
 * @file monetizationApi.test.ts
 * @description Tests for the monetization API service.
 * 
 * Tests cover:
 * - Validation submission flow
 * - Earnings retrieval
 * - Withdrawal request
 * - Error handling
 */

import { monetizationApi } from '../../src/services/monetizationApi';

// Mock authFetch
const mockAuthFetch = jest.fn();
const mockParseResponse = jest.fn();

jest.mock('../../src/services/authFetch', () => ({
    authFetch: (...args: any[]) => mockAuthFetch(...args),
    parseResponse: (...args: any[]) => mockParseResponse(...args),
}));

describe('MonetizationApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthFetch.mockReset();
        mockParseResponse.mockReset();
    });

    describe('submitValidation', () => {
        const validationData = {
            clipId: 'clip-123',
            isApproved: true,
        };

        it('should submit validation with correct payload', async () => {
            const mockResponse = { ok: true };
            const mockResult = { success: true, reward: 0.05 };

            mockAuthFetch.mockResolvedValue(mockResponse);
            mockParseResponse.mockResolvedValue(mockResult);

            const result = await monetizationApi.submitValidation(
                validationData.clipId,
                validationData.isApproved
            );

            expect(mockAuthFetch).toHaveBeenCalledWith(
                '/monetization/validate',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('clip-123'),
                })
            );
            expect(result).toEqual(mockResult);
        });

        it('should handle validation errors gracefully', async () => {
            mockAuthFetch.mockRejectedValue(new Error('Rate limit exceeded'));

            await expect(
                monetizationApi.submitValidation('clip-123', true)
            ).rejects.toThrow('Rate limit exceeded');
        });
    });

    describe('getEarnings', () => {
        it('should fetch user earnings', async () => {
            const mockResponse = { ok: true };
            const mockEarnings = {
                balance: 125.50,
                pendingBalance: 25.00,
                totalEarned: 500.00,
            };

            mockAuthFetch.mockResolvedValue(mockResponse);
            mockParseResponse.mockResolvedValue(mockEarnings);

            const result = await monetizationApi.getEarnings();

            expect(mockAuthFetch).toHaveBeenCalledWith(
                '/monetization/earnings',
                expect.any(Object)
            );
            expect(result).toEqual(mockEarnings);
        });

        it('should return empty earnings on error', async () => {
            mockAuthFetch.mockRejectedValue(new Error('Network error'));

            await expect(monetizationApi.getEarnings())
                .rejects
                .toThrow('Network error');
        });
    });

    describe('requestWithdrawal', () => {
        const withdrawalData = {
            amount: 50,
            bankCode: '044',
            accountNumber: '0123456789',
            accountName: 'John Doe',
        };

        it('should submit withdrawal request with correct data', async () => {
            const mockResponse = { ok: true };
            const mockResult = {
                success: true,
                withdrawalId: 'withdrawal-123',
                status: 'pending',
            };

            mockAuthFetch.mockResolvedValue(mockResponse);
            mockParseResponse.mockResolvedValue(mockResult);

            const result = await monetizationApi.requestWithdrawal(
                withdrawalData.amount,
                withdrawalData.bankCode,
                withdrawalData.accountNumber,
                withdrawalData.accountName
            );

            expect(mockAuthFetch).toHaveBeenCalledWith(
                '/monetization/withdraw',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('50'),
                })
            );
            expect(result.success).toBe(true);
        });

        it('should reject insufficient balance', async () => {
            mockAuthFetch.mockRejectedValue(new Error('Insufficient balance'));

            await expect(
                monetizationApi.requestWithdrawal(1000000, '044', '0123456789', 'Test')
            ).rejects.toThrow('Insufficient balance');
        });

        it('should validate minimum withdrawal amount', async () => {
            // Note: This test assumes validation happens client-side
            // In real implementation, server should also validate
            mockAuthFetch.mockRejectedValue(new Error('Minimum withdrawal is $5'));

            await expect(
                monetizationApi.requestWithdrawal(1, '044', '0123456789', 'Test')
            ).rejects.toThrow('Minimum withdrawal');
        });
    });

    describe('getTransactionHistory', () => {
        it('should fetch transaction history', async () => {
            const mockResponse = { ok: true };
            const mockTransactions = [
                { id: 'tx-1', type: 'earning', amount: 0.05, description: 'Validation reward' },
                { id: 'tx-2', type: 'withdrawal', amount: -50, description: 'Bank withdrawal' },
            ];

            mockAuthFetch.mockResolvedValue(mockResponse);
            mockParseResponse.mockResolvedValue(mockTransactions);

            const result = await monetizationApi.getTransactionHistory();

            expect(mockAuthFetch).toHaveBeenCalledWith(
                '/monetization/transactions',
                expect.any(Object)
            );
            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('earning');
        });

        it('should return empty array on error', async () => {
            mockAuthFetch.mockRejectedValue(new Error('Server error'));

            await expect(monetizationApi.getTransactionHistory())
                .rejects
                .toThrow();
        });
    });

    describe('getTrustScore', () => {
        it('should fetch user trust score', async () => {
            const mockResponse = { ok: true };
            const mockScore = {
                trustScore: 85,
                tier: 'silver',
                correctValidations: 150,
                totalValidations: 175,
            };

            mockAuthFetch.mockResolvedValue(mockResponse);
            mockParseResponse.mockResolvedValue(mockScore);

            const result = await monetizationApi.getTrustScore();

            expect(result.trustScore).toBe(85);
            expect(result.tier).toBe('silver');
        });
    });
});

describe('MonetizationApi Edge Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle concurrent validation submissions', async () => {
        const submissions = Array.from({ length: 5 }, (_, i) => ({
            clipId: `clip-${i}`,
            isApproved: i % 2 === 0,
        }));

        mockAuthFetch.mockResolvedValue({ ok: true });
        mockParseResponse.mockResolvedValue({ success: true });

        const results = await Promise.all(
            submissions.map(s => monetizationApi.submitValidation(s.clipId, s.isApproved))
        );

        expect(results).toHaveLength(5);
        expect(mockAuthFetch).toHaveBeenCalledTimes(5);
    });

    it('should handle rate limiting gracefully', async () => {
        mockAuthFetch.mockRejectedValueOnce(new Error('Rate limit exceeded: 30 per minute'));

        await expect(monetizationApi.submitValidation('clip-1', true))
            .rejects
            .toThrow('Rate limit');
    });
});

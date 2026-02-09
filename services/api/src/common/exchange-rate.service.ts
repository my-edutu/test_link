import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Exchange Rate Service
 * 
 * Provides USD to NGN exchange rates with:
 * - In-memory caching (1 hour TTL)
 * - Live API fetching from free exchange rate APIs
 * - Environment variable fallback
 * - Default fallback for reliability
 */
@Injectable()
export class ExchangeRateService {
    private readonly logger = new Logger(ExchangeRateService.name);

    // Cache configuration
    private cachedRate: number | null = null;
    private cacheTimestamp: number = 0;
    private readonly cacheTtlMs = 60 * 60 * 1000; // 1 hour

    // Default fallback rate
    private readonly defaultRate = 1500;

    constructor(private configService: ConfigService) { }

    /**
     * Get the current USD to NGN exchange rate.
     * Uses caching to minimize API calls.
     */
    async getUsdToNgnRate(): Promise<number> {
        // Check cache first
        if (this.isCacheValid()) {
            this.logger.debug(`Using cached exchange rate: ${this.cachedRate}`);
            return this.cachedRate!;
        }

        // Try to fetch live rate
        try {
            const liveRate = await this.fetchLiveRate();
            if (liveRate) {
                this.cachedRate = liveRate;
                this.cacheTimestamp = Date.now();
                this.logger.log(`Updated exchange rate: ${liveRate}`);
                return liveRate;
            }
        } catch (error) {
            this.logger.warn(`Failed to fetch live exchange rate: ${error}`);
        }

        // Fallback to environment variable
        const envRate = this.configService.get<number>('USD_TO_NGN_RATE');
        if (envRate) {
            this.logger.debug(`Using environment exchange rate: ${envRate}`);
            return envRate;
        }

        // Ultimate fallback
        this.logger.warn(`Using default exchange rate: ${this.defaultRate}`);
        return this.defaultRate;
    }

    /**
     * Convert USD to NGN.
     */
    async usdToNgn(amountUsd: number): Promise<number> {
        const rate = await this.getUsdToNgnRate();
        return amountUsd * rate;
    }

    /**
     * Convert NGN to USD.
     */
    async ngnToUsd(amountNgn: number): Promise<number> {
        const rate = await this.getUsdToNgnRate();
        return amountNgn / rate;
    }

    /**
     * Convert USD to kobo (smallest NGN unit).
     */
    async usdToKobo(amountUsd: number): Promise<number> {
        const ngnAmount = await this.usdToNgn(amountUsd);
        return Math.round(ngnAmount * 100);
    }

    /**
     * Convert kobo to USD.
     */
    async koboToUsd(amountKobo: number): Promise<number> {
        const ngnAmount = amountKobo / 100;
        return this.ngnToUsd(ngnAmount);
    }

    /**
     * Check if the cached rate is still valid.
     */
    private isCacheValid(): boolean {
        if (!this.cachedRate) return false;
        return Date.now() - this.cacheTimestamp < this.cacheTtlMs;
    }

    /**
     * Fetch live exchange rate from free APIs.
     * Tries multiple sources for reliability.
     */
    private async fetchLiveRate(): Promise<number | null> {
        // Check if API key is configured for premium service
        const apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');

        const sources = [
            // Free API - exchangerate.host (no key required)
            async () => {
                const response = await fetch(
                    'https://api.exchangerate.host/latest?base=USD&symbols=NGN',
                    { signal: AbortSignal.timeout(5000) }
                );
                const data = await response.json();
                if (data.success && data.rates?.NGN) {
                    return data.rates.NGN;
                }
                return null;
            },

            // Free API - frankfurter.app (no key required)
            async () => {
                const response = await fetch(
                    'https://api.frankfurter.app/latest?from=USD&to=NGN',
                    { signal: AbortSignal.timeout(5000) }
                );
                const data = await response.json();
                if (data.rates?.NGN) {
                    return data.rates.NGN;
                }
                return null;
            },

            // Premium API - exchangerate-api.com (key required)
            async () => {
                if (!apiKey) return null;
                const response = await fetch(
                    `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
                    { signal: AbortSignal.timeout(5000) }
                );
                const data = await response.json();
                if (data.result === 'success' && data.conversion_rates?.NGN) {
                    return data.conversion_rates.NGN;
                }
                return null;
            },
        ];

        // Try each source until one succeeds
        for (const fetchFn of sources) {
            try {
                const rate = await fetchFn();
                if (rate && rate > 0) {
                    return rate;
                }
            } catch (error) {
                // Continue to next source
                this.logger.debug(`Exchange rate source failed: ${error}`);
            }
        }

        return null;
    }

    /**
     * Force refresh the cached rate.
     */
    async refreshRate(): Promise<number> {
        this.cachedRate = null;
        this.cacheTimestamp = 0;
        return this.getUsdToNgnRate();
    }

    /**
     * Get rate info for debugging/display.
     */
    getRateInfo(): { rate: number | null; cachedAt: Date | null; source: string } {
        return {
            rate: this.cachedRate,
            cachedAt: this.cacheTimestamp ? new Date(this.cacheTimestamp) : null,
            source: this.cachedRate ? 'cache' : 'not loaded',
        };
    }
}

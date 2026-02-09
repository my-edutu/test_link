import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encryption Service
 * 
 * Provides AES-256-CBC encryption for sensitive data like bank account numbers.
 * 
 * IMPORTANT: Set ENCRYPTION_KEY in your environment variables.
 * Generate a secure key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;

    constructor(private configService: ConfigService) {
        const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

        if (!encryptionKey) {
            throw new Error(
                'ENCRYPTION_KEY environment variable is required. ' +
                'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
            );
        }

        // Ensure key is exactly 32 bytes (256 bits) for AES-256
        this.key = Buffer.from(encryptionKey, 'hex');

        if (this.key.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
        }
    }

    /**
     * Encrypt a plaintext string.
     * Returns format: iv:encryptedData (both in hex)
     */
    encrypt(plaintext: string): string {
        if (!plaintext) {
            return '';
        }

        // Generate a random IV for each encryption (crucial for security)
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Prepend IV for decryption (IV doesn't need to be secret)
        return `${iv.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypt an encrypted string.
     * Expects format: iv:encryptedData (both in hex)
     */
    decrypt(encryptedText: string): string {
        if (!encryptedText || !encryptedText.includes(':')) {
            return '';
        }

        try {
            const [ivHex, encrypted] = encryptedText.split(':');
            const iv = Buffer.from(ivHex, 'hex');

            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            // Log error but don't expose details
            console.error('Decryption failed:', error instanceof Error ? error.message : 'Unknown error');
            return '';
        }
    }

    /**
     * Hash a value for lookups (one-way).
     * Use this when you need to search for encrypted values.
     */
    hash(value: string): string {
        if (!value) {
            return '';
        }
        return crypto.createHmac('sha256', this.key).update(value).digest('hex');
    }

    /**
     * Mask a value for display (e.g., show last 4 digits).
     */
    maskAccountNumber(accountNumber: string, visibleDigits: number = 4): string {
        if (!accountNumber || accountNumber.length <= visibleDigits) {
            return accountNumber;
        }
        const masked = '*'.repeat(accountNumber.length - visibleDigits);
        const visible = accountNumber.slice(-visibleDigits);
        return masked + visible;
    }
}

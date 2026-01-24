import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { UserBadgeDto } from './badges.service';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class CertificateService {
    private readonly logger = new Logger(CertificateService.name);
    private supabase;

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private configService: ConfigService,
    ) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
        }
    }

    /**
     * Generate a PDF certificate for a badge and upload to Supabase Storage.
     * Returns the public URL of the certificate.
     */
    async generateCertificate(
        userId: string,
        badge: UserBadgeDto,
    ): Promise<string> {
        // Get user profile for the certificate
        const [profile] = await this.db
            .select({
                fullName: schema.profiles.fullName,
                username: schema.profiles.username,
            })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, userId))
            .limit(1);

        const userName = profile?.fullName || profile?.username || 'LinguaLink User';
        const earnedDate = new Date(badge.earnedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        // Generate PDF
        const pdfBuffer = await this.createPDF(userName, badge, earnedDate);

        // Upload to Supabase Storage
        const fileName = `certificates/${userId}/${badge.id}_${Date.now()}.pdf`;

        if (!this.supabase) {
            this.logger.warn('Supabase not configured, returning placeholder URL');
            return `https://placeholder.com/certificate/${badge.id}`;
        }

        const { data, error } = await this.supabase.storage
            .from('certificates')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (error) {
            this.logger.error('Failed to upload certificate:', error);
            throw new Error('Failed to generate certificate');
        }

        // Get public URL
        const { data: urlData } = this.supabase.storage
            .from('certificates')
            .getPublicUrl(fileName);

        this.logger.log(`Certificate generated: ${urlData.publicUrl}`);
        return urlData.publicUrl;
    }

    /**
     * Create a PDF document for the certificate.
     */
    private createPDF(
        userName: string,
        badge: UserBadgeDto,
        earnedDate: string,
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    layout: 'landscape',
                    margin: 50,
                });

                const chunks: Buffer[] = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Certificate design
                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;

                // Background gradient effect (border)
                doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
                    .lineWidth(3)
                    .strokeColor('#ff6d00')
                    .stroke();

                doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
                    .lineWidth(1)
                    .strokeColor('#1c1022')
                    .stroke();

                // Header
                doc.fontSize(16)
                    .fillColor('#ff6d00')
                    .text('LINGUALINK', 0, 60, { align: 'center' });

                // Title
                doc.fontSize(42)
                    .fillColor('#1c1022')
                    .text('Certificate of Achievement', 0, 100, { align: 'center' });

                // Decorative line
                doc.moveTo(pageWidth / 2 - 150, 160)
                    .lineTo(pageWidth / 2 + 150, 160)
                    .lineWidth(2)
                    .strokeColor('#ff6d00')
                    .stroke();

                // Body text
                doc.fontSize(18)
                    .fillColor('#333')
                    .text('This is to certify that', 0, 200, { align: 'center' });

                // User name
                doc.fontSize(36)
                    .fillColor('#1c1022')
                    .font('Helvetica-Bold')
                    .text(userName, 0, 240, { align: 'center' });

                // Achievement text
                doc.fontSize(18)
                    .fillColor('#333')
                    .font('Helvetica')
                    .text('has successfully earned the', 0, 300, { align: 'center' });

                // Badge name
                doc.fontSize(32)
                    .fillColor('#ff6d00')
                    .font('Helvetica-Bold')
                    .text(badge.name, 0, 340, { align: 'center' });

                // Badge description
                doc.fontSize(14)
                    .fillColor('#666')
                    .font('Helvetica')
                    .text(badge.description, 100, 390, {
                        align: 'center',
                        width: pageWidth - 200,
                    });

                // Date
                doc.fontSize(14)
                    .fillColor('#333')
                    .text(`Awarded on ${earnedDate}`, 0, 450, { align: 'center' });

                // Footer
                doc.fontSize(10)
                    .fillColor('#999')
                    .text(
                        'This certificate validates the achievement earned through the LinguaLink language preservation platform.',
                        0,
                        pageHeight - 80,
                        { align: 'center' },
                    );

                // Certificate ID
                doc.fontSize(8)
                    .fillColor('#ccc')
                    .text(`Certificate ID: ${badge.id}`, 0, pageHeight - 50, { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}

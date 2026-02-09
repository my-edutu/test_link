import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // Global prefix for API versioning
    app.setGlobalPrefix('api/v1');

    // Enable CORS for mobile app
    // SECURITY: In production, only allow specific origins
    const allowedOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'];

    app.enableCors({
        origin: process.env.NODE_ENV === 'production'
            ? (origin, callback) => {
                // Allow requests with no origin (mobile apps, Postman, etc.)
                if (!origin) return callback(null, true);
                // Check against whitelist
                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            }
            : true, // Allow all origins in development
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    // Global validation pipe for all incoming requests
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true, // Strip unknown properties
        forbidNonWhitelisted: true, // Throw if unknown properties present
        transform: true, // Automatically transform payloads to DTO instances
        transformOptions: {
            enableImplicitConversion: true, // Convert query params to correct types
        },
    }));

    // Swagger API Documentation
    const config = new DocumentBuilder()
        .setTitle('LinguaLink API')
        .setDescription('Backend API for LinguaLink language learning platform')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Auth', 'Authentication endpoints')
        .addTag('Monetization', 'Rewards and validation consensus')
        .addTag('Live', 'Live streaming and video calls')
        .addTag('Payments', 'Withdrawals and top-ups')
        .addTag('Badges', 'Achievements and certificates')
        .addTag('Ambassador', 'Referral program')
        .addTag('Moderation', 'Content safety and reporting')
        .addTag('Notifications', 'Push notifications')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 LinguaLink Hybrid Backend running on: http://localhost:${port}`);
    logger.log(`📋 JWT Auth: ${process.env.SUPABASE_JWT_SECRET ? 'Configured' : '⚠️  NOT CONFIGURED'}`);
    logger.log(`🌐 CORS Mode: ${process.env.NODE_ENV === 'production' ? 'Production (whitelisted origins)' : 'Development (all origins)'}`);
    logger.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();

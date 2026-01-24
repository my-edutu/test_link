import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // Enable CORS for mobile app
    app.enableCors({
        origin: '*', // In production, specify allowed origins
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
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

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 LinguaLink Hybrid Backend running on: http://localhost:${port}`);
    logger.log(`📋 JWT Auth: ${process.env.SUPABASE_JWT_SECRET ? 'Configured' : '⚠️  NOT CONFIGURED'}`);
    logger.log(`🔒 Legacy Auth: ${process.env.ALLOW_LEGACY_AUTH === 'true' ? 'Allowed (deprecated)' : 'Disabled'}`);
}
bootstrap();

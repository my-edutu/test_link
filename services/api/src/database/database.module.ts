import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

@Global()
@Module({
    providers: [
        {
            provide: 'DRIZZLE',
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const connectionString = configService.get<string>('DATABASE_URL');
                if (!connectionString) {
                    console.warn('DATABASE_URL not found, using default developer Postgres URL');
                }
                // Using { prepare: false } for Supabase pooler compatibility (Transaction mode)
                const client = postgres(connectionString || 'postgres://postgres:postgres@localhost:5432/postgres', {
                    prepare: false
                });
                return drizzle(client, { schema });
            },
        },
    ],
    exports: ['DRIZZLE'],
})
export class DatabaseModule { }

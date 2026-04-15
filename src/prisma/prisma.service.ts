import 'dotenv/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super(); // Prisma 7 will read DATABASE_URL from prisma.config.ts
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ [Prisma 6] Connected to Supabase!');
    } catch (err) {
      console.error('❌ [Prisma 6] Connection error:', err);
    }
  }
}

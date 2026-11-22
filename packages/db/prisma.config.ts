import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Single source of truth for environment: the repo-root .env
config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
});

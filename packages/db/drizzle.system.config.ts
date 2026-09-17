import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/system.schema.ts',
  out: './src/migrations/system',
});

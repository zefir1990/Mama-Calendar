import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const serverEnvironmentPath = join(__dirname, '..', '..', 'server-rust', '.env');

if (typeof process.loadEnvFile === 'function' && existsSync(serverEnvironmentPath)) {
  process.loadEnvFile(serverEnvironmentPath);
}

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:8090',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});

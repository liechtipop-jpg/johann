import { defineConfig, devices } from '@playwright/test';

// Vorher bauen: npm run build. Die Tests laufen gegen «vite preview» (mit Service Worker).
export default defineConfig({
  testDir: './e2e',
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'e2e', testIgnore: /screenshots\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'screenshots', testMatch: /screenshots\.spec\.ts/ },
  ],
});

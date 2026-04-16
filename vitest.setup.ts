import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import 'dotenv/config';

// Mock environment variables for tests
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = 'test';
env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock fetch globally if needed
global.fetch = vi.fn();

beforeAll(() => {
  console.log('🧪 Test suite starting...');
});

afterAll(() => {
  console.log('✅ Test suite completed');
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

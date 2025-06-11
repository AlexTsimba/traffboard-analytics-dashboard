import { vi } from 'vitest'

// Global mock setup for logger
vi.mock('/src/lib/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  api: vi.fn(),
  db: vi.fn(),
  auth: vi.fn(),
  cache: vi.fn(),
  performance: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    api: vi.fn(),
    db: vi.fn(),
    auth: vi.fn(),
    cache: vi.fn(),
    performance: vi.fn(),
  }
}))

// Global mock setup for Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

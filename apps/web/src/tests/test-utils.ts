import { vi } from 'vitest'

/**
 * Universal logger mock for testing
 * Use this to mock the logger module in tests that use logging functions
 */
export const createLoggerMock = () => {
  const loggerMock = {
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

  // Mock the entire logger module
  vi.mock('@/lib/logger', () => ({
    ...loggerMock,
    logger: loggerMock,
  }))

  return loggerMock
}

/**
 * Revalidation mock for testing cache-related functionality
 */
export const createRevalidationMock = () => {
  const revalidateMock = {
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  }

  vi.mock('next/cache', () => revalidateMock)

  return revalidateMock
}

/**
 * Complete test setup for actions that use logging and cache revalidation
 */
export const createActionTestSetup = () => {
  const loggerMock = createLoggerMock()
  const revalidateMock = createRevalidationMock()

  return {
    ...loggerMock,
    ...revalidateMock,
  }
}

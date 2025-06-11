import { describe, test, expect, vi, beforeEach } from 'vitest'
import { 
  revalidateAnalyticsOverview,
  revalidateConversions,
  revalidatePlayers,
  revalidateAllDashboard,
  getCacheConfig,
  CACHE_TAGS,
  CACHE_PATHS
} from '@/lib/cache'

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// Mock the logger module
vi.mock('@/lib/logger', () => ({
  cache: vi.fn(),
  logger: {
    cache: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}))

const { revalidatePath, revalidateTag } = await import('next/cache')
const { cache: cacheLogger } = await import('@/lib/logger')

describe('Cache Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Cache Configuration', () => {
    test('should return correct cache config for overview', () => {
      const config = getCacheConfig('overview')
      
      expect(config).toEqual({
        revalidate: 900,
        staleWhileRevalidate: 450,
        tags: ['analytics-overview', 'dashboard'],
      })
    })

    test('should return correct cache config for conversions', () => {
      const config = getCacheConfig('conversions')
      
      expect(config).toEqual({
        revalidate: 900,
        staleWhileRevalidate: 450,
        tags: ['analytics-overview', 'conversions', 'dashboard'],
      })
    })

    test('should return correct cache config for players', () => {
      const config = getCacheConfig('players')
      
      expect(config).toEqual({
        revalidate: 900,
        staleWhileRevalidate: 450,
        tags: ['analytics-overview', 'players', 'dashboard'],
      })
    })
  })

  describe('Cache Tags', () => {
    test('should have correct cache tag constants', () => {
      expect(CACHE_TAGS.ANALYTICS_OVERVIEW).toBe('analytics-overview')
      expect(CACHE_TAGS.CONVERSIONS).toBe('conversions')
      expect(CACHE_TAGS.PLAYERS).toBe('players')
      expect(CACHE_TAGS.DASHBOARD).toBe('dashboard')
    })
  })

  describe('Cache Paths', () => {
    test('should have correct cache path constants', () => {
      expect(CACHE_PATHS.DASHBOARD).toBe('/dashboard')
      expect(CACHE_PATHS.CONVERSIONS).toBe('/dashboard/conversions')
      expect(CACHE_PATHS.PLAYERS).toBe('/dashboard/players')
    })
  })

  describe('Individual Revalidation Functions', () => {
    test('should revalidate analytics overview cache', async () => {
      await revalidateAnalyticsOverview()

      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.ANALYTICS_OVERVIEW)
      expect(revalidatePath).toHaveBeenCalledWith(CACHE_PATHS.DASHBOARD)
      expect(cacheLogger).toHaveBeenCalledWith('invalidate', 'analytics-overview')
    })

    test('should revalidate conversions cache', async () => {
      await revalidateConversions()

      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.CONVERSIONS)
      expect(revalidatePath).toHaveBeenCalledWith(CACHE_PATHS.CONVERSIONS)
      expect(cacheLogger).toHaveBeenCalledWith('invalidate', 'conversions')
    })

    test('should revalidate players cache', async () => {
      await revalidatePlayers()

      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.PLAYERS)
      expect(revalidatePath).toHaveBeenCalledWith(CACHE_PATHS.PLAYERS)
      expect(cacheLogger).toHaveBeenCalledWith('invalidate', 'players')
    })

    test('should handle revalidation errors gracefully', async () => {
      const mockError = new Error('Revalidation failed')
      vi.mocked(revalidateTag).mockImplementationOnce(() => {
        throw mockError
      })

      await revalidateAnalyticsOverview()

      expect(cacheLogger).toHaveBeenCalledWith('error', 'revalidateAnalyticsOverview', 
        { error: mockError.message })
    })
  })

  describe('Complete Dashboard Revalidation', () => {
    test('should revalidate all dashboard cache', async () => {
      await revalidateAllDashboard()

      // Should call individual revalidation functions
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.ANALYTICS_OVERVIEW)
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.CONVERSIONS)
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.PLAYERS)
      expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.DASHBOARD)

      // Should call path revalidation
      expect(revalidatePath).toHaveBeenCalledWith(CACHE_PATHS.DASHBOARD)
      expect(revalidatePath).toHaveBeenCalledWith(CACHE_PATHS.CONVERSIONS)
      expect(revalidatePath).toHaveBeenCalledWith(CACHE_PATHS.PLAYERS)

      expect(cacheLogger).toHaveBeenCalledWith('invalidate', 'all-dashboard')
    })

    test('should handle dashboard revalidation errors', async () => {
      const mockError = new Error('Dashboard revalidation failed')
      vi.mocked(revalidateTag).mockImplementation(() => {
        throw mockError
      })

      await revalidateAllDashboard()

      expect(cacheLogger).toHaveBeenCalledWith('error', 'revalidateAllDashboard', 
        { error: mockError.message })
    })
  })

  describe('Cache Performance', () => {
    test('should have consistent revalidation intervals', () => {
      const overviewConfig = getCacheConfig('overview')
      const conversionsConfig = getCacheConfig('conversions')
      const playersConfig = getCacheConfig('players')

      // All configs use standard settings now
      expect(overviewConfig.revalidate).toBeGreaterThan(0)
      expect(conversionsConfig.revalidate).toBeGreaterThan(0)
      expect(playersConfig.revalidate).toBeGreaterThan(0)
    })

    test('should include appropriate cache tags for each data type', () => {
      const overviewConfig = getCacheConfig('overview')
      const conversionsConfig = getCacheConfig('conversions')
      const playersConfig = getCacheConfig('players')

      // All should include dashboard tag
      expect(overviewConfig.tags).toContain(CACHE_TAGS.DASHBOARD)
      expect(conversionsConfig.tags).toContain(CACHE_TAGS.DASHBOARD)
      expect(playersConfig.tags).toContain(CACHE_TAGS.DASHBOARD)

      // Each should include its specific tag
      expect(overviewConfig.tags).toContain(CACHE_TAGS.ANALYTICS_OVERVIEW)
      expect(conversionsConfig.tags).toContain(CACHE_TAGS.CONVERSIONS)
      expect(playersConfig.tags).toContain(CACHE_TAGS.PLAYERS)
    })
  })

  describe('Cache Timing Validation', () => {
    test('should have reasonable cache durations', () => {
      const overviewConfig = getCacheConfig('overview')
      const conversionsConfig = getCacheConfig('conversions')
      const playersConfig = getCacheConfig('players')

      // Cache durations should be in reasonable ranges (updated to match new implementation)
      expect(overviewConfig.revalidate).toBe(900) // 15 minutes
      expect(conversionsConfig.revalidate).toBe(900) // 15 minutes
      expect(playersConfig.revalidate).toBe(900) // 15 minutes

      // Stale-while-revalidate should be reasonable
      expect(overviewConfig.staleWhileRevalidate).toBe(450) // 7.5 minutes
      expect(conversionsConfig.staleWhileRevalidate).toBe(450) // 7.5 minutes
      expect(playersConfig.staleWhileRevalidate).toBe(450) // 7.5 minutes
    })
  })
})

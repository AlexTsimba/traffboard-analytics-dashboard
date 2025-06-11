/**
 * Shared types and validation schemas for dashboard actions
 * Extracted from monolithic dashboard-actions.ts for better maintainability
 */

import { z } from 'zod'

export interface ActionState {
  message?: string
  errors?: Record<string, string[]>
  data?: any
}

export interface DashboardFilters {
  dateRange?: {
    from?: string
    to?: string
  }
  partners?: string[]
  campaigns?: string[]
  countries?: string[]
  osFamilies?: string[]
  sources?: string[]
  landingIds?: string[]
}

export interface MetricViewSettings {
  chartType: 'area' | 'line' | 'bar' | 'funnel'
  metricGroup: 'general' | 'visit-to-reg' | 'reg-to-ftd' | 'quality'
  timeGranularity: 'daily' | 'weekly' | 'monthly'
}

// Validation schemas
export const dashboardFilterSchema = z.object({
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),
  partners: z.array(z.string()).optional(),
  campaigns: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  osFamilies: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  landingIds: z.array(z.string()).optional(),
})

export const metricViewSchema = z.object({
  chartType: z.enum(['area', 'line', 'bar', 'funnel']),
  metricGroup: z.enum(['general', 'visit-to-reg', 'reg-to-ftd', 'quality']),
  timeGranularity: z.enum(['daily', 'weekly', 'monthly']),
})

export const exportRequestSchema = z.object({
  dataType: z.enum(['conversions', 'players', 'analytics']),
  format: z.enum(['csv', 'excel', 'pdf']),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
  filters: dashboardFilterSchema.optional(),
})

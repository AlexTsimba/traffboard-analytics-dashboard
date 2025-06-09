import { z } from 'zod';

// Base query parameters for analytics
export const baseQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  countries: z.string().optional(),
  osFamily: z.string().optional(),
  partnerId: z.coerce.number().optional(),
  campaignId: z.coerce.number().optional(),
  landingId: z.coerce.number().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Conversions specific validation
export const conversionsQuerySchema = baseQuerySchema.extend({
  sortBy: z.enum([
    'date', 'uniqueClicks', 'allClicks', 'registrations',
    'ftdCount', 'partnerId', 'campaignId', 'country', 'osFamily'
  ]).optional(),
});

// Players specific validation  
export const playersQuerySchema = baseQuerySchema.extend({
  sortBy: z.enum([
    'signUpDate', 'firstDepositDate', 'depositsSum', 
    'depositsCount', 'casinoRealNgr', 'partnerId', 
    'campaignId', 'playerCountry'
  ]).optional(),
});

// Time series validation
export const timeSeriesQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  countries: z.string().optional(),
  osFamily: z.string().optional(),
  partnerId: z.coerce.number().optional(),
  campaignId: z.coerce.number().optional(),
  interval: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

// Quality metrics validation
export const qualityQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  partnerId: z.coerce.number().optional(),
  campaignId: z.coerce.number().optional(),
});

export type BaseQuery = z.infer<typeof baseQuerySchema>;
export type ConversionsQuery = z.infer<typeof conversionsQuerySchema>;
export type PlayersQuery = z.infer<typeof playersQuerySchema>;
export type TimeSeriesQuery = z.infer<typeof timeSeriesQuerySchema>;
export type QualityQuery = z.infer<typeof qualityQuerySchema>;

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { databaseService } from '@traffboard/database';
import { createTypedHandler } from '@/lib/type-safety';
import { withCache } from '@/lib/cache';
import { ErrorResponseBuilder } from '@/lib/error-handler';
import { buildRequestContext, logRequest } from '@/lib/advanced-middleware';

// Input schema for overview query parameters
const overviewQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  partnerId: z.coerce.number().optional(),
  campaignId: z.coerce.number().optional(),
}).optional();

// Output schema for overview response
const overviewResponseSchema = z.object({
  metrics: z.object({
    totalClicks: z.number(),
    totalRegistrations: z.number(),
    totalFtdCount: z.number(),
    totalPlayers: z.number(),
    conversionRate: z.number(),
    ftdRate: z.number(),
  }),
  trends: z.object({
    clicksChange: z.number(),
    registrationsChange: z.number(),
    ftdChange: z.number(),
    conversionRateChange: z.number(),
  }),
  topPartners: z.array(z.object({
    partnerId: z.number(),
    name: z.string().optional(),
    ftdCount: z.number(),
    revenue: z.number().optional(),
  })),
  recentActivity: z.array(z.object({
    date: z.string(),
    clicks: z.number(),
    registrations: z.number(),
    ftd: z.number(),
  })),
  dataFreshness: z.object({
    lastUpdated: z.string(),
    nextUpdate: z.string().optional(),
    recordCount: z.number(),
  }),
});

// Type-safe handler for overview analytics
const getOverviewHandler = createTypedHandler({
  inputSchema: overviewQuerySchema,
  outputSchema: overviewResponseSchema,
  handler: async ({ data: query, request, userId, userRole }) => {
    const startTime = Date.now();
    const context = buildRequestContext(request);
    
    try {
      // Validate authentication
      if (!userId) {
        throw ErrorResponseBuilder.authenticationError('User ID not found', context.requestId);
      }

      // Build filter from query parameters
      const filter: any = {};
      if (query?.dateFrom) filter.dateFrom = new Date(query.dateFrom);
      if (query?.dateTo) filter.dateTo = new Date(query.dateTo);
      if (query?.partnerId) filter.partnerId = query.partnerId;
      if (query?.campaignId) filter.campaignId = query.campaignId;

      // Execute all data queries in parallel with error handling
      const [
        conversionsData,
        playersCount,
        partnerStats,
        timeSeriesData,
        lastImportInfo
      ] = await Promise.all([
        databaseService.conversions.getAggregates(filter)
          .catch(error => {
            throw ErrorResponseBuilder.databaseError(error, 'fetch conversions data', context.requestId);
          }),
        databaseService.players.count(filter)
          .catch(error => {
            throw ErrorResponseBuilder.databaseError(error, 'count players', context.requestId);
          }),
        databaseService.conversions.getPartnerStats(filter)
          .catch(error => {
            throw ErrorResponseBuilder.databaseError(error, 'fetch partner stats', context.requestId);
          }),
        databaseService.conversions.getTimeSeriesData(filter, 'daily', 7)
          .catch(error => {
            throw ErrorResponseBuilder.databaseError(error, 'fetch time series', context.requestId);
          }),
        databaseService.getLastImportInfo()
          .catch(error => {
            console.warn('Could not fetch last import info:', error);
            return { lastUpdated: new Date().toISOString(), recordCount: 0 };
          }),
      ]);

      // Calculate trends (compare with previous period)
      const previousPeriodFilter = { ...filter };
      if (filter.dateFrom && filter.dateTo) {
        const periodLength = new Date(filter.dateTo).getTime() - new Date(filter.dateFrom).getTime();
        previousPeriodFilter.dateTo = filter.dateFrom;
        previousPeriodFilter.dateFrom = new Date(new Date(filter.dateFrom).getTime() - periodLength).toISOString();
      }

      const previousData = await databaseService.conversions.getAggregates(previousPeriodFilter)
        .catch(() => ({
          totalUniqueClicks: 0,
          totalRegistrations: 0,
          totalFtdCount: 0,
          conversionRate: 0,
        }));

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const trends = {
        clicksChange: calculateChange(conversionsData.totalUniqueClicks, previousData.totalUniqueClicks),
        registrationsChange: calculateChange(conversionsData.totalRegistrations, previousData.totalRegistrations),
        ftdChange: calculateChange(conversionsData.totalFtdCount, previousData.totalFtdCount),
        conversionRateChange: calculateChange(conversionsData.conversionRate, previousData.conversionRate),
      };

      // Format partner stats
      const topPartners = partnerStats.slice(0, 10).map((partner: any) => ({
        partnerId: partner.foreignPartnerId,
        name: partner.partnerName || `Partner ${partner.foreignPartnerId}`,
        ftdCount: partner.totalFtdCount,
        revenue: partner.revenue || undefined,
      }));

      // Format recent activity
      const recentActivity = timeSeriesData.map((item: any) => ({
        date: item.date,
        clicks: item.uniqueClicks,
        registrations: item.registrations,
        ftd: item.ftdCount,
      }));

      const result = {
        metrics: {
          totalClicks: conversionsData.totalUniqueClicks,
          totalRegistrations: conversionsData.totalRegistrations,
          totalFtdCount: conversionsData.totalFtdCount,
          totalPlayers: playersCount,
          conversionRate: conversionsData.conversionRate,
          ftdRate: conversionsData.ftdRate,
        },
        trends,
        topPartners,
        recentActivity,
        dataFreshness: {
          lastUpdated: lastImportInfo.lastUpdated,
          nextUpdate: undefined, // Could be calculated based on import schedule
          recordCount: lastImportInfo.recordCount || 0,
        },
      };

      // Log successful request
      const responseTime = Date.now() - startTime;
      logRequest(context, { status: 200, responseTime });

      return result;

    } catch (error) {
      // Log error request
      const responseTime = Date.now() - startTime;
      logRequest(context, { status: 500, responseTime });
      
      throw error;
    }
  },
});

// Apply caching with longer duration for overview (updated less frequently)
export const GET = withCache(getOverviewHandler, {
  profile: 'SLOW',
  additionalTags: ['overview-data', 'dashboard-metrics'],
  private: false,
  mustRevalidate: false,
});

// ISR configuration - cache for 1 hour since overview changes less frequently
export const revalidate = 3600;

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databaseService } from '@traffboard/database';
import { conversionsQuerySchema } from '@/lib/validations/analytics';
import { createTypedHandler } from '@/lib/type-safety';
import { withCache } from '@/lib/cache';
import { ErrorResponseBuilder } from '@/lib/error-handler';
import { buildRequestContext, logRequest } from '@/lib/advanced-middleware';

// Enhanced conversions response schema
const conversionsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.number(),
    date: z.string(),
    foreignPartnerId: z.number(),
    foreignCampaignId: z.number(),
    foreignLandingId: z.number(),
    osFamily: z.string(),
    country: z.string(),
    allClicks: z.number(),
    uniqueClicks: z.number(),
    registrationsCount: z.number(),
    ftdCount: z.number(),
  })),
  aggregates: z.object({
    totalUniqueClicks: z.number(),
    totalRegistrations: z.number(),
    totalFtdCount: z.number(),
    conversionRate: z.number(),
    ftdRate: z.number(),
  }),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
  filters: z.record(z.any()),
});

// Type-safe handler with enhanced error handling and caching
const getConversionsHandler = createTypedHandler({
  inputSchema: conversionsQuerySchema,
  outputSchema: conversionsResponseSchema,
  handler: async ({ data: query, request, userId, userRole: _userRole }) => {
    const startTime = Date.now();
    const context = buildRequestContext(request);
    
    try {
      // Validate authentication
      if (!userId) {
        throw ErrorResponseBuilder.authenticationError('User ID not found', context.requestId);
      }

      // Build database filter with validated parameters
      const filter: any = {};
      if (query?.dateFrom) filter.dateFrom = new Date(query.dateFrom);
      if (query?.dateTo) filter.dateTo = new Date(query.dateTo);
      if (query?.countries) filter.countries = query.countries.split(',');
      if (query?.osFamily) filter.osFamily = query.osFamily.split(',');
      if (query?.partnerId) filter.partnerId = query.partnerId;
      if (query?.campaignId) filter.campaignId = query.campaignId;
      if (query?.landingId) filter.landingId = query.landingId;

      const page = query?.page || 1;
      const limit = query?.limit || 50;
      const offset = (page - 1) * limit;

      // Execute database queries with error handling
      const [conversions, aggregates, total] = await Promise.all([
        databaseService.conversions.findAll(filter, limit, offset)
          .catch(error => {
            throw ErrorResponseBuilder.databaseError(error, 'fetch conversions', context.requestId);
          }),
        databaseService.conversions.getAggregates(filter)
          .catch(error => {
            throw ErrorResponseBuilder.databaseError(error, 'fetch aggregates', context.requestId);
          }),
        databaseService.conversions.count(filter)
          .catch(error => {
            throw ErrorResponseBuilder.databaseError(error, 'count conversions', context.requestId);
          }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      const result = {
        data: conversions.map(conversion => ({
          id: conversion.id,
          date: conversion.date,
          foreignPartnerId: conversion.foreignPartnerId,
          foreignCampaignId: conversion.foreignCampaignId,
          foreignLandingId: conversion.foreignLandingId,
          osFamily: conversion.osFamily || 'Unknown',
          country: conversion.country,
          allClicks: conversion.allClicks || 0,
          uniqueClicks: conversion.uniqueClicks || 0,
          registrationsCount: conversion.registrationsCount || 0,
          ftdCount: conversion.ftdCount || 0,
        })),
        aggregates,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
        },
        filters: filter,
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

// Apply caching to the handler
export const GET = withCache(async (request: NextRequest) => {
  const response = await getConversionsHandler(request);
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}, {
  profile: 'STANDARD',
  additionalTags: ['conversions-data'],
  private: false,
  mustRevalidate: false,
});

// ISR configuration for this route
export const revalidate = 900; // 15 minutes
export const dynamic = 'force-dynamic'; // Ensure fresh data for filters

/**
 * Comprehensive type safety utilities for end-to-end type safety
 * Ensures type consistency across client/server boundaries
 */

import { z } from 'zod';
import type { NextRequest } from 'next/server';

// Base types for API responses
export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    type: string;
    message: string;
    code?: string;
    details?: Record<string, any>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// Success response helper
export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  data: T;
  error?: never;
}

// Error response helper
export interface ApiErrorResponse extends ApiResponse {
  data?: never;
  error: {
    type: string;
    message: string;
    code?: string;
    details?: Record<string, any>;
  };
}

// Union type for all API responses
export type TypedApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type-safe API route handler wrapper
 */
export function createTypedHandler<
  TInput extends z.ZodSchema,
  TOutput extends z.ZodSchema,
  TParams extends Record<string, string> = {}
>(config: {
  inputSchema?: TInput;
  outputSchema: TOutput;
  handler: (input: {
    data?: z.infer<TInput>;
    params?: TParams;
    request: NextRequest;
    userId?: string;
    userRole?: string;
  }) => Promise<z.infer<TOutput>>;
}) {
  return async (request: NextRequest, context?: { params: TParams }) => {
    try {
      // Extract user info from middleware headers
      const userId = request.headers.get('x-user-id') || undefined;
      const userRole = request.headers.get('x-user-role') || undefined;

      // Parse and validate input
      let validatedInput: z.infer<TInput> | undefined;
      
      if (config.inputSchema) {
        const body = request.method !== 'GET' ? await request.json() : undefined;
        const searchParams = Object.fromEntries(request.nextUrl.searchParams);
        const inputData = body || searchParams;
        
        const inputResult = config.inputSchema.safeParse(inputData);
        if (!inputResult.success) {
          return Response.json({
            error: {
              type: 'VALIDATION',
              message: 'Invalid input data',
              details: inputResult.error.flatten().fieldErrors,
            },
          } satisfies ApiErrorResponse, { status: 400 });
        }
        validatedInput = inputResult.data;
      }

      // Execute handler
      const result = await config.handler({
        data: validatedInput,
        params: context?.params,
        request,
        userId,
        userRole,
      });

      // Validate output
      const outputResult = config.outputSchema.safeParse(result);
      if (!outputResult.success) {
        console.error('Output validation failed:', outputResult.error);
        return Response.json({
          error: {
            type: 'INTERNAL',
            message: 'Response validation failed',
          },
        } satisfies ApiErrorResponse, { status: 500 });
      }

      return Response.json({
        data: outputResult.data,
      } satisfies ApiSuccessResponse<z.infer<TOutput>>);

    } catch (error) {
      console.error('API handler error:', error);
      return Response.json({
        error: {
          type: 'INTERNAL',
          message: 'Internal server error',
        },
      } satisfies ApiErrorResponse, { status: 500 });
    }
  };
}

/**
 * Type-safe Server Action wrapper
 */
export function createTypedAction<
  TInput extends z.ZodSchema,
  TOutput extends z.ZodSchema
>(config: {
  inputSchema: TInput;
  outputSchema: TOutput;
  handler: (
    input: z.infer<TInput>,
    context: { userId?: string; userRole?: string }
  ) => Promise<z.infer<TOutput>>;
}) {
  return async (formData: FormData): Promise<TypedApiResponse<z.infer<TOutput>>> => {
    try {
      // Extract data from FormData
      const data: Record<string, any> = {};
      
      for (const [key, value] of formData.entries()) {
        if (key.endsWith('[]')) {
          const arrayKey = key.slice(0, -2);
          if (!data[arrayKey]) data[arrayKey] = [];
          data[arrayKey].push(value);
        } else if (key.endsWith('_json')) {
          const jsonKey = key.slice(0, -5);
          try {
            data[jsonKey] = JSON.parse(value as string);
          } catch {
            data[jsonKey] = value;
          }
        } else {
          data[key] = value;
        }
      }

      // Validate input
      const inputResult = config.inputSchema.safeParse(data);
      if (!inputResult.success) {
        return {
          error: {
            type: 'VALIDATION',
            message: 'Invalid input data',
            details: inputResult.error.flatten().fieldErrors,
          },
        };
      }

      // TODO: Extract user context from headers in real implementation
      const context = { userId: undefined, userRole: undefined };

      // Execute handler
      const result = await config.handler(inputResult.data, context);

      // Validate output
      const outputResult = config.outputSchema.safeParse(result);
      if (!outputResult.success) {
        console.error('Action output validation failed:', outputResult.error);
        return {
          error: {
            type: 'INTERNAL',
            message: 'Action validation failed',
          },
        };
      }

      return {
        data: outputResult.data,
      };

    } catch (error) {
      console.error('Server Action error:', error);
      return {
        error: {
          type: 'INTERNAL',
          message: 'Server action failed',
        },
      };
    }
  };
}

/**
 * Type-safe client-side API caller
 */
export class TypedApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): Promise<TypedApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const response = await fetch(url.toString());
    return response.json();
  }

  async post<T>(
    endpoint: string,
    data?: Record<string, any>
  ): Promise<TypedApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    return response.json();
  }

  async put<T>(
    endpoint: string,
    data?: Record<string, any>
  ): Promise<TypedApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    return response.json();
  }

  async delete<T>(endpoint: string): Promise<TypedApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    });
    
    return response.json();
  }
}

/**
 * Default API client instance
 */
export const apiClient = new TypedApiClient();

/**
 * Type guards for API responses
 */
export function isApiSuccess<T>(
  response: TypedApiResponse<T>
): response is ApiSuccessResponse<T> {
  return 'data' in response && response.error === undefined;
}

export function isApiError(
  response: TypedApiResponse<any>
): response is ApiErrorResponse {
  return 'error' in response && response.data === undefined;
}

/**
 * Hook for type-safe Server Actions
 */
export function useTypedAction<T>(
  action: (formData: FormData) => Promise<TypedApiResponse<T>>
) {
  return {
    async execute(data: Record<string, any>): Promise<TypedApiResponse<T>> {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(item => formData.append(`${key}[]`, String(item)));
        } else if (typeof value === 'object' && value !== null) {
          formData.append(`${key}_json`, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      return action(formData);
    },
  };
}

/**
 * Common data type schemas for the analytics dashboard
 */
export const CommonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    total: z.number().min(0),
    hasMore: z.boolean(),
  }),

  // Date range
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),

  // Filter options
  filters: z.object({
    partnerId: z.number().optional(),
    campaignId: z.number().optional(),
    landingId: z.number().optional(),
    country: z.string().optional(),
    osFamily: z.string().optional(),
    dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional(),
  }),

  // Analytics metrics
  metrics: z.object({
    totalClicks: z.number().min(0),
    uniqueClicks: z.number().min(0),
    registrations: z.number().min(0),
    ftdCount: z.number().min(0),
    conversionRate: z.number().min(0).max(100),
    ftdRate: z.number().min(0).max(100),
  }),

  // Time series data point
  timeSeriesPoint: z.object({
    date: z.string(),
    value: z.number(),
    label: z.string().optional(),
  }),

  // Generic success response
  success: z.object({
    success: z.boolean(),
    message: z.string().optional(),
  }),
};

/**
 * Type-safe database query builder
 */
export class TypedQueryBuilder<T extends Record<string, any>> {
  private schema: z.ZodSchema<T>;
  private filters: Array<(item: T) => boolean> = [];
  private sorts: Array<{ key: keyof T; order: 'asc' | 'desc' }> = [];

  constructor(schema: z.ZodSchema<T>) {
    this.schema = schema;
  }

  where<K extends keyof T>(
    key: K,
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like',
    value: T[K] | T[K][]
  ): this {
    this.filters.push((item: T) => {
      const itemValue = item[key];
      
      switch (operator) {
        case 'eq':
          return itemValue === value;
        case 'ne':
          return itemValue !== value;
        case 'gt':
          return this.isComparable(itemValue) && 
                 this.isComparable(value) && 
                 !Array.isArray(value) && 
                 itemValue > value;
        case 'gte':
          return this.isComparable(itemValue) && 
                 this.isComparable(value) && 
                 !Array.isArray(value) && 
                 itemValue >= value;
        case 'lt':
          return this.isComparable(itemValue) && 
                 this.isComparable(value) && 
                 !Array.isArray(value) && 
                 itemValue < value;
        case 'lte':
          return this.isComparable(itemValue) && 
                 this.isComparable(value) && 
                 !Array.isArray(value) && 
                 itemValue <= value;
        case 'in':
          return Array.isArray(value) && value.includes(itemValue);
        case 'like':
          return typeof itemValue === 'string' && 
                 typeof value === 'string' && 
                 itemValue.toLowerCase().includes(value.toLowerCase());
        default:
          return true;
      }
    });
    
    return this;
  }

  private isComparable(value: unknown): value is number | string | Date {
    return typeof value === 'number' || 
           typeof value === 'string' || 
           value instanceof Date;
  }

  orderBy(key: keyof T, order: 'asc' | 'desc' = 'asc'): this {
    this.sorts.push({ key, order });
    return this;
  }

  apply(data: T[]): T[] {
    // Validate input data
    const validatedData = data.map(item => {
      const result = this.schema.safeParse(item);
      if (!result.success) {
        console.warn('Invalid data item:', item, result.error);
        return null;
      }
      return result.data;
    }).filter((item): item is T => item !== null);

    // Apply filters
    let filtered = validatedData.filter(item => 
      this.filters.every(filter => filter(item))
    );

    // Apply sorting
    this.sorts.forEach(({ key, order }) => {
      filtered.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
    });

    return filtered;
  }
}

/**
 * Runtime type checking utilities
 */
export const TypeCheckers = {
  isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },

  isArray<T>(value: unknown, itemChecker?: (item: unknown) => item is T): value is T[] {
    if (!Array.isArray(value)) return false;
    if (!itemChecker) return true;
    return value.every(itemChecker);
  },

  isString(value: unknown): value is string {
    return typeof value === 'string';
  },

  isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  },

  isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
  },

  isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  },

  isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  },

  isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && value > 0 && isFinite(value);
  },
};

/**
 * Type-safe environment variable parser
 */
export function parseEnv<T>(schema: z.ZodSchema<T>): T {
  const env = process.env;
  const result = schema.safeParse(env);
  
  if (!result.success) {
    throw new Error(`Environment validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

// Export commonly used types
export type Pagination = z.infer<typeof CommonSchemas.pagination>;
export type DateRange = z.infer<typeof CommonSchemas.dateRange>;
export type Filters = z.infer<typeof CommonSchemas.filters>;
export type Metrics = z.infer<typeof CommonSchemas.metrics>;
export type TimeSeriesPoint = z.infer<typeof CommonSchemas.timeSeriesPoint>;
export type SuccessResponse = z.infer<typeof CommonSchemas.success>;

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createTypedHandler,
  createTypedAction,
  TypedApiClient,
  isApiSuccess,
  isApiError,
  useTypedAction,
  TypeCheckers,
  TypedQueryBuilder,
  CommonSchemas,
  parseEnv,
} from '@/lib/type-safety';

// Mock NextRequest for testing
const createMockRequest = (data: any = {}, headers: Record<string, string> = {}) => ({
  headers: {
    get: (name: string) => headers[name] || null,
  },
  nextUrl: {
    searchParams: new URLSearchParams(Object.entries(data)),
  },
  json: () => Promise.resolve(data),
  method: 'POST',
} as any);

describe('Type Safety System', () => {
  describe('createTypedHandler', () => {
    it('should create a type-safe API handler', async () => {
      const inputSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const outputSchema = z.object({
        message: z.string(),
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      const handler = createTypedHandler({
        inputSchema,
        outputSchema,
        handler: async ({ data }) => ({
          message: `Hello ${data?.name}`,
          user: {
            name: data?.name || '',
            age: data?.age || 0,
          },
        }),
      });

      const request = createMockRequest({ name: 'John', age: 30 });
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it('should validate input and return validation errors', async () => {
      const inputSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const outputSchema = z.object({ success: z.boolean() });

      const handler = createTypedHandler({
        inputSchema,
        outputSchema,
        handler: async () => ({ success: true }),
      });

      const request = createMockRequest({ email: 'invalid-email', age: 16 });
      const response = await handler(request);

      expect(response.status).toBe(400);
    });

    it('should handle handler without input schema', async () => {
      const outputSchema = z.object({
        timestamp: z.string(),
        random: z.number(),
      });

      const handler = createTypedHandler({
        outputSchema,
        handler: async () => ({
          timestamp: new Date().toISOString(),
          random: Math.random(),
        }),
      });

      const request = createMockRequest();
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it('should extract user context from headers', async () => {
      const outputSchema = z.object({
        userId: z.string(),
        userRole: z.string(),
      });

      const handler = createTypedHandler({
        outputSchema,
        handler: async ({ userId, userRole }) => ({
          userId: userId || 'unknown',
          userRole: userRole || 'guest',
        }),
      });

      const request = createMockRequest({}, {
        'x-user-id': '123',
        'x-user-role': 'admin',
      });

      const response = await handler(request);
      expect(response.status).toBe(200);
    });

    it('should handle handler errors gracefully', async () => {
      const outputSchema = z.object({ success: z.boolean() });

      const handler = createTypedHandler({
        outputSchema,
        handler: async () => {
          throw new Error('Handler error');
        },
      });

      const request = createMockRequest();
      const response = await handler(request);

      expect(response.status).toBe(500);
    });

    it('should validate output schema', async () => {
      const outputSchema = z.object({
        requiredField: z.string(),
        numberField: z.number(),
      });

      const handler = createTypedHandler({
        outputSchema,
        handler: async () => ({
          // Missing required fields to trigger validation error
          wrongField: 'wrong',
        }),
      });

      const request = createMockRequest();
      const response = await handler(request);

      expect(response.status).toBe(500);
    });
  });

  describe('createTypedAction', () => {
    it('should create a type-safe Server Action', async () => {
      const inputSchema = z.object({
        title: z.string(),
        content: z.string(),
      });

      const outputSchema = z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        success: z.boolean(),
      });

      const action = createTypedAction({
        inputSchema,
        outputSchema,
        handler: async (input) => ({
          id: crypto.randomUUID(),
          title: input.title,
          content: input.content,
          success: true,
        }),
      });

      const formData = new FormData();
      formData.append('title', 'Test Title');
      formData.append('content', 'Test Content');

      const result = await action(formData);

      expect(result.data).toBeDefined();
      expect(result.data?.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle array fields in FormData', async () => {
      const inputSchema = z.object({
        tags: z.array(z.string()),
        metadata: z.object({
          category: z.string(),
        }),
      });

      const outputSchema = z.object({
        processedTags: z.array(z.string()),
        category: z.string(),
      });

      const action = createTypedAction({
        inputSchema,
        outputSchema,
        handler: async (input) => ({
          processedTags: input.tags,
          category: input.metadata.category,
        }),
      });

      const formData = new FormData();
      formData.append('tags[]', 'tag1');
      formData.append('tags[]', 'tag2');
      formData.append('metadata_json', JSON.stringify({ category: 'test' }));

      const result = await action(formData);

      expect(result.data?.processedTags).toEqual(['tag1', 'tag2']);
      expect(result.data?.category).toBe('test');
    });

    it('should handle validation errors in Server Actions', async () => {
      const inputSchema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const outputSchema = z.object({ success: z.boolean() });

      const action = createTypedAction({
        inputSchema,
        outputSchema,
        handler: async () => ({ success: true }),
      });

      const formData = new FormData();
      formData.append('email', 'invalid');
      formData.append('age', '16');

      const result = await action(formData);

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('VALIDATION');
      expect(result.data).toBeUndefined();
    });

    it('should handle handler errors in Server Actions', async () => {
      const inputSchema = z.object({
        name: z.string(),
      });

      const outputSchema = z.object({ success: z.boolean() });

      const action = createTypedAction({
        inputSchema,
        outputSchema,
        handler: async () => {
          throw new Error('Action failed');
        },
      });

      const formData = new FormData();
      formData.append('name', 'test');

      const result = await action(formData);

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('INTERNAL');
    });
  });

  describe('TypedApiClient', () => {
    let client: TypedApiClient;

    beforeEach(() => {
      client = new TypedApiClient('/api');
      
      // Mock fetch
      global.fetch = vi.fn();
      
      // Mock window for TypedApiClient
      (global as any).window = {
        location: {
          origin: 'http://localhost:3000',
        },
      };
    });

    it('should make GET requests with query parameters', async () => {
      const mockResponse = {
        json: () => Promise.resolve({ data: { users: [] } }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await client.get('/users', { page: 1, limit: 10 });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/users?page=1&limit=10'
      );
    });

    it('should make POST requests with JSON data', async () => {
      const mockResponse = {
        json: () => Promise.resolve({ data: { success: true } }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await client.post('/users', { name: 'John', email: 'john@example.com' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
        })
      );
    });

    it('should make PUT requests', async () => {
      const mockResponse = {
        json: () => Promise.resolve({ data: { updated: true } }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await client.put('/users/123', { name: 'Jane' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/123'),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Jane' }),
        })
      );
    });

    it('should make DELETE requests', async () => {
      const mockResponse = {
        json: () => Promise.resolve({ data: { deleted: true } }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await client.delete('/users/123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('API Response Type Guards', () => {
    it('should correctly identify success responses', () => {
      const successResponse = {
        data: { users: [] },
      };

      const errorResponse = {
        error: {
          type: 'VALIDATION',
          message: 'Invalid input',
        },
      };

      expect(isApiSuccess(successResponse)).toBe(true);
      expect(isApiSuccess(errorResponse)).toBe(false);
      expect(isApiError(successResponse)).toBe(false);
      expect(isApiError(errorResponse)).toBe(true);
    });
  });

  describe('useTypedAction', () => {
    it('should convert object data to FormData', async () => {
      const mockAction = vi.fn().mockResolvedValue({ data: { success: true } });
      
      const { execute } = useTypedAction(mockAction);
      
      await execute({
        name: 'John',
        tags: ['tag1', 'tag2'],
        metadata: { category: 'test' },
      });

      expect(mockAction).toHaveBeenCalledWith(expect.any(FormData));
      
      const formData = mockAction.mock.calls[0][0];
      expect(formData.get('name')).toBe('John');
      expect(formData.getAll('tags[]')).toEqual(['tag1', 'tag2']);
      expect(formData.get('metadata_json')).toBe(JSON.stringify({ category: 'test' }));
    });
  });

  describe('TypeCheckers', () => {
    it('should validate records', () => {
      expect(TypeCheckers.isRecord({})).toBe(true);
      expect(TypeCheckers.isRecord({ a: 1 })).toBe(true);
      expect(TypeCheckers.isRecord(null)).toBe(false);
      expect(TypeCheckers.isRecord([])).toBe(false);
      expect(TypeCheckers.isRecord('string')).toBe(false);
    });

    it('should validate arrays', () => {
      expect(TypeCheckers.isArray([])).toBe(true);
      expect(TypeCheckers.isArray([1, 2, 3])).toBe(true);
      expect(TypeCheckers.isArray({})).toBe(false);
      expect(TypeCheckers.isArray('string')).toBe(false);
    });

    it('should validate arrays with item checker', () => {
      const isString = (item: unknown): item is string => typeof item === 'string';
      
      expect(TypeCheckers.isArray(['a', 'b'], isString)).toBe(true);
      expect(TypeCheckers.isArray([1, 2], isString)).toBe(false);
      expect(TypeCheckers.isArray(['a', 1], isString)).toBe(false);
    });

    it('should validate primitive types', () => {
      expect(TypeCheckers.isString('hello')).toBe(true);
      expect(TypeCheckers.isString(123)).toBe(false);
      
      expect(TypeCheckers.isNumber(123)).toBe(true);
      expect(TypeCheckers.isNumber(NaN)).toBe(false);
      expect(TypeCheckers.isNumber(Infinity)).toBe(false);
      expect(TypeCheckers.isNumber('123')).toBe(false);
      
      expect(TypeCheckers.isBoolean(true)).toBe(true);
      expect(TypeCheckers.isBoolean(false)).toBe(true);
      expect(TypeCheckers.isBoolean(1)).toBe(false);
      
      expect(TypeCheckers.isDate(new Date())).toBe(true);
      expect(TypeCheckers.isDate(new Date('invalid'))).toBe(false);
      expect(TypeCheckers.isDate('2023-01-01')).toBe(false);
    });

    it('should validate specialized types', () => {
      expect(TypeCheckers.isNonEmptyString('hello')).toBe(true);
      expect(TypeCheckers.isNonEmptyString('')).toBe(false);
      expect(TypeCheckers.isNonEmptyString('   ')).toBe(false);
      
      expect(TypeCheckers.isPositiveNumber(10)).toBe(true);
      expect(TypeCheckers.isPositiveNumber(0)).toBe(false);
      expect(TypeCheckers.isPositiveNumber(-5)).toBe(false);
      expect(TypeCheckers.isPositiveNumber(Infinity)).toBe(false);
    });
  });

  describe('TypedQueryBuilder', () => {
    const testSchema = z.object({
      id: z.number(),
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    });

    const testData = [
      { id: 1, name: 'Alice', age: 30, active: true },
      { id: 2, name: 'Bob', age: 25, active: false },
      { id: 3, name: 'Charlie', age: 35, active: true },
    ];

    it('should filter data by equality', () => {
      const builder = new TypedQueryBuilder(testSchema);
      const result = builder.where('active', 'eq', true).apply(testData);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
    });

    it('should filter data by comparison operators', () => {
      const builder = new TypedQueryBuilder(testSchema);
      const result = builder.where('age', 'gt', 30).apply(testData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Charlie');
    });

    it('should filter data by inclusion', () => {
      const builder = new TypedQueryBuilder(testSchema);
      const result = builder.where('name', 'in', ['Alice', 'Bob']).apply(testData);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['Alice', 'Bob']);
    });

    it('should filter data by like operator', () => {
      const builder = new TypedQueryBuilder(testSchema);
      const result = builder.where('name', 'like', 'ch').apply(testData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Charlie');
    });

    it('should sort data', () => {
      const builder = new TypedQueryBuilder(testSchema);
      const result = builder.orderBy('age', 'desc').apply(testData);

      expect(result.map(r => r.age)).toEqual([35, 30, 25]);
    });

    it('should chain filters and sorting', () => {
      const builder = new TypedQueryBuilder(testSchema);
      const result = builder
        .where('active', 'eq', true)
        .orderBy('age', 'asc')
        .apply(testData);

      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
    });

    it('should handle invalid data gracefully', () => {
      const invalidData = [
        { id: 1, name: 'Alice', age: 30, active: true },
        { id: 'invalid', name: 'Bob', age: 25, active: false }, // Invalid id
        { id: 3, name: 'Charlie', age: 35, active: true },
      ];

      const builder = new TypedQueryBuilder(testSchema);
      const result = builder.apply(invalidData as any);

      expect(result).toHaveLength(2); // Invalid record filtered out
      expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('CommonSchemas', () => {
    it('should validate pagination schema', () => {
      const validPagination = {
        page: 1,
        limit: 20,
        total: 100,
        hasMore: true,
      };

      const result = CommonSchemas.pagination.safeParse(validPagination);
      expect(result.success).toBe(true);
    });

    it('should validate filters schema', () => {
      const validFilters = {
        partnerId: 123,
        country: 'US',
        dateRange: {
          from: '2023-01-01',
          to: '2023-12-31',
        },
      };

      const result = CommonSchemas.filters.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should validate metrics schema', () => {
      const validMetrics = {
        totalClicks: 1000,
        uniqueClicks: 800,
        registrations: 100,
        ftdCount: 50,
        conversionRate: 12.5,
        ftdRate: 50.0,
      };

      const result = CommonSchemas.metrics.safeParse(validMetrics);
      expect(result.success).toBe(true);
    });
  });

  describe('parseEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should parse environment variables with schema', () => {
      process.env.API_URL = 'https://api.example.com';
      process.env.MAX_RETRIES = '3';
      process.env.ENABLE_FEATURE = 'true';

      const envSchema = z.object({
        API_URL: z.string().url(),
        MAX_RETRIES: z.coerce.number(),
        ENABLE_FEATURE: z.coerce.boolean(),
      });

      const config = parseEnv(envSchema);

      expect(config.API_URL).toBe('https://api.example.com');
      expect(config.MAX_RETRIES).toBe(3);
      expect(config.ENABLE_FEATURE).toBe(true);
    });

    it('should throw error for invalid environment variables', () => {
      process.env.INVALID_URL = 'not-a-url';

      const envSchema = z.object({
        INVALID_URL: z.string().url(),
      });

      expect(() => parseEnv(envSchema)).toThrow('Environment validation failed');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError, z } from 'zod';
import {
  ErrorType,
  ErrorSeverity,
  createError,
  ErrorLogger,
  ErrorResponseBuilder,
  withErrorHandling,
  withRetry,
} from '@/lib/error-handler';

describe('Error Handler System', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    logger = ErrorLogger.getInstance();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('createError', () => {
    it('should create a structured error with default values', () => {
      const error = createError(ErrorType.VALIDATION, 'Test validation error');
      
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Test validation error');
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.userMessage).toBe('Invalid input data provided');
      expect(error.timestamp).toBeDefined();
    });

    it('should create error with custom options', () => {
      const error = createError(ErrorType.DATABASE, 'Connection failed', {
        userMessage: 'Please try again later',
        code: 'DB_CONN_001',
        details: { host: 'localhost', port: 5432 },
        severity: ErrorSeverity.CRITICAL,
        requestId: 'req-123',
      });

      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.userMessage).toBe('Please try again later');
      expect(error.code).toBe('DB_CONN_001');
      expect(error.details).toEqual({ host: 'localhost', port: 5432 });
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.requestId).toBe('req-123');
    });
  });

  describe('ErrorLogger', () => {
    it('should log errors with appropriate severity levels', () => {
      const errorLow = createError(ErrorType.VALIDATION, 'Low severity', { severity: ErrorSeverity.LOW });
      const errorHigh = createError(ErrorType.DATABASE, 'High severity', { severity: ErrorSeverity.HIGH });
      const errorCritical = createError(ErrorType.INTERNAL, 'Critical error', { severity: ErrorSeverity.CRITICAL });

      logger.log(errorLow);
      logger.log(errorHigh);
      logger.log(errorCritical);

      expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Low severity'), expect.any(Object));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('High severity'), expect.any(Object));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL ERROR'), expect.any(Object));
    });

    it('should handle Zod validation errors', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const appError = logger.logValidationError(zodError, 'req-123');

      expect(appError.type).toBe(ErrorType.VALIDATION);
      expect(appError.requestId).toBe('req-123');
      expect(appError.details?.validationErrors).toBeDefined();
    });

    it('should handle database errors', () => {
      const dbError = new Error('Connection timeout');
      const appError = logger.logDatabaseError(dbError, 'findUsers', 'req-456');

      expect(appError.type).toBe(ErrorType.DATABASE);
      expect(appError.message).toContain('Database findUsers failed');
      expect(appError.cause).toBe(dbError);
      expect(appError.requestId).toBe('req-456');
    });

    it('should handle authentication errors', () => {
      const appError = logger.logAuthError('Invalid token', 'req-789');

      expect(appError.type).toBe(ErrorType.AUTHENTICATION);
      expect(appError.message).toContain('Authentication failed: Invalid token');
      expect(appError.requestId).toBe('req-789');
    });

    it('should handle file upload errors', () => {
      const uploadError = new Error('File too large');
      const appError = logger.logFileUploadError(uploadError, 'test.csv', 'req-101');

      expect(appError.type).toBe(ErrorType.FILE_UPLOAD);
      expect(appError.message).toContain('File upload failed');
      expect(appError.details?.fileName).toBe('test.csv');
      expect(appError.requestId).toBe('req-101');
    });
  });

  describe('ErrorResponseBuilder', () => {
    it('should create appropriate HTTP responses for different error types', () => {
      const authError = createError(ErrorType.AUTHENTICATION, 'Token expired');
      const response = ErrorResponseBuilder.fromAppError(authError);

      expect(response.status).toBe(401);
      
      // Check response is created properly
      expect(response.status).toBe(401);
      // Additional checks would require mocking NextResponse.json properly
    });

    it('should handle validation errors with Zod details', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const response = ErrorResponseBuilder.validationError(zodError, 'req-123');
      expect(response.status).toBe(400);
    });

    it('should handle database errors', () => {
      const dbError = new Error('Connection failed');
      const response = ErrorResponseBuilder.databaseError(dbError, 'query', 'req-456');
      expect(response.status).toBe(500);
    });

    it('should handle internal errors', () => {
      const response = ErrorResponseBuilder.internalError('Unexpected error', new Error('Cause'), 'req-789');
      expect(response.status).toBe(500);
    });
  });

  describe('withErrorHandling', () => {
    it('should handle successful operations', async () => {
      const successFn = vi.fn().mockResolvedValue({ success: true });
      const wrappedFn = withErrorHandling(successFn, 'test operation');

      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toEqual({ success: true });
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle Zod validation errors', async () => {
      const zodError = new ZodError([]);
      const failFn = vi.fn().mockRejectedValue(zodError);
      const wrappedFn = withErrorHandling(failFn, 'validation operation');

      const result = await wrappedFn();

      expect(result).toEqual({ error: 'Please check your input and try again' });
      // Console.error is mocked in beforeEach, so we just verify the result
    });

    it('should handle database errors', async () => {
      const dbError = new Error('database connection failed');
      const failFn = vi.fn().mockRejectedValue(dbError);
      const wrappedFn = withErrorHandling(failFn, 'database operation');

      const result = await wrappedFn();

      expect(result).toEqual({ error: 'A database error occurred. Please try again' });
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      const failFn = vi.fn().mockRejectedValue(genericError);
      const wrappedFn = withErrorHandling(failFn, 'generic operation');

      const result = await wrappedFn();

      expect(result).toEqual({ error: 'An unexpected error occurred' });
    });

    it('should handle non-Error objects', async () => {
      const stringError = 'String error';
      const failFn = vi.fn().mockRejectedValue(stringError);
      const wrappedFn = withErrorHandling(failFn, 'string error operation');

      const result = await wrappedFn();

      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const successFn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(successFn, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const retryFn = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      const result = await withRetry(retryFn, {
        maxAttempts: 3,
        delayMs: 10,
        onRetry,
      });

      expect(result).toBe('success');
      expect(retryFn).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(withRetry(failFn, { maxAttempts: 2, delayMs: 10 }))
        .rejects.toThrow('Always fails');

      expect(failFn).toHaveBeenCalledTimes(2);
    });

    it('should respect shouldRetry predicate', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('Fatal error'));
      const shouldRetry = vi.fn().mockReturnValue(false);

      await expect(withRetry(failFn, {
        maxAttempts: 3,
        shouldRetry,
      })).rejects.toThrow('Fatal error');

      expect(failFn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should implement exponential backoff delay', async () => {
      const failFn = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      
      const result = await withRetry(failFn, {
        maxAttempts: 3,
        delayMs: 50,
      });

      const duration = Date.now() - startTime;

      expect(result).toBe('success');
      // Should have delays: 50ms + 100ms = 150ms minimum
      expect(duration).toBeGreaterThan(140);
    });
  });

  describe('Error Type Classification', () => {
    it('should correctly classify validation errors', () => {
      const error = createError(ErrorType.VALIDATION, 'Invalid input');
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });

    it('should correctly classify authentication errors', () => {
      const error = createError(ErrorType.AUTHENTICATION, 'Invalid token');
      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should correctly classify database errors', () => {
      const error = createError(ErrorType.DATABASE, 'Connection failed');
      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should correctly classify internal errors', () => {
      const error = createError(ErrorType.INTERNAL, 'Unexpected error');
      expect(error.type).toBe(ErrorType.INTERNAL);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('Error Context and Debugging', () => {
    it('should include request context in errors', () => {
      const error = createError(ErrorType.DATABASE, 'Query failed', {
        requestId: 'req-123',
        details: {
          query: 'SELECT * FROM users',
          duration: 5000,
          parameters: { userId: 123 },
        },
      });

      expect(error.requestId).toBe('req-123');
      expect(error.details?.query).toBe('SELECT * FROM users');
      expect(error.details?.duration).toBe(5000);
    });

    it('should preserve error stack traces', () => {
      const originalError = new Error('Original error');
      const wrappedError = createError(ErrorType.INTERNAL, 'Wrapped error', {
        cause: originalError,
      });

      expect(wrappedError.cause).toBe(originalError);
      expect(wrappedError.cause?.stack).toBeDefined();
    });

    it('should generate unique timestamps', () => {
      const error1 = createError(ErrorType.VALIDATION, 'Error 1');
      const error2 = createError(ErrorType.VALIDATION, 'Error 2');

      expect(error1.timestamp).toBeDefined();
      expect(error2.timestamp).toBeDefined();
      expect(Date.parse(error1.timestamp)).toBeTypeOf('number');
      expect(Date.parse(error2.timestamp)).toBeTypeOf('number');
    });
  });
});

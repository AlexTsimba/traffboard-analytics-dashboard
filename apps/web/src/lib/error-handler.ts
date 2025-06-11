import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Comprehensive error handling system for the analytics dashboard
 * Provides structured error responses, logging, and user-friendly messages
 */

// Error types for classification
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  FILE_UPLOAD = 'FILE_UPLOAD',
  INTERNAL = 'INTERNAL',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Structured error interface
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage?: string;
  code?: string;
  details?: Record<string, any>;
  cause?: Error;
  timestamp: string;
  requestId?: string;
}

// Error configuration for different error types
const ERROR_CONFIG: Record<ErrorType, { status: number; defaultMessage: string; severity: ErrorSeverity }> = {
  [ErrorType.VALIDATION]: {
    status: 400,
    defaultMessage: 'Invalid input data provided',
    severity: ErrorSeverity.LOW,
  },
  [ErrorType.AUTHENTICATION]: {
    status: 401,
    defaultMessage: 'Authentication required',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorType.AUTHORIZATION]: {
    status: 403,
    defaultMessage: 'Insufficient permissions',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorType.NOT_FOUND]: {
    status: 404,
    defaultMessage: 'Resource not found',
    severity: ErrorSeverity.LOW,
  },
  [ErrorType.RATE_LIMIT]: {
    status: 429,
    defaultMessage: 'Too many requests. Please try again later',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorType.DATABASE]: {
    status: 500,
    defaultMessage: 'Database operation failed',
    severity: ErrorSeverity.HIGH,
  },
  [ErrorType.EXTERNAL_API]: {
    status: 502,
    defaultMessage: 'External service unavailable',
    severity: ErrorSeverity.HIGH,
  },
  [ErrorType.FILE_UPLOAD]: {
    status: 400,
    defaultMessage: 'File upload failed',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorType.INTERNAL]: {
    status: 500,
    defaultMessage: 'An unexpected error occurred',
    severity: ErrorSeverity.CRITICAL,
  },
};

/**
 * Create a structured error object
 */
export function createError(
  type: ErrorType,
  message: string,
  options: {
    userMessage?: string;
    code?: string;
    details?: Record<string, any>;
    cause?: Error;
    requestId?: string;
    severity?: ErrorSeverity;
  } = {}
): AppError {
  const config = ERROR_CONFIG[type];
  
  return {
    type,
    severity: options.severity || config.severity,
    message,
    userMessage: options.userMessage || config.defaultMessage,
    code: options.code,
    details: options.details,
    cause: options.cause,
    timestamp: new Date().toISOString(),
    requestId: options.requestId,
  };
}

/**
 * Enhanced error logger with structured output
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  
  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: AppError, context?: Record<string, any>): void {
    const logEntry = {
      timestamp: error.timestamp,
      type: error.type,
      severity: error.severity,
      message: error.message,
      code: error.code,
      details: error.details,
      requestId: error.requestId,
      context,
      stack: error.cause?.stack,
    };

    // Log based on severity
    switch (error.severity) {
      case ErrorSeverity.LOW:
        console.info('🔵 Low severity error:', logEntry);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('🟡 Medium severity error:', logEntry);
        break;
      case ErrorSeverity.HIGH:
        console.error('🟠 High severity error:', logEntry);
        break;
      case ErrorSeverity.CRITICAL:
        console.error('🔴 CRITICAL ERROR:', logEntry);
        // In production, this would trigger alerts
        break;
    }
  }

  logValidationError(error: ZodError, requestId?: string): AppError {
    const appError = createError(
      ErrorType.VALIDATION,
      'Validation failed',
      {
        userMessage: 'Please check your input and try again',
        details: {
          validationErrors: error.flatten().fieldErrors,
          issues: error.issues,
        },
        cause: error,
        requestId,
      }
    );

    this.log(appError);
    return appError;
  }

  logDatabaseError(error: Error, operation: string, requestId?: string): AppError {
    const appError = createError(
      ErrorType.DATABASE,
      `Database ${operation} failed: ${error.message}`,
      {
        userMessage: 'A database error occurred. Please try again',
        details: { operation },
        cause: error,
        requestId,
        severity: ErrorSeverity.HIGH,
      }
    );

    this.log(appError);
    return appError;
  }

  logAuthError(reason: string, requestId?: string): AppError {
    const appError = createError(
      ErrorType.AUTHENTICATION,
      `Authentication failed: ${reason}`,
      {
        userMessage: 'Please log in to continue',
        details: { reason },
        requestId,
      }
    );

    this.log(appError);
    return appError;
  }

  logFileUploadError(error: Error, fileName?: string, requestId?: string): AppError {
    const appError = createError(
      ErrorType.FILE_UPLOAD,
      `File upload failed: ${error.message}`,
      {
        userMessage: 'File upload failed. Please check the file and try again',
        details: { fileName },
        cause: error,
        requestId,
      }
    );

    this.log(appError);
    return appError;
  }
}

/**
 * Error response builder for API routes
 */
export class ErrorResponseBuilder {
  static fromAppError(error: AppError): NextResponse {
    const config = ERROR_CONFIG[error.type];
    
    return NextResponse.json(
      {
        error: {
          type: error.type,
          message: error.userMessage || config.defaultMessage,
          code: error.code,
          timestamp: error.timestamp,
          requestId: error.requestId,
          ...(process.env.NODE_ENV === 'development' && {
            details: error.details,
            stack: error.cause?.stack,
          }),
        },
      },
      { 
        status: config.status,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Type': error.type,
          'X-Request-ID': error.requestId || '',
        },
      }
    );
  }

  static validationError(zodError: ZodError, requestId?: string): NextResponse {
    const logger = ErrorLogger.getInstance();
    const appError = logger.logValidationError(zodError, requestId);
    return this.fromAppError(appError);
  }

  static authenticationError(reason: string, requestId?: string): NextResponse {
    const logger = ErrorLogger.getInstance();
    const appError = logger.logAuthError(reason, requestId);
    return this.fromAppError(appError);
  }

  static databaseError(error: Error, operation: string, requestId?: string): NextResponse {
    const logger = ErrorLogger.getInstance();
    const appError = logger.logDatabaseError(error, operation, requestId);
    return this.fromAppError(appError);
  }

  static fileUploadError(error: Error, fileName?: string, requestId?: string): NextResponse {
    const logger = ErrorLogger.getInstance();
    const appError = logger.logFileUploadError(error, fileName, requestId);
    return this.fromAppError(appError);
  }

  static internalError(message: string, cause?: Error, requestId?: string): NextResponse {
    const appError = createError(
      ErrorType.INTERNAL,
      message,
      {
        userMessage: 'An unexpected error occurred. Please try again',
        cause,
        requestId,
        severity: ErrorSeverity.CRITICAL,
      }
    );

    ErrorLogger.getInstance().log(appError);
    return this.fromAppError(appError);
  }
}

/**
 * Error boundary utility for Server Actions
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorContext?: string
) {
  return async (...args: T): Promise<R | { error: string }> => {
    try {
      return await fn(...args);
    } catch (error) {
      const logger = ErrorLogger.getInstance();
      
      // Handle known error types
      if (error instanceof ZodError) {
        const appError = logger.logValidationError(error);
        return { error: appError.userMessage || 'Validation failed' };
      }

      // Handle database errors
      if (error instanceof Error && error.message.includes('database')) {
        const appError = logger.logDatabaseError(error, errorContext || 'operation');
        return { error: appError.userMessage || 'Database error occurred' };
      }

      // Handle generic errors
      const appError = createError(
        ErrorType.INTERNAL,
        `${errorContext || 'Operation'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          cause: error instanceof Error ? error : undefined,
          severity: ErrorSeverity.HIGH,
        }
      );

      logger.log(appError);
      return { error: appError.userMessage || 'An unexpected error occurred' };
    }
  };
}

/**
 * Retry mechanism for operations that might fail temporarily
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    shouldRetry?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      onRetry(attempt, lastError);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError!;
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandler(): void {
  // Handle unhandled promise rejections
  if (typeof process !== 'undefined') {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      const error = createError(
        ErrorType.INTERNAL,
        `Unhandled promise rejection: ${reason}`,
        {
          severity: ErrorSeverity.CRITICAL,
          details: { promise: promise.toString() },
        }
      );
      
      ErrorLogger.getInstance().log(error);
    });

    process.on('uncaughtException', (error: Error) => {
      const appError = createError(
        ErrorType.INTERNAL,
        `Uncaught exception: ${error.message}`,
        {
          cause: error,
          severity: ErrorSeverity.CRITICAL,
        }
      );
      
      ErrorLogger.getInstance().log(appError);
      // In production, you might want to gracefully shutdown
      // process.exit(1);
    });
  }
}

// Initialize global error handling
if (typeof window === 'undefined') {
  setupGlobalErrorHandler();
}

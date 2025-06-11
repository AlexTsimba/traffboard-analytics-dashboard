/**
 * Centralized logging utility for the Traffboard application
 * Provides structured logging with different levels and environment-aware output
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  private formatLogEntry(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    
    if (this.isDevelopment) {
      // Colorful development logging
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
      };
      const reset = '\x1b[0m';
      
      let logMessage = `${colors[level]}[${level.toUpperCase()}]${reset} ${message}`;
      
      if (context && Object.keys(context).length > 0) {
        logMessage += `\n  Context: ${JSON.stringify(context, null, 2)}`;
      }
      
      if (error) {
        logMessage += `\n  Error: ${error.message}`;
        if (error.stack) {
          logMessage += `\n  Stack: ${error.stack}`;
        }
      }
      
      return logMessage;
    }

    // Production structured logging
    return JSON.stringify({
      level,
      message,
      timestamp,
      context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    // Don't log debug messages in production
    if (level === 'debug' && !this.isDevelopment && !this.isTest) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    };

    const formattedMessage = this.formatLogEntry(entry);

    // Use appropriate console method based on log level
    switch (level) {
      case 'debug':
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  /**
   * Log debug information (development only)
   * Using arrow function to preserve 'this' context when destructured
   */
  debug = (message: string, context?: Record<string, any>): void => {
    this.log('debug', message, context);
  }

  /**
   * Log general information
   * Using arrow function to preserve 'this' context when destructured
   */
  info = (message: string, context?: Record<string, any>): void => {
    this.log('info', message, context);
  }

  /**
   * Log warning messages
   * Using arrow function to preserve 'this' context when destructured
   */
  warn = (message: string, context?: Record<string, any>, error?: Error): void => {
    this.log('warn', message, context, error);
  }

  /**
   * Log error messages
   * Using arrow function to preserve 'this' context when destructured
   */
  error = (message: string, context?: Record<string, any>, error?: Error): void => {
    this.log('error', message, context, error);
  }

  /**
   * Log API request/response for debugging
   * Using arrow function to preserve 'this' context when destructured
   */
  api = (method: string, url: string, status?: number, duration?: number, context?: Record<string, any>): void => {
    this.debug(`API ${method} ${url}`, {
      status,
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  /**
   * Log database operations
   * Using arrow function to preserve 'this' context when destructured
   */
  db = (operation: string, table?: string, duration?: number, context?: Record<string, any>): void => {
    this.debug(`DB ${operation}${table ? ` on ${table}` : ''}`, {
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  /**
   * Log authentication events
   * Using arrow function to preserve 'this' context when destructured
   */
  auth = (event: string, userId?: string | number, context?: Record<string, any>): void => {
    this.info(`Auth: ${event}`, {
      userId: userId?.toString(),
      ...context
    });
  }

  /**
   * Log cache operations
   * Using arrow function to preserve 'this' context when destructured
   */
  cache = (operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'invalidate' | 'error', key?: string, context?: Record<string, any>): void => {
    if (operation === 'error') {
      this.error(`Cache error${key ? ` for ${key}` : ''}`, context);
    } else {
      this.debug(`Cache ${operation}${key ? ` for ${key}` : ''}`, context);
    }
  }

  /**
   * Log performance metrics
   * Using arrow function to preserve 'this' context when destructured
   */
  performance = (metric: string, value: number, unit: string = 'ms', context?: Record<string, any>): void => {
    this.info(`Performance: ${metric} = ${value}${unit}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual log functions for convenience
// These are now properly bound arrow functions that maintain context
export const { debug, info, warn, error, api, db, auth, cache, performance } = logger;

// Export type for external use
export type { LogEntry };

import { z } from 'zod'

/**
 * Enhanced validation utilities for Server Actions
 * Provides additional security and sanitization beyond basic Zod validation
 */

// Common validation patterns
export const ValidationPatterns = {
  // Alphanumeric with specific special characters
  safeString: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  
  // Safe filename pattern
  fileName: /^[a-zA-Z0-9\-_. ]+\.[a-zA-Z0-9]+$/,
  
  // Safe URL pattern
  safeUrl: /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/,
  
  // UUID pattern
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // API key pattern
  apiKey: /^[a-zA-Z0-9]{32,128}$/,
}

/**
 * Input sanitization functions
 */
export const Sanitizers = {
  /**
   * Remove potentially dangerous characters from string input
   */
  sanitizeString: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim()
  },

  /**
   * Sanitize HTML by removing all tags
   */
  stripHtml: (input: string): string => {
    return input.replace(/<[^>]*>/g, '').trim()
  },

  /**
   * Sanitize file name to prevent path traversal
   */
  sanitizeFileName: (fileName: string): string => {
    return fileName
      .replace(/[^a-zA-Z0-9\-_. ]/g, '') // Remove special characters
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/^\.+/, '') // Remove leading dots
      .trim()
  },

  /**
   * Sanitize numeric input
   */
  sanitizeNumber: (input: string | number): number | null => {
    const num = typeof input === 'string' ? parseFloat(input) : input
    return isNaN(num) || !isFinite(num) ? null : num
  },

  /**
   * Sanitize boolean input
   */
  sanitizeBoolean: (input: any): boolean => {
    if (typeof input === 'boolean') return input
    if (typeof input === 'string') {
      return input.toLowerCase() === 'true' || input === '1' || input === 'on'
    }
    return false
  },
}

/**
 * Enhanced validation schemas with security considerations
 */
export const SecureSchemas = {
  /**
   * Safe string schema with length limits and character restrictions
   */
  safeString: (minLength = 1, maxLength = 1000) =>
    z.string()
      .min(minLength, `Minimum length is ${minLength}`)
      .max(maxLength, `Maximum length is ${maxLength}`)
      .regex(ValidationPatterns.safeString, 'Contains invalid characters')
      .transform(Sanitizers.sanitizeString),

  /**
   * Email schema with additional validation
   */
  email: z.string()
    .email('Invalid email format')
    .max(254, 'Email too long') // RFC 5321 limit
    .toLowerCase()
    .transform(Sanitizers.sanitizeString),

  /**
   * Password schema with security requirements
   */
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),

  /**
   * File upload schema with security checks
   */
  fileUpload: z.object({
    name: z.string()
      .regex(ValidationPatterns.fileName, 'Invalid file name')
      .max(255, 'File name too long')
      .transform(Sanitizers.sanitizeFileName),
    size: z.number()
      .min(1, 'File cannot be empty')
      .max(2 * 1024 * 1024, 'File size exceeds 2MB limit'),
    type: z.string()
      .refine(type => ['text/csv', 'application/json'].includes(type), {
        message: 'Invalid file type. Only CSV and JSON files are allowed.',
      }),
  }),

  /**
   * API key schema
   */
  apiKey: z.string()
    .regex(ValidationPatterns.apiKey, 'Invalid API key format')
    .transform(input => input.trim()),

  /**
   * UUID schema
   */
  uuid: z.string()
    .regex(ValidationPatterns.uuid, 'Invalid UUID format'),

  /**
   * Safe URL schema
   */
  url: z.string()
    .url('Invalid URL format')
    .regex(ValidationPatterns.safeUrl, 'URL contains invalid characters')
    .max(2048, 'URL too long'),

  /**
   * Pagination schema
   */
  pagination: z.object({
    page: z.number().min(1).max(1000).default(1),
    limit: z.number().min(1).max(100).default(20),
  }),
}

/**
 * Rate limiting validation for specific actions
 */
export const RateLimitValidation = {
  /**
   * Validate that an action hasn't been performed too frequently
   */
  checkActionFrequency: (
    userId: string,
    action: string,
    maxAttempts: number,
    windowMs: number
  ): boolean => {
    // In production, this would use Redis or a database
    // For now, return true as placeholder
    return true
  },

  /**
   * Generate a rate limit key for caching
   */
  getRateLimitKey: (userId: string, action: string): string => {
    return `rate_limit:${userId}:${action}`
  },
}

/**
 * CSRF token validation utilities
 */
export const CSRFValidation = {
  /**
   * Validate CSRF token (Next.js provides this automatically for Server Actions)
   * This is a placeholder for additional CSRF validation if needed
   */
  validateToken: (token: string, expectedToken: string): boolean => {
    return token === expectedToken
  },

  /**
   * Generate a secure random token
   */
  generateToken: (): string => {
    return crypto.randomUUID()
  },
}

/**
 * Advanced form validation with security features
 */
export class SecureFormValidator {
  private schema: z.ZodSchema<any>
  private rateLimitConfig?: {
    maxAttempts: number
    windowMs: number
  }

  constructor(
    schema: z.ZodSchema<any>,
    rateLimitConfig?: { maxAttempts: number; windowMs: number }
  ) {
    this.schema = schema
    this.rateLimitConfig = rateLimitConfig
  }

  /**
   * Validate form data with comprehensive security checks
   */
  async validate(
    formData: FormData,
    context: {
      userId?: string
      action?: string
      userAgent?: string
      clientIP?: string
    } = {}
  ): Promise<{
    success: boolean
    data?: any
    errors?: Record<string, string[]>
    message?: string
  }> {
    try {
      // Rate limiting check
      if (this.rateLimitConfig && context.userId && context.action) {
        const rateLimitOk = RateLimitValidation.checkActionFrequency(
          context.userId,
          context.action,
          this.rateLimitConfig.maxAttempts,
          this.rateLimitConfig.windowMs
        )

        if (!rateLimitOk) {
          return {
            success: false,
            message: 'Too many attempts. Please try again later.',
          }
        }
      }

      // Convert FormData to object for validation
      const data: Record<string, any> = {}
      
      for (const [key, value] of formData.entries()) {
        if (key.endsWith('[]')) {
          // Handle array fields
          const arrayKey = key.slice(0, -2)
          if (!data[arrayKey]) data[arrayKey] = []
          data[arrayKey].push(value)
        } else {
          data[key] = value
        }
      }

      // Validate with Zod schema
      const result = this.schema.safeParse(data)

      if (!result.success) {
        return {
          success: false,
          errors: result.error.flatten().fieldErrors,
          message: 'Validation failed. Please check your inputs.',
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      console.error('Form validation error:', error)
      return {
        success: false,
        message: 'An error occurred during validation.',
      }
    }
  }
}

/**
 * Utility to create a secure Server Action wrapper
 */
export function createSecureAction<T>(
  validator: SecureFormValidator,
  handler: (data: T, context: any) => Promise<any>
) {
  return async (prevState: any, formData: FormData) => {
    // Extract context from headers (set by middleware)
    const userId = ''; // Would get from request headers
    const userAgent = ''; // Would get from request headers
    const clientIP = ''; // Would get from request headers

    // Validate input
    const validation = await validator.validate(formData, {
      userId,
      userAgent,
      clientIP,
      action: handler.name,
    })

    if (!validation.success) {
      return {
        errors: validation.errors,
        message: validation.message,
      }
    }

    try {
      // Execute the handler with validated data
      const result = await handler(validation.data, {
        userId,
        userAgent,
        clientIP,
      })

      return result
    } catch (error) {
      console.error('Action execution error:', error)
      return {
        message: 'An error occurred while processing your request.',
      }
    }
  }
}

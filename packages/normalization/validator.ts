import type { ValidationRules } from '@traffboard/database';
import { ValidationError } from './index';

export class DataValidator {
  constructor(private rules: ValidationRules) {}

  validate(data: Record<string, any>, partnerId?: number): void {
    this.validateRequired(data, partnerId);
    this.validatePatterns(data, partnerId);
    this.validateRanges(data, partnerId);
  }

  private validateRequired(data: Record<string, any>, partnerId?: number): void {
    if (!this.rules.required) return;

    for (const field of this.rules.required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new ValidationError(field, data[field], 'is required', partnerId);
      }
    }
  }

  private validatePatterns(data: Record<string, any>, partnerId?: number): void {
    if (!this.rules.patterns) return;

    for (const [field, pattern] of Object.entries(this.rules.patterns)) {
      const value = data[field];
      if (value !== undefined && value !== null) {
        const regex = new RegExp(pattern);
        if (!regex.test(String(value))) {
          throw new ValidationError(
            field, 
            value, 
            `must match pattern ${pattern}`, 
            partnerId
          );
        }
      }
    }
  }

  private validateRanges(data: Record<string, any>, partnerId?: number): void {
    if (!this.rules.ranges) return;

    for (const [field, range] of Object.entries(this.rules.ranges)) {
      const value = data[field];
      if (value !== undefined && value !== null) {
        const numValue = Number(value);
        
        if (isNaN(numValue)) continue;
        
        if (range.min !== undefined && numValue < range.min) {
          throw new ValidationError(
            field, 
            value, 
            `must be >= ${range.min}`, 
            partnerId
          );
        }
        
        if (range.max !== undefined && numValue > range.max) {
          throw new ValidationError(
            field, 
            value, 
            `must be <= ${range.max}`, 
            partnerId
          );
        }
      }
    }
  }
}

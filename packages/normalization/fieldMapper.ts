import { format, parse } from 'date-fns';
import type { FieldMappings, DateFormats } from '@traffboard/database';
import { NormalizationError } from './index';

// Field Mapping Engine
export class FieldMapper {
  constructor(private mappings: FieldMappings) {}

  mapFields(data: Record<string, any>, dataType: 'conversions' | 'players'): Record<string, any> {
    const mapping = this.mappings[dataType];
    if (!mapping) return data;

    const mapped: Record<string, any> = {};
    
    // Apply field mappings
    for (const [partnerField, ourField] of Object.entries(mapping)) {
      if (data[partnerField] !== undefined) {
        mapped[ourField] = data[partnerField];
      }
    }

    // Copy unmapped fields that match our schema
    for (const [key, value] of Object.entries(data)) {
      if (!(key in mapping) && mapped[key] === undefined) {
        mapped[key] = value;
      }
    }

    return mapped;
  }
}

// Date Format Converter
export class DateConverter {
  constructor(private formats: DateFormats) {}

  convertDate(dateValue: any): string {
    if (!dateValue) throw new NormalizationError('Date value is required');
    
    if (typeof dateValue === 'string') {
      try {
        // Parse using partner's format and convert to ISO
        const parsed = parse(dateValue, this.formats.inputFormat, new Date());
        return format(parsed, 'yyyy-MM-dd');
      } catch (error) {
        throw new NormalizationError(
          `Failed to parse date "${dateValue}" with format "${this.formats.inputFormat}"`
        );
      }
    }

    if (dateValue instanceof Date) {
      return format(dateValue, 'yyyy-MM-dd');
    }

    throw new NormalizationError(`Unsupported date type: ${typeof dateValue}`);
  }
}

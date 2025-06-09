import { pgTable, serial, varchar, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const partnerSettings = pgTable('partner_settings', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull().unique(),
  partnerName: varchar('partner_name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  
  // Field mapping configuration stored as JSON
  fieldMappings: jsonb('field_mappings').$type<FieldMappings>(),
  
  // Dimension mapping configuration - NEW!
  dimensionMappings: jsonb('dimension_mappings').$type<DimensionMappings>(),
  
  // Date format configuration
  dateFormats: jsonb('date_formats').$type<DateFormats>(),
  
  // Validation rules
  validationRules: jsonb('validation_rules').$type<ValidationRules>(),
  
  // Default values for missing fields
  defaultValues: jsonb('default_values').$type<DefaultValues>(),
  
  // Additional partner-specific settings
  processingSettings: jsonb('processing_settings').$type<ProcessingSettings>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TypeScript interfaces for JSON fields
export interface FieldMappings {
  conversions?: {
    [partnerField: string]: string; // partner field -> our field
  };
  players?: {
    [partnerField: string]: string;
  };
}

export interface DimensionMappings {
  buyer?: string;        // e.g., "webID" for makeberry, "sub2" for rockit
  funnel?: string;       // e.g., "source" for both
  source?: string;       // e.g., "traffic_source"
  campaign?: string;     // e.g., "campaign_id"
}

export interface DateFormats {
  inputFormat: string; // e.g., 'YYYY-MM-DD', 'MM/DD/YYYY'
  timezone?: string; // e.g., 'UTC', 'America/New_York'
}

export interface ValidationRules {
  required?: string[]; // Required fields
  patterns?: {
    [field: string]: string; // Field -> regex pattern
  };
  ranges?: {
    [field: string]: {
      min?: number;
      max?: number;
    };
  };
}

export interface DefaultValues {
  [field: string]: any;
}

export interface ProcessingSettings {
  skipValidation?: boolean;
  allowPartialData?: boolean;
  errorHandling?: 'strict' | 'permissive';
  batchSize?: number;
}

export type PartnerSetting = typeof partnerSettings.$inferSelect;
export type NewPartnerSetting = typeof partnerSettings.$inferInsert;

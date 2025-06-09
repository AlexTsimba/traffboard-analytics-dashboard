import { pgTable, serial, varchar, integer, timestamp, index, boolean } from 'drizzle-orm/pg-core';

// Normalized dimension tables for dashboard filtering
export const buyers = pgTable('buyers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  partnerId: integer('partner_id').notNull(),
  originalValue: varchar('original_value', { length: 255 }).notNull(),
  originalField: varchar('original_field', { length: 100 }).notNull(), // webID, sub2, etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  partnerValueIdx: index('buyers_partner_value_idx').on(table.partnerId, table.originalValue),
  nameIdx: index('buyers_name_idx').on(table.name),
}));

export const funnels = pgTable('funnels', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  partnerId: integer('partner_id').notNull(),
  originalValue: varchar('original_value', { length: 255 }).notNull(),
  originalField: varchar('original_field', { length: 100 }).notNull(), // source, funnel_type, etc.
  category: varchar('category', { length: 100 }), // social, search, display, etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  partnerValueIdx: index('funnels_partner_value_idx').on(table.partnerId, table.originalValue),
  nameIdx: index('funnels_name_idx').on(table.name),
  categoryIdx: index('funnels_category_idx').on(table.category),
}));

export const trafficSources = pgTable('traffic_sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  partnerId: integer('partner_id').notNull(),
  originalValue: varchar('original_value', { length: 255 }).notNull(),
  originalField: varchar('original_field', { length: 100 }).notNull(),
  sourceType: varchar('source_type', { length: 100 }), // organic, paid, social, etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  partnerValueIdx: index('sources_partner_value_idx').on(table.partnerId, table.originalValue),
  nameIdx: index('sources_name_idx').on(table.name),
  typeIdx: index('sources_type_idx').on(table.sourceType),
}));

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  partnerId: integer('partner_id').notNull(),
  originalValue: varchar('original_value', { length: 255 }).notNull(),
  originalField: varchar('original_field', { length: 100 }).notNull(),
  campaignType: varchar('campaign_type', { length: 100 }), // acquisition, retention, etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  partnerValueIdx: index('campaigns_partner_value_idx').on(table.partnerId, table.originalValue),
  nameIdx: index('campaigns_name_idx').on(table.name),
}));

export type Buyer = typeof buyers.$inferSelect;
export type NewBuyer = typeof buyers.$inferInsert;
export type Funnel = typeof funnels.$inferSelect;
export type NewFunnel = typeof funnels.$inferInsert;
export type TrafficSource = typeof trafficSources.$inferSelect;
export type NewTrafficSource = typeof trafficSources.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

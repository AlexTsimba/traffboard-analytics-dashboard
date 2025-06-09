import { pgTable, serial, varchar, integer, date, timestamp } from 'drizzle-orm/pg-core';
import { buyers, funnels, trafficSources, campaigns } from './dimensions';

export const conversions = pgTable('conversions', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  
  // Original partner data (kept for auditability)
  foreignPartnerId: integer('foreign_partner_id').notNull(),
  foreignCampaignId: integer('foreign_campaign_id').notNull(),
  foreignLandingId: integer('foreign_landing_id').notNull(),
  
  // Normalized dimensions (for dashboard filtering)
  buyerId: integer('buyer_id').references(() => buyers.id),
  funnelId: integer('funnel_id').references(() => funnels.id),
  sourceId: integer('source_id').references(() => trafficSources.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  
  // Standard fields
  osFamily: varchar('os_family', { length: 50 }),
  country: varchar('country', { length: 2 }).notNull(),
  allClicks: integer('all_clicks').default(0),
  uniqueClicks: integer('unique_clicks').default(0),
  registrationsCount: integer('registrations_count').default(0),
  ftdCount: integer('ftd_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Conversion = typeof conversions.$inferSelect;
export type NewConversion = typeof conversions.$inferInsert;

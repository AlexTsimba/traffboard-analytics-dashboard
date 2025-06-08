import { pgTable, serial, varchar, integer, date, timestamp, decimal } from 'drizzle-orm/pg-core';

export const trafficReports = pgTable('traffic_reports', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  foreignBrandId: integer('foreign_brand_id').notNull(),
  foreignPartnerId: integer('foreign_partner_id').notNull(),
  foreignCampaignId: integer('foreign_campaign_id').notNull(),
  foreignLandingId: integer('foreign_landing_id').notNull(),
  referrer: varchar('referrer', { length: 500 }),
  deviceType: varchar('device_type', { length: 50 }),
  userAgentFamily: varchar('user_agent_family', { length: 100 }),
  osFamily: varchar('os_family', { length: 50 }),
  country: varchar('country', { length: 2 }).notNull(),
  allClicks: integer('all_clicks').default(0),
  uniqueClicks: integer('unique_clicks').default(0),
  registrationsCount: integer('registrations_count').default(0),
  ftdCount: integer('ftd_count').default(0),
  depositsCount: integer('deposits_count').default(0),
  cr: decimal('cr', { precision: 8, scale: 4 }).default('0'), // conversion rate
  cftd: decimal('cftd', { precision: 8, scale: 4 }).default('0'), // conversion to first deposit
  cd: decimal('cd', { precision: 8, scale: 4 }).default('0'), // conversion to deposit
  rftd: decimal('rftd', { precision: 8, scale: 4 }).default('0'), // rate first time deposit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type TrafficReport = typeof trafficReports.$inferSelect;
export type NewTrafficReport = typeof trafficReports.$inferInsert;

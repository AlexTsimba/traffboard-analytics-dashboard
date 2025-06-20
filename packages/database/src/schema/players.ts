import { pgTable, serial, integer, varchar, text, date, decimal, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull(), // Removed .unique() - allow same player on different dates
  originalPlayerId: integer('original_player_id'),
  signUpDate: date('sign_up_date'),
  firstDepositDate: date('first_deposit_date'),
  campaignId: integer('campaign_id'),
  campaignName: varchar('campaign_name', { length: 255 }),
  playerCountry: varchar('player_country', { length: 2 }),
  tagClickid: varchar('tag_clickid', { length: 255 }),
  tagOs: varchar('tag_os', { length: 50 }),
  tagSource: varchar('tag_source', { length: 255 }),
  tagSub2: decimal('tag_sub2', { precision: 10, scale: 2 }),
  tagWebId: decimal('tag_web_id', { precision: 10, scale: 2 }),
  date: date('date').notNull(),
  partnerId: integer('partner_id').notNull(),
  companyName: varchar('company_name', { length: 255 }),
  // partnersEmail removed for privacy/security - not stored in database
  partnerTags: text('partner_tags'),
  promoId: integer('promo_id'),
  promoCode: varchar('promo_code', { length: 100 }),
  prequalified: boolean('prequalified').default(false),
  duplicate: boolean('duplicate').default(false),
  selfExcluded: boolean('self_excluded').default(false),
  disabled: boolean('disabled').default(false),
  currency: varchar('currency', { length: 3 }),
  ftdCount: integer('ftd_count').default(0),
  ftdSum: decimal('ftd_sum', { precision: 15, scale: 2 }).default('0'),
  depositsCount: integer('deposits_count').default(0),
  depositsSum: decimal('deposits_sum', { precision: 15, scale: 2 }).default('0'),
  cashoutsCount: integer('cashouts_count').default(0),
  cashoutsSum: decimal('cashouts_sum', { precision: 15, scale: 2 }).default('0'),
  casinoBetsCount: integer('casino_bets_count').default(0),
  casinoRealNgr: decimal('casino_real_ngr', { precision: 15, scale: 2 }).default('0'),
  fixedPerPlayer: decimal('fixed_per_player', { precision: 15, scale: 2 }).default('0'),
  casinoBetsSum: decimal('casino_bets_sum', { precision: 15, scale: 2 }).default('0'),
  casinoWinsSum: decimal('casino_wins_sum', { precision: 15, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Composite unique constraint: same player can exist on different dates
  playerDateUnique: uniqueIndex('player_date_unique').on(table.playerId, table.date),
}));

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

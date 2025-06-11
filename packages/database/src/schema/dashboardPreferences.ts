import { pgTable, text, boolean, timestamp, serial, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const dateRangeEnum = pgEnum('date_range', ['7d', '30d', '90d', '1y']);
export const chartTypeEnum = pgEnum('chart_type', ['area', 'line', 'bar']);
export const metricGroupEnum = pgEnum('metric_group', ['general', 'visit-to-reg', 'reg-to-ftd', 'quality']);
export const refreshIntervalEnum = pgEnum('refresh_interval', ['off', '30s', '1m', '5m', '15m']);

export const dashboardPreferences = pgTable('dashboard_preferences', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  defaultDateRange: dateRangeEnum('default_date_range').default('30d'),
  defaultChartType: chartTypeEnum('default_chart_type').default('area'),
  defaultMetricGroup: metricGroupEnum('default_metric_group').default('general'),
  autoRefreshInterval: refreshIntervalEnum('auto_refresh_interval').default('off'),
  compactMode: boolean('compact_mode').default(false),
  darkMode: boolean('dark_mode').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type DashboardPreferences = typeof dashboardPreferences.$inferSelect;
export type NewDashboardPreferences = typeof dashboardPreferences.$inferInsert;

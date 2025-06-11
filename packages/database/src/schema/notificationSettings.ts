import { pgTable, boolean, timestamp, serial } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notificationSettings = pgTable('notification_settings', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailNotifications: boolean('email_notifications').default(true),
  pushNotifications: boolean('push_notifications').default(true),
  dailyReports: boolean('daily_reports').default(false),
  weeklyReports: boolean('weekly_reports').default(true),
  alertThresholds: boolean('alert_thresholds').default(true),
  systemUpdates: boolean('system_updates').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type NewNotificationSettings = typeof notificationSettings.$inferInsert;

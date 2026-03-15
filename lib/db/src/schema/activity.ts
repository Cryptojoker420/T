import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  txHash: text("tx_hash"),
  action: text("action").notNull(),
  details: text("details"),
  wasPrivate: boolean("was_private").notNull().default(true),
  chainId: integer("chain_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ActivityEntry = typeof activityTable.$inferSelect;

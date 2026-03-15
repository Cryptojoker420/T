import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const safeModulesTable = pgTable("safe_modules", {
  id: serial("id").primaryKey(),
  safeAddress: text("safe_address").notNull(),
  moduleAddress: text("module_address").notNull(),
  chainId: integer("chain_id").notNull(),
  moduleType: text("module_type").notNull(),
  label: text("label"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  enableTxHash: text("enable_tx_hash"),
  disableTxHash: text("disable_tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSafeModuleSchema = createInsertSchema(safeModulesTable).omit({ id: true, createdAt: true });
export type InsertSafeModule = z.infer<typeof insertSafeModuleSchema>;
export type SafeModule = typeof safeModulesTable.$inferSelect;

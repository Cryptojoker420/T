import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const delegationsTable = pgTable("delegations", {
  id: serial("id").primaryKey(),
  eoaAddress: text("eoa_address").notNull(),
  delegateAddress: text("delegate_address").notNull(),
  implementationType: text("implementation_type").notNull(),
  chainId: integer("chain_id").notNull(),
  label: text("label"),
  isActive: boolean("is_active").notNull().default(true),
  txHash: text("tx_hash"),
  wasPrivate: boolean("was_private").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDelegationSchema = createInsertSchema(delegationsTable).omit({ id: true, createdAt: true });
export type InsertDelegation = z.infer<typeof insertDelegationSchema>;
export type Delegation = typeof delegationsTable.$inferSelect;

import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionKeysTable = pgTable("session_keys", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  sessionPublicKey: text("session_public_key").notNull(),
  chainId: integer("chain_id").notNull(),
  label: text("label"),
  permissions: jsonb("permissions"),
  allowedTargets: text("allowed_targets").array(),
  spendLimit: text("spend_limit"),
  validAfter: timestamp("valid_after", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  isRevoked: boolean("is_revoked").notNull().default(false),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSessionKeySchema = createInsertSchema(sessionKeysTable).omit({ id: true, createdAt: true });
export type InsertSessionKey = z.infer<typeof insertSessionKeySchema>;
export type SessionKey = typeof sessionKeysTable.$inferSelect;

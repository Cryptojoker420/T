import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  address: text("address").notNull(),
  name: text("name").notNull(),
  chainId: integer("chain_id").notNull(),
  walletType: text("wallet_type").notNull().default("safe"),
  owners: text("owners").array().notNull(),
  threshold: integer("threshold").notNull(),
  salt: text("salt"),
  deployTxHash: text("deploy_tx_hash"),
  privateTxDefault: boolean("private_tx_default").notNull().default(true),
  is4337Enabled: boolean("is_4337_enabled").notNull().default(false),
  entryPointVersion: text("entry_point_version"),
  implementation: text("implementation"),
  factoryAddress: text("factory_address"),
  safeVersion: text("safe_version"),
  fallbackHandler: text("fallback_handler"),
  saltNonce: text("salt_nonce"),
  setupData: text("setup_data"),
  predictedAddress: text("predicted_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, createdAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;

import { pgTable, serial, integer, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chainsTable = pgTable("chains", {
  id: serial("id").primaryKey(),
  chainId: integer("chain_id").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  rpcUrl: text("rpc_url").notNull(),
  privateRpcUrl: text("private_rpc_url"),
  explorerUrl: text("explorer_url").notNull(),
  iconUrl: text("icon_url"),
  nativeCurrency: text("native_currency").notNull(),
  isTestnet: boolean("is_testnet").notNull().default(false),
});

export const insertChainSchema = createInsertSchema(chainsTable).omit({ id: true });
export type InsertChain = z.infer<typeof insertChainSchema>;
export type Chain = typeof chainsTable.$inferSelect;

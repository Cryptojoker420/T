import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bridgeTransfersTable = pgTable("bridge_transfers", {
  id: serial("id").primaryKey(),
  protocol: text("protocol").notNull(),
  sourceChainId: integer("source_chain_id").notNull(),
  destChainId: integer("dest_chain_id").notNull(),
  tokenAddress: text("token_address").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  amount: text("amount").notNull(),
  sender: text("sender").notNull(),
  recipient: text("recipient").notNull(),
  sourceTxHash: text("source_tx_hash"),
  destTxHash: text("dest_tx_hash"),
  status: text("status").notNull().default("pending"),
  wasPrivate: boolean("was_private").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBridgeTransferSchema = createInsertSchema(bridgeTransfersTable).omit({ id: true, createdAt: true });
export type InsertBridgeTransfer = z.infer<typeof insertBridgeTransferSchema>;
export type BridgeTransfer = typeof bridgeTransfersTable.$inferSelect;

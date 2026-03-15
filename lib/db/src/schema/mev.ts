import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mevOperationsTable = pgTable("mev_operations", {
  id: serial("id").primaryKey(),
  opType: text("op_type").notNull().default("userOp"),
  sender: text("sender").notNull(),
  chainId: integer("chain_id").notNull(),
  target: text("target"),
  calldata: text("calldata"),
  value: text("value"),
  nonce: text("nonce"),
  initCode: text("init_code"),
  callGasLimit: text("call_gas_limit"),
  verificationGasLimit: text("verification_gas_limit"),
  preVerificationGas: text("pre_verification_gas"),
  maxFeePerGas: text("max_fee_per_gas"),
  maxPriorityFeePerGas: text("max_priority_fee_per_gas"),
  paymasterAndData: text("paymaster_and_data"),
  signature: text("signature"),
  paymaster: text("paymaster"),
  bundler: text("bundler"),
  bundlerProvider: text("bundler_provider"),
  bundlerUrl: text("bundler_url"),
  entryPointAddress: text("entry_point_address"),
  opHash: text("op_hash"),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("draft"),
  wasPrivate: boolean("was_private").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMevOperationSchema = createInsertSchema(mevOperationsTable).omit({ id: true, createdAt: true });
export type InsertMevOperation = z.infer<typeof insertMevOperationSchema>;
export type MevOperation = typeof mevOperationsTable.$inferSelect;

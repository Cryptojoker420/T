import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, sessionKeysTable } from "@workspace/db";
import {
  GetSessionKeyParams,
  UpdateSessionKeyParams,
  UpdateSessionKeyBody,
  DeleteSessionKeyParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const keys = await db.select().from(sessionKeysTable).orderBy(desc(sessionKeysTable.createdAt));
  res.json(keys);
});

router.post("/", async (req, res) => {
  const { walletAddress, sessionPublicKey, chainId, label, permissions, allowedTargets, spendLimit, validAfter, validUntil, isRevoked, txHash } = req.body;
  if (!walletAddress || !sessionPublicKey || chainId == null) {
    return res.status(400).json({ error: "walletAddress, sessionPublicKey, and chainId are required" });
  }
  const values = {
    walletAddress,
    sessionPublicKey,
    chainId: Number(chainId),
    label: label ?? null,
    permissions: permissions ?? null,
    allowedTargets: allowedTargets ?? null,
    spendLimit: spendLimit ?? null,
    validAfter: validAfter ? new Date(validAfter) : null,
    validUntil: validUntil ? new Date(validUntil) : null,
    isRevoked: isRevoked ?? false,
    txHash: txHash ?? null,
  };
  const [key] = await db.insert(sessionKeysTable).values(values).returning();
  res.status(201).json(key);
});

router.get("/:id", async (req, res) => {
  const params = GetSessionKeyParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const [key] = await db.select().from(sessionKeysTable).where(eq(sessionKeysTable.id, params.data.id));
  if (!key) return res.status(404).json({ error: "Session key not found" });
  res.json(key);
});

router.patch("/:id", async (req, res) => {
  const params = UpdateSessionKeyParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const parsed = UpdateSessionKeyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [updated] = await db.update(sessionKeysTable).set(parsed.data).where(eq(sessionKeysTable.id, params.data.id)).returning();
  if (!updated) return res.status(404).json({ error: "Session key not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const params = DeleteSessionKeyParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const [deleted] = await db.delete(sessionKeysTable).where(eq(sessionKeysTable.id, params.data.id)).returning();
  if (!deleted) return res.status(404).json({ error: "Session key not found" });
  res.status(204).send();
});

export default router;

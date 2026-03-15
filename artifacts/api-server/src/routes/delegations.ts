import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, delegationsTable } from "@workspace/db";
import {
  CreateDelegationBody,
  GetDelegationParams,
  UpdateDelegationParams,
  UpdateDelegationBody,
  DeleteDelegationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const delegations = await db.select().from(delegationsTable).orderBy(desc(delegationsTable.createdAt));
  res.json(delegations);
});

router.post("/", async (req, res) => {
  const parsed = CreateDelegationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [delegation] = await db.insert(delegationsTable).values(parsed.data).returning();
  res.status(201).json(delegation);
});

router.get("/:id", async (req, res) => {
  const params = GetDelegationParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const [delegation] = await db.select().from(delegationsTable).where(eq(delegationsTable.id, params.data.id));
  if (!delegation) return res.status(404).json({ error: "Delegation not found" });
  res.json(delegation);
});

router.patch("/:id", async (req, res) => {
  const params = UpdateDelegationParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const parsed = UpdateDelegationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [updated] = await db.update(delegationsTable).set(parsed.data).where(eq(delegationsTable.id, params.data.id)).returning();
  if (!updated) return res.status(404).json({ error: "Delegation not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const params = DeleteDelegationParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const [deleted] = await db.delete(delegationsTable).where(eq(delegationsTable.id, params.data.id)).returning();
  if (!deleted) return res.status(404).json({ error: "Delegation not found" });
  res.status(204).send();
});

export default router;

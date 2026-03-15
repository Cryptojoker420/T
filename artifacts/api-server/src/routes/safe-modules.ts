import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, safeModulesTable } from "@workspace/db";
import {
  CreateSafeModuleBody,
  GetSafeModuleParams,
  UpdateSafeModuleParams,
  UpdateSafeModuleBody,
  DeleteSafeModuleParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const modules = await db.select().from(safeModulesTable).orderBy(desc(safeModulesTable.createdAt));
  res.json(modules);
});

router.post("/", async (req, res) => {
  const parsed = CreateSafeModuleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [mod] = await db.insert(safeModulesTable).values(parsed.data).returning();
  res.status(201).json(mod);
});

router.get("/:id", async (req, res) => {
  const params = GetSafeModuleParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const [mod] = await db.select().from(safeModulesTable).where(eq(safeModulesTable.id, params.data.id));
  if (!mod) return res.status(404).json({ error: "Module not found" });
  res.json(mod);
});

router.patch("/:id", async (req, res) => {
  const params = UpdateSafeModuleParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const parsed = UpdateSafeModuleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [updated] = await db.update(safeModulesTable).set(parsed.data).where(eq(safeModulesTable.id, params.data.id)).returning();
  if (!updated) return res.status(404).json({ error: "Module not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const params = DeleteSafeModuleParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid ID" });
  const [deleted] = await db.delete(safeModulesTable).where(eq(safeModulesTable.id, params.data.id)).returning();
  if (!deleted) return res.status(404).json({ error: "Module not found" });
  res.status(204).send();
});

export default router;

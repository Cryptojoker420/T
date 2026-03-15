import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, mevOperationsTable } from "@workspace/db";
import {
  CreateMevOperationBody,
  GetMevOperationParams,
  GetMevOperationResponse,
  UpdateMevOperationParams,
  UpdateMevOperationBody,
  UpdateMevOperationResponse,
  ListMevOperationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/mev", async (_req, res): Promise<void> => {
  const ops = await db.select().from(mevOperationsTable).orderBy(desc(mevOperationsTable.createdAt));
  res.json(ListMevOperationsResponse.parse(ops));
});

router.post("/mev", async (req, res): Promise<void> => {
  const parsed = CreateMevOperationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [op] = await db.insert(mevOperationsTable).values({
    ...parsed.data,
    status: parsed.data.status ?? "draft",
    wasPrivate: parsed.data.wasPrivate ?? true,
  }).returning();

  res.status(201).json(GetMevOperationResponse.parse(op));
});

router.get("/mev/:id", async (req, res): Promise<void> => {
  const params = GetMevOperationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [op] = await db.select().from(mevOperationsTable).where(eq(mevOperationsTable.id, params.data.id));
  if (!op) {
    res.status(404).json({ error: "Operation not found" });
    return;
  }

  res.json(GetMevOperationResponse.parse(op));
});

router.patch("/mev/:id", async (req, res): Promise<void> => {
  const params = UpdateMevOperationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMevOperationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [op] = await db.update(mevOperationsTable).set(parsed.data).where(eq(mevOperationsTable.id, params.data.id)).returning();
  if (!op) {
    res.status(404).json({ error: "Operation not found" });
    return;
  }

  res.json(UpdateMevOperationResponse.parse(op));
});

export default router;

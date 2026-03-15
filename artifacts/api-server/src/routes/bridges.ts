import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, bridgeTransfersTable } from "@workspace/db";
import {
  CreateBridgeTransferBody,
  GetBridgeTransferParams,
  GetBridgeTransferResponse,
  ListBridgeTransfersResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bridges", async (_req, res): Promise<void> => {
  const transfers = await db.select().from(bridgeTransfersTable).orderBy(desc(bridgeTransfersTable.createdAt));
  res.json(ListBridgeTransfersResponse.parse(transfers));
});

router.post("/bridges", async (req, res): Promise<void> => {
  const parsed = CreateBridgeTransferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [transfer] = await db.insert(bridgeTransfersTable).values({
    ...parsed.data,
    status: parsed.data.status ?? "pending",
    wasPrivate: parsed.data.wasPrivate ?? true,
  }).returning();

  res.status(201).json(GetBridgeTransferResponse.parse(transfer));
});

router.get("/bridges/:id", async (req, res): Promise<void> => {
  const params = GetBridgeTransferParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [transfer] = await db.select().from(bridgeTransfersTable).where(eq(bridgeTransfersTable.id, params.data.id));
  if (!transfer) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  res.json(GetBridgeTransferResponse.parse(transfer));
});

export default router;

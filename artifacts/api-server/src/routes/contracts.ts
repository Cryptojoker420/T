import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, contractsTable } from "@workspace/db";
import {
  CreateContractBody,
  GetContractParams,
  GetContractResponse,
  DeleteContractParams,
  ListContractsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contracts", async (_req, res): Promise<void> => {
  const contracts = await db.select().from(contractsTable).orderBy(desc(contractsTable.createdAt));
  res.json(ListContractsResponse.parse(contracts));
});

router.post("/contracts", async (req, res): Promise<void> => {
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [contract] = await db.insert(contractsTable).values(parsed.data).returning();

  res.status(201).json(GetContractResponse.parse(contract));
});

router.get("/contracts/:id", async (req, res): Promise<void> => {
  const params = GetContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, params.data.id));
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  res.json(GetContractResponse.parse(contract));
});

router.delete("/contracts/:id", async (req, res): Promise<void> => {
  const params = DeleteContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [contract] = await db.delete(contractsTable).where(eq(contractsTable.id, params.data.id)).returning();
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

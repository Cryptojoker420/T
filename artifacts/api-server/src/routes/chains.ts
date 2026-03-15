import { Router, type IRouter } from "express";
import { db, chainsTable } from "@workspace/db";
import { ListChainsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/chains", async (_req, res): Promise<void> => {
  const chains = await db.select().from(chainsTable).orderBy(chainsTable.chainId);
  res.json(ListChainsResponse.parse(chains));
});

export default router;

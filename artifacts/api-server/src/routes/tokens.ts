import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";
import {
  CreateTokenBody,
  GetTokenParams,
  GetTokenResponse,
  DeleteTokenParams,
  ListTokensResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tokens", async (_req, res): Promise<void> => {
  const tokens = await db.select().from(tokensTable).orderBy(desc(tokensTable.createdAt));
  res.json(ListTokensResponse.parse(tokens));
});

router.post("/tokens", async (req, res): Promise<void> => {
  const parsed = CreateTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [token] = await db.insert(tokensTable).values({
    ...parsed.data,
    decimals: parsed.data.decimals ?? 18,
    wasPrivate: parsed.data.wasPrivate ?? true,
  }).returning();

  res.status(201).json(GetTokenResponse.parse(token));
});

router.get("/tokens/:id", async (req, res): Promise<void> => {
  const params = GetTokenParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [token] = await db.select().from(tokensTable).where(eq(tokensTable.id, params.data.id));
  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  res.json(GetTokenResponse.parse(token));
});

router.delete("/tokens/:id", async (req, res): Promise<void> => {
  const params = DeleteTokenParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [token] = await db.delete(tokensTable).where(eq(tokensTable.id, params.data.id)).returning();
  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

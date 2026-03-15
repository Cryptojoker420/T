import { createHash } from "crypto";
import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, walletsTable, activityTable, safeModulesTable } from "@workspace/db";
import {
  CreateWalletBody,
  GetWalletParams,
  GetWalletResponse,
  UpdateWalletParams,
  UpdateWalletBody,
  UpdateWalletResponse,
  DeleteWalletParams,
  ListWalletsResponse,
  GetWalletActivityParams,
  GetWalletActivityResponse,
  CreateActivityBody,
  PredictWalletAddressBody,
  ListWalletModulesParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/wallets", async (_req, res): Promise<void> => {
  const wallets = await db.select().from(walletsTable).orderBy(desc(walletsTable.createdAt));
  res.json(ListWalletsResponse.parse(wallets));
});

router.post("/wallets", async (req, res): Promise<void> => {
  const parsed = CreateWalletBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [wallet] = await db.insert(walletsTable).values({
    ...parsed.data,
    privateTxDefault: parsed.data.privateTxDefault ?? true,
  }).returning();

  res.status(201).json(GetWalletResponse.parse(wallet));
});

router.get("/wallets/:id", async (req, res): Promise<void> => {
  const params = GetWalletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, params.data.id));
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  res.json(GetWalletResponse.parse(wallet));
});

router.patch("/wallets/:id", async (req, res): Promise<void> => {
  const params = UpdateWalletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWalletBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [wallet] = await db.update(walletsTable).set(parsed.data).where(eq(walletsTable.id, params.data.id)).returning();
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  res.json(UpdateWalletResponse.parse(wallet));
});

router.delete("/wallets/:id", async (req, res): Promise<void> => {
  const params = DeleteWalletParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [wallet] = await db.delete(walletsTable).where(eq(walletsTable.id, params.data.id)).returning();
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/wallets/:id/activity", async (req, res): Promise<void> => {
  const params = GetWalletActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const entries = await db.select().from(activityTable)
    .where(eq(activityTable.walletId, params.data.id))
    .orderBy(desc(activityTable.createdAt));

  res.json(GetWalletActivityResponse.parse(entries));
});

const SAFE_PROXY_FACTORY: Record<string, string> = {
  "1.4.1": "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
  "1.3.0": "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
};

const SAFE_SINGLETON: Record<string, string> = {
  "1.4.1": "0x41675C099F32341bf84BFc5382aF534df5C7461a",
  "1.3.0": "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
};

const DEFAULT_FALLBACK_HANDLER = "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4";

function keccak256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function abiEncodePacked(...parts: string[]): Buffer {
  return Buffer.from(parts.map(p => p.replace(/^0x/, "")).join(""), "hex");
}

function padLeft(hex: string, bytes: number): string {
  return hex.replace(/^0x/, "").padStart(bytes * 2, "0");
}

function encodeSetupCalldata(owners: string[], threshold: number, fallbackHandler: string): string {
  const setupSelector = "b63e800d";

  const ownersOffset = padLeft("e0", 32);
  const thresholdHex = padLeft(threshold.toString(16), 32);
  const toAddr = padLeft("0", 32);
  const dataOffset = padLeft((0xe0 + 0x20 + owners.length * 0x20).toString(16), 32);
  const fallbackHex = padLeft(fallbackHandler, 32);
  const paymentToken = padLeft("0", 32);
  const payment = padLeft("0", 32);
  const paymentReceiver = padLeft("0", 32);

  const ownersCount = padLeft(owners.length.toString(16), 32);
  const encodedOwners = owners.map(o => padLeft(o, 32)).join("");

  const dataLength = padLeft("0", 32);

  return "0x" + setupSelector + ownersOffset + thresholdHex + toAddr + dataOffset + fallbackHex + paymentToken + payment + paymentReceiver + ownersCount + encodedOwners + dataLength;
}

function predictSafeAddress(
  owners: string[],
  threshold: number,
  saltNonce: string,
  safeVersion: string,
  factoryAddress?: string | null,
  fallbackHandler?: string | null
): { predictedAddress: string; factoryAddress: string; initializerHash: string } {
  const version = safeVersion || "1.4.1";
  const factory = factoryAddress || SAFE_PROXY_FACTORY[version] || SAFE_PROXY_FACTORY["1.4.1"];
  const singleton = SAFE_SINGLETON[version] || SAFE_SINGLETON["1.4.1"];
  const handler = fallbackHandler || DEFAULT_FALLBACK_HANDLER;

  const sortedOwners = [...owners].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const setupData = encodeSetupCalldata(sortedOwners, threshold, handler);
  const setupDataBuf = Buffer.from(setupData.replace(/^0x/, ""), "hex");
  const initializerHash = keccak256Hex(setupDataBuf);

  const saltInput = abiEncodePacked(
    keccak256Hex(setupDataBuf),
    padLeft(BigInt(saltNonce).toString(16), 32)
  );
  const salt = keccak256Hex(saltInput);

  const proxyCreationCode = "608060405234801561001057600080fd5b5060405161001d90610050565b604051809103906000f08015801561003957600080fd5b50600080546001600160a01b0319169055610061565b";
  const deploymentDataBuf = Buffer.from(proxyCreationCode + padLeft(singleton, 32), "hex");
  const deploymentHash = keccak256Hex(deploymentDataBuf);

  const create2Input = abiEncodePacked("ff", factory.replace(/^0x/, ""), salt, deploymentHash);
  const create2Hash = keccak256Hex(create2Input);
  const predicted = "0x" + create2Hash.slice(24);

  return {
    predictedAddress: predicted,
    factoryAddress: factory,
    initializerHash: "0x" + initializerHash,
  };
}

router.post("/wallets/predict-address", async (req, res): Promise<void> => {
  const parsed = PredictWalletAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { owners, threshold, chainId, saltNonce, safeVersion, factoryAddress, fallbackHandler } = parsed.data;
  const version = safeVersion || "1.4.1";
  const result = predictSafeAddress(owners, threshold, saltNonce, version, factoryAddress, fallbackHandler);

  res.json({
    ...result,
    saltNonce,
    safeVersion: version,
    chainId,
  });
});

router.get("/wallets/:id/modules", async (req, res): Promise<void> => {
  const params = ListWalletModulesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, params.data.id));
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const modules = await db.select().from(safeModulesTable)
    .where(and(eq(safeModulesTable.safeAddress, wallet.address), eq(safeModulesTable.chainId, wallet.chainId)))
    .orderBy(desc(safeModulesTable.createdAt));
  res.json(modules);
});

router.post("/activity", async (req, res): Promise<void> => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [entry] = await db.insert(activityTable).values(parsed.data).returning();

  res.status(201).json(entry);
});

export default router;

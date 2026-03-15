import { Router, type IRouter } from "express";
import {
  EncodeCalldataBody,
  DecodeCalldataBody,
  ChecksumAddressBody,
  Keccak256HashBody,
} from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

function keccak256Simple(input: string): string {
  return "0x" + crypto.createHash("sha3-256").update(input).digest("hex");
}

function getFunctionSelector(sig: string): string {
  const hash = crypto.createHash("sha3-256").update(sig).digest("hex");
  return "0x" + hash.slice(0, 8);
}

function encodeParam(param: string): string {
  const cleaned = param.startsWith("0x") ? param.slice(2) : param;
  if (/^\d+$/.test(param)) {
    return BigInt(param).toString(16).padStart(64, "0");
  }
  return cleaned.padStart(64, "0");
}

router.post("/tools/encode", async (req, res): Promise<void> => {
  const parsed = EncodeCalldataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const selector = getFunctionSelector(parsed.data.functionSignature);
  const encodedParams = parsed.data.params.map(encodeParam).join("");

  res.json({
    encoded: selector + encodedParams,
    selector,
  });
});

router.post("/tools/decode", async (req, res): Promise<void> => {
  const parsed = DecodeCalldataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const calldata = parsed.data.calldata.startsWith("0x")
    ? parsed.data.calldata.slice(2)
    : parsed.data.calldata;

  const selector = "0x" + calldata.slice(0, 8);
  const paramData = calldata.slice(8);

  const params: { name: string; value: string }[] = [];
  for (let i = 0; i < paramData.length; i += 64) {
    params.push({
      name: `param${Math.floor(i / 64)}`,
      value: "0x" + paramData.slice(i, i + 64),
    });
  }

  const matchedFn = parsed.data.abi.find((item: any) => {
    if (item.type !== "function") return false;
    const sig = `${item.name}(${(item.inputs || []).map((i: any) => i.type).join(",")})`;
    return getFunctionSelector(sig) === selector;
  });

  res.json({
    functionName: matchedFn ? (matchedFn as any).name : `unknown(${selector})`,
    params,
  });
});

router.post("/tools/checksum", async (req, res): Promise<void> => {
  const parsed = ChecksumAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const addr = parsed.data.address.toLowerCase().replace("0x", "");
  const hash = crypto.createHash("sha3-256").update(addr).digest("hex");

  let checksummed = "0x";
  for (let i = 0; i < addr.length; i++) {
    checksummed += parseInt(hash[i], 16) >= 8
      ? addr[i].toUpperCase()
      : addr[i];
  }

  const isValid = /^0x[0-9a-fA-F]{40}$/.test(parsed.data.address);

  res.json({ checksummed, isValid });
});

router.post("/tools/keccak256", async (req, res): Promise<void> => {
  const parsed = Keccak256HashBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const hash = keccak256Simple(parsed.data.input);
  res.json({ hash });
});

export default router;

import { Router } from "express";
import solc from "solc";
import * as fs from "fs";
import * as path from "path";

const router = Router();

const MAX_SOURCE_SIZE = 256 * 1024;
const MAX_TOTAL_SIZE = 1024 * 1024;

function findImport(
  userSources: Record<string, string>
): (importPath: string) => { contents: string } | { error: string } {
  return (importPath: string) => {
    if (userSources[importPath]) {
      return { contents: userSources[importPath] };
    }

    const searchPaths = [
      path.resolve(process.cwd(), "node_modules"),
      path.resolve(process.cwd(), "..", "..", "node_modules"),
    ];

    for (const base of searchPaths) {
      const fullPath = path.join(base, importPath);
      try {
        if (fs.existsSync(fullPath)) {
          const contents = fs.readFileSync(fullPath, "utf-8");
          return { contents };
        }
      } catch {
        continue;
      }
    }

    return { error: `File not found: ${importPath}` };
  };
}

const solcVersionCache = new Map<string, any>();

async function loadSolcVersion(version: string): Promise<any> {
  if (solcVersionCache.has(version)) {
    return solcVersionCache.get(version)!;
  }

  return new Promise((resolve, reject) => {
    (solc as any).loadRemoteVersion(version, (err: any, solcSnapshot: any) => {
      if (err) {
        reject(new Error(`Failed to load solc ${version}: ${err.message || err}`));
      } else {
        solcVersionCache.set(version, solcSnapshot);
        resolve(solcSnapshot);
      }
    });
  });
}

router.post("/compiler/compile", async (req, res) => {
  try {
    const {
      source,
      sources: multiSources,
      filename = "Contract.sol",
      version,
      evmVersion = "paris",
      optimizerRuns = 200,
    } = req.body;

    let solidity: Record<string, { content: string }>;
    let userSourceMap: Record<string, string> = {};

    if (multiSources && typeof multiSources === "object") {
      let totalSize = 0;
      solidity = {};
      for (const [fname, content] of Object.entries(multiSources)) {
        if (typeof content !== "string") continue;
        totalSize += content.length;
        if (totalSize > MAX_TOTAL_SIZE) {
          return res.status(400).json({ error: `Total sources exceed maximum size of ${MAX_TOTAL_SIZE} bytes` });
        }
        solidity[fname] = { content };
        userSourceMap[fname] = content;
      }
      if (Object.keys(solidity).length === 0) {
        return res.status(400).json({ error: "No valid source files provided" });
      }
    } else if (source && typeof source === "string") {
      if (source.length > MAX_SOURCE_SIZE) {
        return res.status(400).json({ error: `Source exceeds maximum size of ${MAX_SOURCE_SIZE} bytes` });
      }
      solidity = { [filename]: { content: source } };
      userSourceMap[filename] = source;
    } else {
      return res.status(400).json({ error: "source or sources is required" });
    }

    const input = {
      language: "Solidity",
      sources: solidity,
      settings: {
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.gasEstimates"],
          },
        },
        optimizer: { enabled: true, runs: optimizerRuns },
        evmVersion,
      },
    };

    let compiler = solc;
    if (version && typeof version === "string" && version !== "default") {
      try {
        compiler = await loadSolcVersion(version);
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }
    }

    const output = JSON.parse(
      compiler.compile(JSON.stringify(input), { import: findImport(userSourceMap) })
    );

    const errors = output.errors?.filter((e: any) => e.severity === "error") || [];
    const warnings = output.errors?.filter((e: any) => e.severity === "warning") || [];

    if (errors.length > 0) {
      return res.json({
        success: false,
        errors: errors.map((e: any) => ({
          message: e.formattedMessage || e.message,
          severity: e.severity,
          sourceLocation: e.sourceLocation,
        })),
        warnings: warnings.map((w: any) => ({
          message: w.formattedMessage || w.message,
        })),
      });
    }

    const contracts: Record<string, any> = {};
    if (output.contracts) {
      for (const file of Object.keys(output.contracts)) {
        for (const name of Object.keys(output.contracts[file])) {
          const c = output.contracts[file][name];
          contracts[name] = {
            abi: c.abi,
            bytecode: c.evm?.bytecode?.object ? `0x${c.evm.bytecode.object}` : null,
            deployedBytecode: c.evm?.deployedBytecode?.object ? `0x${c.evm.deployedBytecode.object}` : null,
            gasEstimates: c.evm?.gasEstimates || null,
            sourceFile: file,
          };
        }
      }
    }

    return res.json({
      success: true,
      contracts,
      warnings: warnings.map((w: any) => ({
        message: w.formattedMessage || w.message,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Compilation failed" });
  }
});

router.get("/compiler/version", (_req, res) => {
  try {
    const version = solc.version();
    res.json({ version });
  } catch {
    res.json({ version: "unknown" });
  }
});

router.get("/compiler/versions", async (_req, res) => {
  try {
    const versionsModule = await import("solc/linker" as any).catch(() => null);

    const versions = [
      "v0.8.28+commit.7893614a",
      "v0.8.27+commit.40a35a09",
      "v0.8.26+commit.8a97fa7a",
      "v0.8.25+commit.b61c2a91",
      "v0.8.24+commit.e11b9ed9",
      "v0.8.23+commit.f704f362",
      "v0.8.22+commit.4fc1097e",
      "v0.8.21+commit.d9974bed",
      "v0.8.20+commit.a1b79de6",
      "v0.8.19+commit.7dd6d404",
      "v0.8.18+commit.87f61d96",
      "v0.8.17+commit.8df45f5f",
      "v0.8.16+commit.07a7930e",
      "v0.8.15+commit.e14f2714",
      "v0.8.14+commit.80d49f37",
      "v0.8.13+commit.abaa5c0e",
      "v0.8.12+commit.f00d7308",
      "v0.8.11+commit.d7f03943",
      "v0.8.10+commit.fc410830",
      "v0.8.9+commit.e5eed63a",
      "v0.8.8+commit.dddeac2f",
      "v0.8.7+commit.e28d00a7",
      "v0.8.6+commit.11564f7e",
      "v0.8.5+commit.a4f2e591",
      "v0.8.4+commit.c7e474f2",
      "v0.8.3+commit.8d00100c",
      "v0.8.2+commit.661d1103",
      "v0.8.1+commit.df193b15",
      "v0.8.0+commit.c7dfd78e",
      "v0.7.6+commit.7338295f",
      "v0.7.5+commit.eb77ed08",
      "v0.7.4+commit.3f05b770",
      "v0.7.3+commit.9bfce1f6",
      "v0.7.2+commit.51b20bc0",
      "v0.7.1+commit.f4a555be",
      "v0.7.0+commit.9e61f92b",
      "v0.6.12+commit.27d51765",
      "v0.6.11+commit.5ef660b1",
      "v0.6.10+commit.00c0fcaf",
      "v0.6.9+commit.3e3065ac",
      "v0.6.8+commit.0bbfe453",
      "v0.6.7+commit.b8d736ae",
      "v0.6.6+commit.6c089d02",
      "v0.5.17+commit.d19bba13",
      "v0.5.16+commit.9c3226ce",
      "v0.4.26+commit.4563c3fc",
    ];

    const bundledVersion = solc.version();

    res.json({ bundledVersion, versions });
  } catch (err: any) {
    res.json({ bundledVersion: "unknown", versions: [] });
  }
});

export default router;

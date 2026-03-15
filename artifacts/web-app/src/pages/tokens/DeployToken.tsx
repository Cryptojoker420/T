import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useListChains, useCreateToken } from "@workspace/api-client-react";
import { useAppStore } from "@/store/useAppStore";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { viemAdapter } from "thirdweb/adapters/viem";
import { defineChain } from "thirdweb";
import { thirdwebClient } from "@/lib/thirdweb";
import { Button, Card, Input, Badge } from "@/components/shared";
import { cn } from "@/components/shared";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Shield, ShieldAlert, AlertCircle, Rocket,
  CheckCircle2, Copy, Code2
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type DeployMode = "wizard" | "register";

interface TokenWizardConfig {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
}

function generateERC20Source(config: TokenWizardConfig): string {
  const imports = [
    `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";`,
    config.burnable ? `import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";` : "",
    config.pausable ? `import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";` : "",
    `import "@openzeppelin/contracts/access/Ownable.sol";`,
  ].filter(Boolean).join("\n");

  const inherits = [
    "ERC20",
    config.burnable ? "ERC20Burnable" : "",
    config.pausable ? "ERC20Pausable" : "",
    "Ownable",
  ].filter(Boolean).join(", ");

  const functions = [
    config.mintable ? `\n    function mint(address to, uint256 amount) public onlyOwner {\n        _mint(to, amount);\n    }` : "",
    config.pausable ? `\n    function pause() public onlyOwner {\n        _pause();\n    }\n\n    function unpause() public onlyOwner {\n        _unpause();\n    }` : "",
  ].filter(Boolean).join("\n");

  const overrides = config.pausable ? `\n\n    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {\n        super._update(from, to, value);\n    }` : "";

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${imports}

contract ${config.symbol}Token is ${inherits} {
    constructor() ERC20("${config.name}", "${config.symbol}") Ownable(msg.sender) {
        _mint(msg.sender, ${config.totalSupply} * 10 ** decimals());
    }
${functions}${overrides}
}
`;
}

export function DeployToken() {
  const [, setLocation] = useLocation();
  const { isPrivateTx } = useAppStore();
  const { data: chains } = useListChains();
  const createTokenMut = useCreateToken();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const address = account?.address;
  const isConnected = !!account;

  const [mode, setMode] = useState<DeployMode>("wizard");
  const [tokenType, setTokenType] = useState("ERC-20");
  const [chainId, setChainId] = useState(activeChain?.id || 1);

  const [wizardConfig, setWizardConfig] = useState<TokenWizardConfig>({
    name: "",
    symbol: "",
    decimals: 18,
    totalSupply: "1000000",
    mintable: true,
    burnable: true,
    pausable: false,
  });

  const [contractAddress, setContractAddress] = useState("");
  const [deployTxHash, setDeployTxHash] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState(18);
  const [totalSupply, setTotalSupply] = useState("1000000");

  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ address: string; txHash: string } | null>(null);

  const deployToken = useCallback(async () => {
    if (!account || !wizardConfig.name || !wizardConfig.symbol) return;

    setDeploying(true);
    setDeployResult(null);

    try {
      const source = generateERC20Source(wizardConfig);

      const compileRes = await fetch(`${API_BASE}/api/compiler/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, filename: "Token.sol" }),
      });
      const compileData = await compileRes.json();

      if (!compileData.success) {
        const errMsg = compileData.errors?.[0]?.message || "Compilation failed";
        toast.error("Compilation failed", { description: errMsg });
        setDeploying(false);
        return;
      }

      const contractName = Object.keys(compileData.contracts)[0];
      const contract = compileData.contracts[contractName];

      if (!contract.bytecode) {
        toast.error("No bytecode generated");
        setDeploying(false);
        return;
      }

      const chain = defineChain(chainId);
      const walletClient = viemAdapter.walletClient.toViem({
        client: thirdwebClient,
        chain,
        account,
      });

      const hash = await walletClient.deployContract({
        abi: contract.abi,
        bytecode: contract.bytecode as `0x${string}`,
        account: walletClient.account!,
      });

      toast.success("Token deployment submitted!", { description: `Tx: ${hash.slice(0, 14)}...` });

      const { createPublicClient, http } = await import("viem");
      const viemChains = await import("viem/chains");
      const chainMap: Record<number, any> = {
        1: viemChains.mainnet, 137: viemChains.polygon, 42161: viemChains.arbitrum,
        8453: viemChains.base, 10: viemChains.optimism, 56: viemChains.bsc,
        43114: viemChains.avalanche, 11155111: viemChains.sepolia, 84532: viemChains.baseSepolia,
      };

      const viemChain = chainMap[chainId];
      if (viemChain) {
        const publicClient = createPublicClient({ chain: viemChain, transport: http() });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.contractAddress) {
          setDeployResult({ address: receipt.contractAddress, txHash: hash });

          const token = await createTokenMut.mutateAsync({
            data: {
              address: receipt.contractAddress,
              name: wizardConfig.name,
              symbol: wizardConfig.symbol,
              decimals: wizardConfig.decimals,
              tokenType: "ERC-20",
              chainId,
              totalSupply: wizardConfig.totalSupply,
              deployer: account.address,
              deployTxHash: hash,
              wasPrivate: isPrivateTx,
            }
          });

          toast.success("Token deployed and registered!", {
            description: `${wizardConfig.symbol} at ${receipt.contractAddress.slice(0, 14)}...`,
          });
        }
      }
    } catch (err: any) {
      toast.error("Deployment failed", { description: err.message });
    } finally {
      setDeploying(false);
    }
  }, [account, wizardConfig, chainId, isPrivateTx, createTokenMut]);

  const handleRegister = async () => {
    if (!name || !symbol || !contractAddress) return;

    if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error("Invalid contract address format");
      return;
    }

    if (deployTxHash && !deployTxHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      toast.error("Invalid transaction hash format");
      return;
    }

    try {
      const token = await createTokenMut.mutateAsync({
        data: {
          address: contractAddress,
          name,
          symbol,
          decimals,
          tokenType,
          chainId,
          totalSupply: tokenType === "ERC-20" ? totalSupply : undefined,
          deployer: address || undefined,
          deployTxHash: deployTxHash || undefined,
          wasPrivate: isPrivateTx,
        }
      });
      toast.success("Token registered!", {
        description: `${symbol} at ${contractAddress.slice(0, 10)}...`
      });
      setLocation(`/tokens/${token.id}`);
    } catch {
      toast.error("Failed to register token");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setLocation("/tokens")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Token Deployment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deploy a new token on-chain or register an existing one.</p>
        </div>
      </div>

      {!isConnected && (
        <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-xs text-destructive font-medium">Connect your wallet to deploy tokens</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setMode("wizard")}
          className={cn(
            "flex-1 px-4 py-3 rounded-md border text-sm font-medium transition-colors",
            mode === "wizard"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-muted-foreground/30 text-foreground"
          )}
        >
          <Rocket className="w-4 h-4 inline mr-2" />
          Deploy New Token
        </button>
        <button
          onClick={() => setMode("register")}
          className={cn(
            "flex-1 px-4 py-3 rounded-md border text-sm font-medium transition-colors",
            mode === "register"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-muted-foreground/30 text-foreground"
          )}
        >
          <Code2 className="w-4 h-4 inline mr-2" />
          Register Existing
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "wizard" && (
          <motion.div key="wizard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="space-y-5">
              <div>
                <h3 className="text-base font-medium text-foreground mb-1">ERC-20 Token Wizard</h3>
                <p className="text-xs text-muted-foreground">Configure and deploy a new ERC-20 token. Uses OpenZeppelin contracts compiled via solc.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Token Name</label>
                  <Input
                    placeholder="e.g. My Token"
                    value={wizardConfig.name}
                    onChange={(e) => setWizardConfig(c => ({ ...c, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Symbol</label>
                  <Input
                    placeholder="e.g. MTK"
                    value={wizardConfig.symbol}
                    onChange={(e) => setWizardConfig(c => ({ ...c, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Initial Supply</label>
                  <Input
                    placeholder="1000000"
                    value={wizardConfig.totalSupply}
                    onChange={(e) => setWizardConfig(c => ({ ...c, totalSupply: e.target.value }))}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Tokens minted to deployer address</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Decimals</label>
                  <Input
                    type="number"
                    min={0}
                    max={18}
                    value={wizardConfig.decimals}
                    onChange={(e) => setWizardConfig(c => ({ ...c, decimals: parseInt(e.target.value) || 18 }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Features</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: "mintable" as const, label: "Mintable", desc: "Owner can mint" },
                    { key: "burnable" as const, label: "Burnable", desc: "Holders can burn" },
                    { key: "pausable" as const, label: "Pausable", desc: "Owner can pause" },
                  ]).map(feat => (
                    <label
                      key={feat.key}
                      className={cn(
                        "p-3 rounded-md border cursor-pointer transition-colors",
                        wizardConfig[feat.key]
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={wizardConfig[feat.key]}
                        onChange={(e) => setWizardConfig(c => ({ ...c, [feat.key]: e.target.checked }))}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-foreground">{feat.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {chains?.map(chain => (
                    <button
                      key={chain.chainId}
                      onClick={() => setChainId(chain.chainId)}
                      className={cn(
                        "px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                        chainId === chain.chainId
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground/30 text-foreground"
                      )}
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn(
                "p-3 rounded-md border flex items-center gap-3",
                isPrivateTx ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
              )}>
                {isPrivateTx ? <Shield className="w-4 h-4 text-success" /> : <ShieldAlert className="w-4 h-4 text-destructive" />}
                <span className={cn("text-sm font-medium", isPrivateTx ? "text-success" : "text-destructive")}>
                  {isPrivateTx ? "Private transactions via Flashbots Protect" : "Public mempool transactions"}
                </span>
              </div>

              {deployResult && (
                <div className="space-y-2">
                  <div className="p-3 rounded-md border border-success/20 bg-success/5">
                    <p className="text-xs text-success font-medium flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Token Deployed Successfully
                    </p>
                    <div className="space-y-1">
                      <button
                        onClick={() => { navigator.clipboard.writeText(deployResult.address); toast.success("Address copied"); }}
                        className="text-xs font-mono text-muted-foreground hover:text-foreground break-all block"
                      >
                        Address: {deployResult.address}
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(deployResult.txHash); toast.success("Tx hash copied"); }}
                        className="text-xs font-mono text-muted-foreground hover:text-foreground break-all block"
                      >
                        Tx: {deployResult.txHash}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={deployToken}
                  disabled={!wizardConfig.name || !wizardConfig.symbol || !isConnected}
                  isLoading={deploying}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy {wizardConfig.symbol || "Token"}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {mode === "register" && (
          <motion.div key="register" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="space-y-5">
              <div>
                <h3 className="text-base font-medium text-foreground mb-1">Register Existing Token</h3>
                <p className="text-xs text-muted-foreground">Register an already-deployed token contract for tracking in your workspace.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Token Name</label>
                  <Input placeholder="e.g. USD Coin" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Symbol</label>
                  <Input placeholder="e.g. USDC" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Contract Address</label>
                <Input placeholder="0x..." value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} className="font-mono" />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Deploy Transaction Hash (optional)</label>
                <Input placeholder="0x..." value={deployTxHash} onChange={(e) => setDeployTxHash(e.target.value)} className="font-mono" />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Token Standard</label>
                <div className="grid grid-cols-3 gap-3">
                  {["ERC-20", "ERC-721", "ERC-1155"].map(type => (
                    <button
                      key={type}
                      onClick={() => setTokenType(type)}
                      className={cn(
                        "px-3 py-2.5 rounded-md border text-sm font-medium transition-colors",
                        tokenType === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground/30 text-foreground"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {tokenType === "ERC-20" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Decimals</label>
                    <Input type="number" min={0} max={18} value={decimals} onChange={(e) => setDecimals(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Total Supply</label>
                    <Input placeholder="1000000" value={totalSupply} onChange={(e) => setTotalSupply(e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {chains?.map(chain => (
                    <button
                      key={chain.chainId}
                      onClick={() => setChainId(chain.chainId)}
                      className={cn(
                        "px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                        chainId === chain.chainId
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground/30 text-foreground"
                      )}
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn(
                "p-3 rounded-md border flex items-center gap-3",
                isPrivateTx ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
              )}>
                {isPrivateTx ? <Shield className="w-4 h-4 text-success" /> : <ShieldAlert className="w-4 h-4 text-destructive" />}
                <span className={cn("text-sm font-medium", isPrivateTx ? "text-success" : "text-destructive")}>
                  {isPrivateTx ? "Private transactions via Flashbots Protect" : "Public mempool transactions"}
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleRegister}
                  disabled={!name || !symbol || !contractAddress}
                  isLoading={createTokenMut.isPending}
                >
                  Register Token
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

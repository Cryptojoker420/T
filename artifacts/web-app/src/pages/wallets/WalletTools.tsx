import { useState, useCallback } from "react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { Button, Card, Input, Badge } from "@/components/shared";
import { cn } from "@/components/shared";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ArrowLeft, Download, Copy, RefreshCw,
  Layers, Tag, AlertCircle, CheckCircle2
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  createPublicClient, http, formatEther, formatUnits,
  type Address
} from "viem";
import {
  mainnet, polygon, arbitrum, base, optimism, bsc,
  avalanche, sepolia, baseSepolia
} from "viem/chains";

type ToolTab = "balances" | "generator" | "labels";

const CHAINS = [
  { chain: mainnet, name: "Ethereum", symbol: "ETH" },
  { chain: polygon, name: "Polygon", symbol: "MATIC" },
  { chain: arbitrum, name: "Arbitrum", symbol: "ETH" },
  { chain: base, name: "Base", symbol: "ETH" },
  { chain: optimism, name: "Optimism", symbol: "ETH" },
  { chain: bsc, name: "BSC", symbol: "BNB" },
  { chain: avalanche, name: "Avalanche", symbol: "AVAX" },
  { chain: sepolia, name: "Sepolia", symbol: "ETH" },
  { chain: baseSepolia, name: "Base Sepolia", symbol: "ETH" },
];

const ERC20_BALANCE_ABI = [{
  inputs: [{ name: "account", type: "address" }],
  name: "balanceOf",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
}] as const;

const ERC20_ALLOWANCE_ABI = [{
  inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
  name: "allowance",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
}] as const;

interface ChainBalance {
  chain: string;
  symbol: string;
  balance: string;
  raw: bigint;
  error?: string;
}

interface GeneratedWallet {
  index: number;
  address: string;
  privateKey: string;
}

interface WalletLabel {
  address: string;
  label: string;
}

export function WalletTools() {
  const [, setLocation] = useLocation();
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<ToolTab>("balances");

  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const [walletCount, setWalletCount] = useState(5);
  const [generatedWallets, setGeneratedWallets] = useState<GeneratedWallet[]>([]);
  const [generating, setGenerating] = useState(false);

  const [labels, setLabels] = useState<WalletLabel[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("chainforge_wallet_labels") || "[]");
    } catch { return []; }
  });
  const [newLabelAddr, setNewLabelAddr] = useState("");
  const [newLabelText, setNewLabelText] = useState("");

  const fetchBalances = useCallback(async () => {
    const addr = account?.address;
    if (!addr) {
      toast.error("Connect your wallet first");
      return;
    }

    setLoadingBalances(true);
    const results: ChainBalance[] = [];

    await Promise.allSettled(
      CHAINS.map(async ({ chain, name, symbol }) => {
        try {
          const client = createPublicClient({ chain, transport: http() });
          const balance = await client.getBalance({ address: addr as Address });
          results.push({ chain: name, symbol, balance: formatEther(balance), raw: balance });
        } catch (err: any) {
          results.push({ chain: name, symbol, balance: "0", raw: 0n, error: err.message });
        }
      })
    );

    results.sort((a, b) => (b.raw > a.raw ? 1 : b.raw < a.raw ? -1 : 0));
    setBalances(results);
    setLoadingBalances(false);
    toast.success(`Fetched balances across ${CHAINS.length} chains`);
  }, [account]);

  const generateWallets = useCallback(async () => {
    setGenerating(true);
    try {
      const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
      const wallets: GeneratedWallet[] = [];
      for (let i = 0; i < walletCount; i++) {
        const pk = generatePrivateKey();
        const acct = privateKeyToAccount(pk);
        wallets.push({ index: i + 1, address: acct.address, privateKey: pk });
      }
      setGeneratedWallets(wallets);
      toast.success(`Generated ${walletCount} wallets`);
    } catch (err: any) {
      toast.error("Generation failed", { description: err.message });
    }
    setGenerating(false);
  }, [walletCount]);

  const exportWalletsCSV = useCallback(() => {
    if (generatedWallets.length === 0) return;
    const csv = "Index,Address,Private Key\n" +
      generatedWallets.map(w => `${w.index},${w.address},${w.privateKey}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wallets.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Wallets exported as CSV");
  }, [generatedWallets]);

  const exportBalancesCSV = useCallback(() => {
    if (balances.length === 0) return;
    const csv = "Chain,Symbol,Balance\n" +
      balances.map(b => `${b.chain},${b.symbol},${b.balance}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "balances.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Balances exported as CSV");
  }, [balances]);

  const addLabel = useCallback(() => {
    if (!newLabelAddr.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error("Invalid address format");
      return;
    }
    if (!newLabelText.trim()) {
      toast.error("Label cannot be empty");
      return;
    }
    const updated = [...labels.filter(l => l.address.toLowerCase() !== newLabelAddr.toLowerCase()), { address: newLabelAddr, label: newLabelText.trim() }];
    setLabels(updated);
    localStorage.setItem("chainforge_wallet_labels", JSON.stringify(updated));
    setNewLabelAddr("");
    setNewLabelText("");
    toast.success("Label saved");
  }, [newLabelAddr, newLabelText, labels]);

  const removeLabel = useCallback((address: string) => {
    const updated = labels.filter(l => l.address.toLowerCase() !== address.toLowerCase());
    setLabels(updated);
    localStorage.setItem("chainforge_wallet_labels", JSON.stringify(updated));
    toast.success("Label removed");
  }, [labels]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setLocation("/wallets")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Wallet Tools</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Multi-chain balance aggregator, wallet generator, and address labels.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-0">
        {([
          { id: "balances" as ToolTab, label: "Balance Aggregator", icon: Layers },
          { id: "generator" as ToolTab, label: "Wallet Generator", icon: Wallet },
          { id: "labels" as ToolTab, label: "Address Labels", icon: Tag },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "balances" && (
          <motion.div key="balances" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {!account && (
              <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-destructive font-medium">Connect your wallet to view balances</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                {account && (
                  <p className="text-xs font-mono text-muted-foreground">{account.address}</p>
                )}
              </div>
              <div className="flex gap-2">
                {balances.length > 0 && (
                  <Button size="sm" variant="outline" onClick={exportBalancesCSV}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                  </Button>
                )}
                <Button size="sm" onClick={fetchBalances} isLoading={loadingBalances} disabled={!account}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Fetch Balances
                </Button>
              </div>
            </div>

            {balances.length > 0 && (
              <Card className="p-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Chain</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Symbol</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Balance</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((b, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2.5 text-sm font-medium text-foreground">{b.chain}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline">{b.symbol}</Badge></td>
                        <td className="px-4 py-2.5 text-right text-sm font-mono text-foreground">
                          {parseFloat(b.balance).toFixed(6)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {b.error ? (
                            <Badge variant="outline">
                              <AlertCircle className="w-3 h-3 mr-1 text-destructive" /> Error
                            </Badge>
                          ) : (
                            <Badge variant="success">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === "generator" && (
          <motion.div key="generator" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <Card className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">Bulk Wallet Generator</h3>
                <p className="text-xs text-muted-foreground">Generate random wallets client-side. Private keys never leave your browser.</p>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Number of Wallets</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={walletCount}
                    onChange={(e) => setWalletCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                </div>
                <Button onClick={generateWallets} isLoading={generating}>
                  <Wallet className="w-4 h-4 mr-2" /> Generate
                </Button>
              </div>

              <div className="p-2 rounded-md bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-xs text-yellow-500 font-medium">Security: Keys are generated locally using viem. Back up your CSV securely.</p>
              </div>
            </Card>

            {generatedWallets.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{generatedWallets.length} Wallet(s) Generated</p>
                  <Button size="sm" variant="outline" onClick={exportWalletsCSV}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                  </Button>
                </div>

                <Card className="p-0 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">#</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Address</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Private Key</th>
                        <th className="px-4 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedWallets.map((w) => (
                        <tr key={w.index} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-2 text-xs text-muted-foreground">{w.index}</td>
                          <td className="px-4 py-2 text-xs font-mono text-foreground">{w.address.slice(0, 10)}...{w.address.slice(-6)}</td>
                          <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{w.privateKey.slice(0, 10)}...{w.privateKey.slice(-4)}</td>
                          <td className="px-4 py-2">
                            <button onClick={() => { navigator.clipboard.writeText(w.address); toast.success("Address copied"); }} className="text-muted-foreground hover:text-foreground">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </motion.div>
        )}

        {activeTab === "labels" && (
          <motion.div key="labels" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <Card className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">Address Labels</h3>
                <p className="text-xs text-muted-foreground">Tag wallet addresses with human-readable labels. Stored locally.</p>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
                  <Input
                    placeholder="0x..."
                    value={newLabelAddr}
                    onChange={(e) => setNewLabelAddr(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Label</label>
                  <Input
                    placeholder="e.g. Treasury, Dev Wallet"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                  />
                </div>
                <Button onClick={addLabel} disabled={!newLabelAddr || !newLabelText}>
                  <Tag className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
            </Card>

            {labels.length > 0 ? (
              <Card className="p-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Label</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Address</th>
                      <th className="px-4 py-2.5 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map((l, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2.5">
                          <Badge variant="accent">{l.label}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{l.address}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => removeLabel(l.address)} className="text-xs text-destructive hover:underline">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No labels yet. Add your first label above.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

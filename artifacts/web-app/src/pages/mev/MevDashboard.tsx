import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListMevOperations, useCreateMevOperation, useUpdateMevOperation, useListChains, getListMevOperationsQueryKey } from "@workspace/api-client-react";
import { useAppStore } from "@/store/useAppStore";
import { Button, Card, Input, Badge } from "@/components/shared";
import { Zap, Plus, Play, Shield, Clock, CheckCircle, XCircle, Settings, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const PAYMASTERS = ["None (Self-pay)", "StackUp Paymaster", "Pimlico Paymaster", "Biconomy Paymaster", "Gelato Paymaster"];
const BUNDLER_PROVIDERS = [
  { id: "flashbots", name: "Flashbots", url: "https://relay.flashbots.net" },
  { id: "pimlico", name: "Pimlico Alto", url: "https://api.pimlico.io/v2/{chainId}/rpc?apikey=YOUR_KEY" },
  { id: "alchemy", name: "Alchemy", url: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY" },
  { id: "stackup", name: "StackUp", url: "https://api.stackup.sh/v1/node/YOUR_KEY" },
  { id: "gelato", name: "Gelato Relay", url: "https://relay.gelato.digital" },
  { id: "custom", name: "Custom RPC", url: "" },
];

const ENTRY_POINTS = [
  { version: "v0.6", address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" },
  { version: "v0.7", address: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" },
];

export function MevDashboard() {
  const queryClient = useQueryClient();
  const { data: operations, isLoading } = useListMevOperations();
  const { data: chains } = useListChains();
  const createOpMut = useCreateMevOperation();
  const updateOpMut = useUpdateMevOperation();
  const { isPrivateTx, activeChainId } = useAppStore();

  const [showBuilder, setShowBuilder] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sender, setSender] = useState("");
  const [target, setTarget] = useState("");
  const [calldata, setCalldata] = useState("");
  const [value, setValue] = useState("0");
  const [nonce, setNonce] = useState("");
  const [paymaster, setPaymaster] = useState(PAYMASTERS[0]);
  const [bundlerProvider, setBundlerProvider] = useState(BUNDLER_PROVIDERS[0].id);
  const [bundlerUrl, setBundlerUrl] = useState(BUNDLER_PROVIDERS[0].url);
  const [entryPointVersion, setEntryPointVersion] = useState("v0.7");

  const [initCode, setInitCode] = useState("");
  const [callGasLimit, setCallGasLimit] = useState("");
  const [verificationGasLimit, setVerificationGasLimit] = useState("");
  const [preVerificationGas, setPreVerificationGas] = useState("");
  const [maxFeePerGas, setMaxFeePerGas] = useState("");
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState("");
  const [paymasterAndData, setPaymasterAndData] = useState("");
  const [signature, setSignature] = useState("");

  const getChainName = (chainId: number) => chains?.find(c => c.chainId === chainId)?.name || `Chain ${chainId}`;
  const selectedEntryPoint = ENTRY_POINTS.find(ep => ep.version === entryPointVersion)!;

  const handleBuild = async () => {
    if (!sender || !target) return;
    try {
      await createOpMut.mutateAsync({
        data: {
          opType: "userOp",
          sender,
          chainId: activeChainId,
          target,
          calldata: calldata || "0x",
          value,
          nonce: nonce || undefined,
          initCode: initCode || undefined,
          callGasLimit: callGasLimit || undefined,
          verificationGasLimit: verificationGasLimit || undefined,
          preVerificationGas: preVerificationGas || undefined,
          maxFeePerGas: maxFeePerGas || undefined,
          maxPriorityFeePerGas: maxPriorityFeePerGas || undefined,
          paymasterAndData: paymasterAndData || undefined,
          signature: signature || undefined,
          paymaster: paymaster === PAYMASTERS[0] ? undefined : paymaster.split(" ")[0],
          bundler: BUNDLER_PROVIDERS.find(b => b.id === bundlerProvider)?.name,
          bundlerProvider,
          bundlerUrl: bundlerUrl || undefined,
          entryPointAddress: selectedEntryPoint.address,
          status: "draft",
          wasPrivate: isPrivateTx,
        }
      });
      await queryClient.invalidateQueries({ queryKey: getListMevOperationsQueryKey() });
      toast.success("UserOp created!");
      setShowBuilder(false);
      setSender(""); setTarget(""); setCalldata(""); setValue("0");
      setNonce(""); setInitCode(""); setCallGasLimit("");
      setVerificationGasLimit(""); setPreVerificationGas("");
      setMaxFeePerGas(""); setMaxPriorityFeePerGas("");
      setPaymasterAndData(""); setSignature("");
    } catch {
      toast.error("Failed to create UserOp");
    }
  };

  const handleSend = async (opId: number) => {
    try {
      await updateOpMut.mutateAsync({
        id: opId,
        data: {
          status: "sent",
        }
      });
      await queryClient.invalidateQueries({ queryKey: getListMevOperationsQueryKey() });
      toast.success("UserOp submitted to bundler", {
        description: "The opHash and txHash will be populated when the bundler confirms."
      });
    } catch {
      toast.error("Failed to send UserOp");
    }
  };

  const statusIcon = (status: string) => {
    if (status === "sent" || status === "confirmed") return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">MEV & ERC-4337</h1>
          <p className="text-sm text-muted-foreground mt-1">Build UserOperations, configure bundlers and paymasters, and send bundles.</p>
        </div>
        <Button onClick={() => setShowBuilder(!showBuilder)} className="gap-2">
          <Plus className="w-4 h-4" />
          Build UserOp
        </Button>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Bundler Configuration</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BUNDLER_PROVIDERS.map(bp => (
            <button
              key={bp.id}
              onClick={() => { setBundlerProvider(bp.id); setBundlerUrl(bp.url); }}
              className={`p-2.5 rounded-md border text-left transition-all ${
                bundlerProvider === bp.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className={`text-xs font-medium ${bundlerProvider === bp.id ? "text-primary" : "text-foreground"}`}>{bp.name}</p>
              {bp.url && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{bp.url}</p>}
            </button>
          ))}
        </div>
        {bundlerProvider === "custom" && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bundler RPC URL</label>
            <Input value={bundlerUrl} onChange={(e) => setBundlerUrl(e.target.value)} placeholder="https://..." className="font-mono text-xs" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">EntryPoint:</label>
          <div className="flex gap-2">
            {ENTRY_POINTS.map(ep => (
              <button
                key={ep.version}
                onClick={() => setEntryPointVersion(ep.version)}
                className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
                  entryPointVersion === ep.version ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-muted-foreground/30"
                }`}
              >
                {ep.version}
              </button>
            ))}
          </div>
          <code className="text-[10px] text-muted-foreground font-mono">{selectedEntryPoint.address.slice(0, 10)}...</code>
          <button onClick={() => { navigator.clipboard.writeText(selectedEntryPoint.address); toast.success("Copied"); }}>
            <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </Card>

      <AnimatePresence>
        {showBuilder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">UserOperation Builder</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sender (Smart Account)</label>
                  <Input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="0x..." className="font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Contract</label>
                  <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0x..." className="font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Calldata (Hex)</label>
                <textarea
                  placeholder="0x..."
                  value={calldata}
                  onChange={(e) => setCalldata(e.target.value)}
                  className="w-full h-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Value (wei)</label>
                  <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" className="font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nonce</label>
                  <Input value={nonce} onChange={(e) => setNonce(e.target.value)} placeholder="Auto" className="font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Paymaster</label>
                  <select
                    value={paymaster}
                    onChange={(e) => setPaymaster(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PAYMASTERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Advanced ERC-4337 Fields
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-2 border-t border-border"
                  >
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">initCode</label>
                      <Input value={initCode} onChange={(e) => setInitCode(e.target.value)} placeholder="0x... (factory + initData for first-time deployment)" className="font-mono text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Factory address + initialization data. Only needed for the first UserOp from a new account.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">callGasLimit</label>
                        <Input value={callGasLimit} onChange={(e) => setCallGasLimit(e.target.value)} placeholder="e.g. 100000" className="font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">verificationGasLimit</label>
                        <Input value={verificationGasLimit} onChange={(e) => setVerificationGasLimit(e.target.value)} placeholder="e.g. 150000" className="font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">preVerificationGas</label>
                        <Input value={preVerificationGas} onChange={(e) => setPreVerificationGas(e.target.value)} placeholder="e.g. 50000" className="font-mono text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">maxFeePerGas</label>
                        <Input value={maxFeePerGas} onChange={(e) => setMaxFeePerGas(e.target.value)} placeholder="e.g. 30000000000" className="font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">maxPriorityFeePerGas</label>
                        <Input value={maxPriorityFeePerGas} onChange={(e) => setMaxPriorityFeePerGas(e.target.value)} placeholder="e.g. 1500000000" className="font-mono text-xs" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">paymasterAndData</label>
                      <Input value={paymasterAndData} onChange={(e) => setPaymasterAndData(e.target.value)} placeholder="0x... (paymaster address + data)" className="font-mono text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Paymaster contract address concatenated with extra paymaster-specific data for gas sponsorship.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">signature</label>
                      <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="0x... (owner signature)" className="font-mono text-xs" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`p-3 rounded-md border flex items-center gap-3 ${isPrivateTx ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">
                  {isPrivateTx ? "Bundle routed via Flashbots Protect" : "Standard bundler submission"}
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowBuilder(false)}>Cancel</Button>
                <Button onClick={handleBuild} disabled={!sender || !target} isLoading={createOpMut.isPending}>
                  Create UserOp
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Card className="animate-pulse h-48" />
      ) : operations?.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Operations</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Build ERC-4337 UserOperations with paymaster sponsorship and bundler routing.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-2">
            {operations?.map((op) => (
              <div key={op.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/20 border border-border hover:border-muted-foreground/20 transition-colors">
                <div className="flex items-center gap-4">
                  {statusIcon(op.status)}
                  <div>
                    <p className="text-sm font-medium text-foreground font-mono">
                      {op.sender.slice(0, 10)}... → {op.target?.slice(0, 10) || "N/A"}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {op.opType} on {getChainName(op.chainId)}
                      {op.bundlerProvider && ` · ${op.bundlerProvider}`}
                      {op.paymaster && ` · Paymaster: ${op.paymaster}`}
                      {op.entryPointAddress && ` · EP: ${op.entryPointAddress.slice(0, 8)}...`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={op.status === "sent" ? "success" : op.status === "failed" ? "outline" : "default"}>
                    {op.status}
                  </Badge>
                  {op.status === "draft" && (
                    <Button size="sm" onClick={() => handleSend(op.id)} className="gap-1">
                      <Play className="w-3.5 h-3.5" /> Send
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(op.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

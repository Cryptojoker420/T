import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListBridgeTransfers, useCreateBridgeTransfer, useListChains, getListBridgeTransfersQueryKey } from "@workspace/api-client-react";
import { useAppStore } from "@/store/useAppStore";
import { useActiveAccount } from "thirdweb/react";
import { Button, Card, Input, Badge } from "@/components/shared";
import { ArrowRightLeft, Plus, Shield, ShieldAlert, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const PROTOCOLS = ["CCIP (Chainlink)", "LayerZero", "Hyperlane", "Wormhole", "Axelar"];

export function BridgeDashboard() {
  const queryClient = useQueryClient();
  const { data: transfers, isLoading } = useListBridgeTransfers();
  const { data: chains } = useListChains();
  const createTransferMut = useCreateBridgeTransfer();
  const { isPrivateTx } = useAppStore();

  const account = useActiveAccount();
  const address = account?.address;
  const isConnected = !!account;

  const [showForm, setShowForm] = useState(false);
  const [protocol, setProtocol] = useState(PROTOCOLS[0]);
  const [sourceChainId, setSourceChainId] = useState(1);
  const [destChainId, setDestChainId] = useState(10);
  const [tokenSymbol, setTokenSymbol] = useState("ETH");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sourceTxHash, setSourceTxHash] = useState("");

  const getChainName = (chainId: number) => chains?.find(c => c.chainId === chainId)?.name || `Chain ${chainId}`;

  const handleBridge = async () => {
    if (!amount || !recipient || !isConnected) return;

    if (sourceTxHash && !sourceTxHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      toast.error("Invalid transaction hash format");
      return;
    }

    try {
      await createTransferMut.mutateAsync({
        data: {
          protocol: protocol.split(" ")[0],
          sourceChainId,
          destChainId,
          tokenAddress: tokenAddress || `0x${"0".repeat(40)}`,
          tokenSymbol,
          amount,
          sender: address!,
          recipient,
          sourceTxHash: sourceTxHash || undefined,
          status: "pending",
          wasPrivate: isPrivateTx,
        }
      });
      await queryClient.invalidateQueries({ queryKey: getListBridgeTransfersQueryKey() });
      toast.success("Bridge transfer recorded!");
      setShowForm(false);
      setAmount("");
      setRecipient("");
      setSourceTxHash("");
    } catch {
      toast.error("Bridge transfer failed");
    }
  };

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-success" />;
    if (status === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cross-Chain Bridges</h1>
          <p className="text-sm text-muted-foreground mt-1">Bridge assets across chains via CCIP, LayerZero, Hyperlane, and more.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Transfer
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Protocol</label>
                <div className="flex flex-wrap gap-2">
                  {PROTOCOLS.map(p => (
                    <button
                      key={p}
                      onClick={() => setProtocol(p)}
                      className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                        protocol === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-muted-foreground/30'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Source Chain</label>
                  <select
                    value={sourceChainId}
                    onChange={(e) => setSourceChainId(parseInt(e.target.value))}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {chains?.map(c => <option key={c.chainId} value={c.chainId}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Destination Chain</label>
                  <select
                    value={destChainId}
                    onChange={(e) => setDestChainId(parseInt(e.target.value))}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {chains?.map(c => <option key={c.chainId} value={c.chainId}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Token Symbol</label>
                  <Input value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())} placeholder="ETH" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Amount</label>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Recipient</label>
                  <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." className="font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Token Address (optional)</label>
                  <Input value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="0x... (leave empty for native)" className="font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Source TX Hash (optional)</label>
                  <Input value={sourceTxHash} onChange={(e) => setSourceTxHash(e.target.value)} placeholder="0x..." className="font-mono" />
                  <p className="text-[10px] text-muted-foreground mt-1">Enter if you already initiated the bridge on-chain</p>
                </div>
              </div>

              {!isConnected && (
                <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-destructive font-medium">Connect your wallet to record bridge transfers</span>
                </div>
              )}

              <div className={`p-3 rounded-md border flex items-center gap-3 ${isPrivateTx ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                {isPrivateTx ? <Shield className="w-4 h-4 text-success" /> : <ShieldAlert className="w-4 h-4 text-destructive" />}
                <span className={`text-sm font-medium ${isPrivateTx ? 'text-success' : 'text-destructive'}`}>
                  {isPrivateTx ? "Source TX routed privately" : "Source TX via public mempool"}
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleBridge} disabled={!amount || !recipient || !isConnected} isLoading={createTransferMut.isPending}>
                  Initiate Bridge
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <Card className="animate-pulse h-48" />
      ) : transfers?.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mb-4">
            <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Transfers Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Bridge assets across chains using CCIP, LayerZero, Hyperlane, and more.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="space-y-2">
            {transfers?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/20 border border-border hover:border-muted-foreground/20 transition-colors">
                <div className="flex items-center gap-4">
                  {statusIcon(tx.status)}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.amount} {tx.tokenSymbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getChainName(tx.sourceChainId)} → {getChainName(tx.destChainId)} via {tx.protocol}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={tx.status === "completed" ? "success" : tx.status === "failed" ? "outline" : "default"}>
                    {tx.status}
                  </Badge>
                  {tx.wasPrivate && <Badge variant="success" className="gap-1"><Shield className="w-3 h-3" /> Private</Badge>}
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

import { useState } from "react";
import { useRoute } from "wouter";
import { useGetWallet, useGetWalletActivity, useCreateActivity, useListChains } from "@workspace/api-client-react";
import { useAppStore } from "@/store/useAppStore";
import { Button, Card, Input, Badge } from "@/components/shared";
import { Copy, ExternalLink, ShieldCheck, Play, Key, Clock, Code2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function WalletDetail() {
  const [, params] = useRoute("/wallets/:id");
  const id = parseInt(params?.id || "0", 10);
  
  const { data: wallet, isLoading } = useGetWallet(id);
  const { data: activity, refetch: refetchActivity } = useGetWalletActivity(id);
  const { data: chains } = useListChains();
  const createActivityMut = useCreateActivity();
  const { isPrivateTx } = useAppStore();

  const [targetAddress, setTargetAddress] = useState("");
  const [calldata, setCalldata] = useState("");
  
  const chainName = chains?.find(c => c.chainId === wallet?.chainId)?.name;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard");
  };

  const handleDelegateCall = async () => {
    if (!targetAddress || !calldata) return;
    
    try {
      await createActivityMut.mutateAsync({
        data: {
          walletId: id,
          action: "Delegate Call",
          details: `Target: ${targetAddress.slice(0,8)}... | Calldata: ${calldata.slice(0,10)}...`,
          wasPrivate: isPrivateTx,
          chainId: wallet!.chainId,
          txHash: undefined
        }
      });
      
      toast.success("Delegate call executed");
      setTargetAddress("");
      setCalldata("");
      refetchActivity();
    } catch (err) {
      toast.error("Execution failed");
    }
  };

  if (isLoading || !wallet) {
    return <div className="animate-pulse h-64 bg-card rounded-md border border-border" />;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-display text-foreground">{wallet.name}</h1>
            <Badge variant={wallet.walletType === 'Smart' ? 'accent' : 'default'} className="text-[10px]">
              {wallet.walletType}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <span className="font-mono text-sm bg-secondary/30 px-2 py-1 rounded border border-border text-foreground flex items-center gap-1.5">
              {wallet.address}
              <button onClick={() => handleCopy(wallet.address)} className="hover:text-primary transition-colors text-muted-foreground hover:text-foreground">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </span>
            <Badge variant="outline">{chainName}</Badge>
            {wallet.privateTxDefault && (
              <Badge variant="success" className="bg-transparent border-success/20 gap-1">
                <ShieldCheck className="w-3 h-3" /> Protected
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Threshold</span>
            <span className="text-lg font-medium text-foreground">{wallet.threshold} / {wallet.owners.length}</span>
          </div>
          <div className="w-px h-10 bg-border mx-1" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">ETH Balance</span>
            <span className="text-lg font-medium text-foreground">12.45</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column - Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Delegate Call Builder */}
          <Card>
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <Code2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-medium text-foreground">Delegate Call Builder</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Contract Address</label>
                <Input 
                  placeholder="0x..." 
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Calldata (Hex)</label>
                <textarea 
                  placeholder="0xabcdef..." 
                  value={calldata}
                  onChange={(e) => setCalldata(e.target.value)}
                  className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors resize-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Routing:</span>
                  <Badge variant={isPrivateTx ? "success" : "outline"} className={isPrivateTx ? "" : "text-destructive border-destructive/20"}>
                    {isPrivateTx ? "Flashbots Protect" : "Public Mempool"}
                  </Badge>
                </div>
                <Button 
                  size="sm"
                  onClick={handleDelegateCall} 
                  disabled={!targetAddress || !calldata}
                  isLoading={createActivityMut.isPending}
                  className="gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Execute
                </Button>
              </div>
            </div>
          </Card>

          {/* Activity Log */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-medium text-foreground">Recent Activity</h2>
            </div>
            
            {activity?.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {activity?.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center mt-0.5">
                        <Key className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{entry.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground font-mono bg-secondary/50 px-1.5 py-0.5 rounded">{entry.txHash?.slice(0, 14)}...</span>
                          {entry.wasPrivate && <Badge variant="success" className="px-1.5 py-0 text-[9px]">Private</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.createdAt))} ago
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Sidebar Column - Owners */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-medium text-foreground mb-3">Signers ({wallet.owners.length})</h3>
            <div className="space-y-2">
              {wallet.owners.map((owner, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border">
                  <span className="font-mono text-xs text-muted-foreground truncate mr-2">
                    {owner}
                  </span>
                  <a href={`#`} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-medium text-foreground mb-1">Multisig Policy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Requires {wallet.threshold} out of {wallet.owners.length} signatures to execute.
              </p>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

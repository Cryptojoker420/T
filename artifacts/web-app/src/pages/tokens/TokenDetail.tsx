import { useRoute, useLocation } from "wouter";
import { useGetToken, useDeleteToken, useListChains } from "@workspace/api-client-react";
import { Button, Card, Badge } from "@/components/shared";
import { Copy, ArrowLeft, Trash2, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function TokenDetail() {
  const [, params] = useRoute("/tokens/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0", 10);

  const { data: token, isLoading } = useGetToken(id);
  const { data: chains } = useListChains();
  const deleteTokenMut = useDeleteToken();

  const chainName = chains?.find(c => c.chainId === token?.chainId)?.name;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDelete = async () => {
    await deleteTokenMut.mutateAsync({ id });
    toast.success("Token removed");
    setLocation("/tokens");
  };

  if (isLoading || !token) {
    return <div className="animate-pulse h-64 bg-card rounded-md border border-border" />;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setLocation("/tokens")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{token.name}</h1>
            <Badge>{token.tokenType}</Badge>
            <Badge variant="outline">{token.symbol}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-sm text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md border border-border flex items-center gap-1.5">
              {token.address}
              <button onClick={() => handleCopy(token.address)} className="hover:text-foreground transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </span>
            <Badge variant="outline">{chainName}</Badge>
            {token.wasPrivate && (
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="w-3 h-3" /> Private Deploy
              </Badge>
            )}
          </div>
        </div>
        <Button variant="danger" onClick={handleDelete} isLoading={deleteTokenMut.isPending} className="gap-2">
          <Trash2 className="w-4 h-4" /> Remove
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Decimals</p>
          <p className="text-xl font-semibold text-foreground">{token.decimals}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Supply</p>
          <p className="text-xl font-semibold text-foreground">{token.totalSupply ? Number(token.totalSupply).toLocaleString() : "N/A"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Deployed</p>
          <p className="text-xl font-semibold text-foreground">{new Date(token.createdAt).toLocaleDateString()}</p>
        </Card>
      </div>

      {token.deployer && (
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-3">Deployment Details</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 border border-border">
              <span className="text-xs text-muted-foreground">Deployer</span>
              <span className="font-mono text-sm text-foreground flex items-center gap-1.5">
                {token.deployer}
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </span>
            </div>
            {token.deployTxHash && (
              <div className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 border border-border">
                <span className="text-xs text-muted-foreground">TX Hash</span>
                <span className="font-mono text-sm text-foreground flex items-center gap-1.5">
                  {token.deployTxHash.slice(0, 20)}...
                  <button onClick={() => handleCopy(token.deployTxHash!)} className="hover:text-primary transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

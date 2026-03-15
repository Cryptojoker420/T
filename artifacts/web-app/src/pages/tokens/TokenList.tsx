import { Link } from "wouter";
import { useListTokens, useListChains } from "@workspace/api-client-react";
import { Button, Card, Badge } from "@/components/shared";
import { Coins, Plus, ArrowRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export function TokenList() {
  const { data: tokens, isLoading } = useListTokens();
  const { data: chains } = useListChains();

  const getChainName = (chainId: number) => {
    return chains?.find(c => c.chainId === chainId)?.name || `Chain ${chainId}`;
  };

  const truncate = (str: string) => `${str.slice(0, 6)}...${str.slice(-4)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Token Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Deploy and manage ERC-20, ERC-721, and ERC-1155 tokens.</p>
        </div>
        <Link href="/tokens/deploy">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Deploy Token
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse h-40" />
          ))}
        </div>
      ) : tokens?.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mb-4">
            <Coins className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tokens Found</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            You haven't deployed any tokens yet. Deploy an ERC-20, ERC-721, or ERC-1155 token to get started.
          </p>
          <Link href="/tokens/deploy">
            <Button>Deploy Your First Token</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens?.map((token, idx) => (
            <motion.div
              key={token.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/tokens/${token.id}`} className="block h-full">
                <Card className="h-full flex flex-col hover:border-muted-foreground/30 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {token.name}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        {token.symbol} &middot; {truncate(token.address)}
                      </p>
                    </div>
                    <Badge>{token.tokenType}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant="outline">{getChainName(token.chainId)}</Badge>
                    <Badge variant="outline">{token.decimals} decimals</Badge>
                    {token.wasPrivate ? (
                      <Badge variant="success" className="gap-1">
                        <ShieldCheck className="w-3 h-3" /> Private
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                        <ShieldAlert className="w-3 h-3" /> Public
                      </Badge>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Added {new Date(token.createdAt).toLocaleDateString()}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

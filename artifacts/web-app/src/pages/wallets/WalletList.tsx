import { Link } from "wouter";
import { useListWallets, useListChains } from "@workspace/api-client-react";
import { Button, Card, Badge } from "@/components/shared";
import { Wallet, Plus, ArrowRight, ShieldCheck, ShieldAlert, Wrench } from "lucide-react";
import { motion } from "framer-motion";

export function WalletList() {
  const { data: wallets, isLoading } = useListWallets();
  const { data: chains } = useListChains();

  const getChainName = (chainId: number) => {
    return chains?.find(c => c.chainId === chainId)?.name || `Chain ${chainId}`;
  };

  const truncate = (str: string) => `${str.slice(0, 6)}...${str.slice(-4)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground mb-1">Smart Wallets</h1>
          <p className="text-sm text-muted-foreground">Manage your deployed multi-sig and smart accounts.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/wallets/tools">
            <Button size="sm" variant="outline" className="gap-2">
              <Wrench className="w-4 h-4" />
              Wallet Tools
            </Button>
          </Link>
          <Link href="/wallets/deploy">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Deploy Wallet
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse h-40" />
          ))}
        </div>
      ) : wallets?.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No Wallets Found</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            You haven't deployed any smart wallets yet. Create a deterministic Safe wallet to get started.
          </p>
          <Link href="/wallets/deploy">
            <Button size="sm">Deploy First Wallet</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets?.map((wallet, idx) => (
            <motion.div
              key={wallet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/wallets/${wallet.id}`} className="block h-full">
                <Card className="h-full flex flex-col hover:border-muted-foreground/30 transition-all duration-200 group cursor-pointer p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                        {wallet.name}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        {truncate(wallet.address)}
                      </p>
                    </div>
                    <Badge variant={wallet.walletType === 'Smart' ? 'accent' : 'default'}>
                      {wallet.walletType}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    <Badge variant="outline">{getChainName(wallet.chainId)}</Badge>
                    <Badge variant="outline">{wallet.threshold}/{wallet.owners.length} Signers</Badge>
                    {wallet.privateTxDefault ? (
                      <Badge variant="success" className="gap-1 bg-transparent border-success/30">
                        <ShieldCheck className="w-3 h-3" /> Private
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
                        <ShieldAlert className="w-3 h-3" /> Public
                      </Badge>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Added {new Date(wallet.createdAt).toLocaleDateString()}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-muted-foreground group-hover:text-primary" />
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

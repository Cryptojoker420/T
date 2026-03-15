import { Link } from "wouter";
import { useListContracts, useListChains } from "@workspace/api-client-react";
import { Button, Card, Badge } from "@/components/shared";
import { FileCode2, Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function ContractList() {
  const { data: contracts, isLoading } = useListContracts();
  const { data: chains } = useListChains();

  const getChainName = (chainId: number) => {
    return chains?.find(c => c.chainId === chainId)?.name || `Chain ${chainId}`;
  };

  const truncate = (str: string) => `${str.slice(0, 6)}...${str.slice(-4)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contract Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Import and interact with any smart contract via ABI.</p>
        </div>
        <Link href="/contracts/register">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Import Contract
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse h-36" />
          ))}
        </div>
      ) : contracts?.length === 0 ? (
        <Card className="text-center py-16 flex flex-col items-center">
          <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center mb-4">
            <FileCode2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Contracts Registered</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Import a contract by providing its address and ABI to start interacting with it.
          </p>
          <Link href="/contracts/register">
            <Button>Import Your First Contract</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts?.map((contract, idx) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/contracts/${contract.id}`} className="block h-full">
                <Card className="h-full flex flex-col hover:border-muted-foreground/30 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{contract.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{truncate(contract.address)}</p>
                    </div>
                    <Badge variant="outline">{getChainName(contract.chainId)}</Badge>
                  </div>

                  {contract.tags && (contract.tags as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(contract.tags as string[]).map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Added {new Date(contract.createdAt).toLocaleDateString()}</span>
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

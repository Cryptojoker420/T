import { useState } from "react";
import { useLocation } from "wouter";
import { useListChains, useCreateContract } from "@workspace/api-client-react";
import { Button, Card, Input } from "@/components/shared";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_ABI = JSON.stringify([
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
], null, 2);

export function RegisterContract() {
  const [, setLocation] = useLocation();
  const { data: chains } = useListChains();
  const createContractMut = useCreateContract();

  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [chainId, setChainId] = useState(1);
  const [abiText, setAbiText] = useState("");
  const [tagsText, setTagsText] = useState("");

  const handleImport = async () => {
    if (!address || !name || !abiText) return;
    let abi;
    try {
      abi = JSON.parse(abiText);
    } catch {
      toast.error("Invalid ABI JSON");
      return;
    }

    try {
      const contract = await createContractMut.mutateAsync({
        data: {
          address,
          name,
          chainId,
          abi,
          tags: tagsText ? tagsText.split(",").map(t => t.trim()).filter(Boolean) : undefined,
        }
      });
      toast.success("Contract imported successfully!");
      setLocation(`/contracts/${contract.id}`);
    } catch {
      toast.error("Import failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setLocation("/contracts")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import Contract</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Register a contract by providing its address and ABI.</p>
        </div>
      </div>

      <Card className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Contract Name</label>
          <Input placeholder="e.g. USDC Token, Uniswap Router" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Contract Address</label>
          <Input placeholder="0x..." value={address} onChange={(e) => setAddress(e.target.value)} className="font-mono" />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Network</label>
          <div className="grid grid-cols-3 gap-2">
            {chains?.map(chain => (
              <button
                key={chain.chainId}
                onClick={() => setChainId(chain.chainId)}
                className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                  chainId === chain.chainId
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground/30 text-foreground'
                }`}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-muted-foreground">ABI (JSON)</label>
            <button
              onClick={() => setAbiText(SAMPLE_ABI)}
              className="text-xs text-primary hover:underline"
            >
              Paste sample ERC-20 ABI
            </button>
          </div>
          <textarea
            placeholder='[{"type":"function","name":"balanceOf",...}]'
            value={abiText}
            onChange={(e) => setAbiText(e.target.value)}
            className="w-full h-40 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tags (comma-separated, optional)</label>
          <Input placeholder="e.g. defi, token, proxy" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleImport}
            disabled={!address || !name || !abiText}
            isLoading={createContractMut.isPending}
          >
            Import Contract
          </Button>
        </div>
      </Card>
    </div>
  );
}

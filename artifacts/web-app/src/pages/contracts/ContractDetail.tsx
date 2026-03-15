import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetContract, useDeleteContract, useListChains } from "@workspace/api-client-react";
import { useActiveAccount } from "thirdweb/react";
import { viemAdapter } from "thirdweb/adapters/viem";
import { thirdwebClient } from "@/lib/thirdweb";
import { defineChain as defineThirdwebChain } from "thirdweb";
import { Button, Card, Badge, Input } from "@/components/shared";
import { Copy, ArrowLeft, Trash2, Play, Eye, FileCode2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createPublicClient, http, type Abi } from "viem";
import {
  mainnet, polygon, arbitrum, base, optimism, bsc, avalanche, sepolia, baseSepolia
} from "viem/chains";

const VIEM_CHAINS: Record<number, any> = {
  1: mainnet, 137: polygon, 42161: arbitrum, 8453: base, 10: optimism,
  56: bsc, 43114: avalanche, 11155111: sepolia, 84532: baseSepolia,
};

interface AbiItem {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: { name: string; type: string }[];
  outputs?: { name: string; type: string }[];
}

export function ContractDetail() {
  const [, params] = useRoute("/contracts/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0", 10);

  const { data: contract, isLoading } = useGetContract(id);
  const { data: chains } = useListChains();
  const deleteContractMut = useDeleteContract();
  const account = useActiveAccount();
  const isConnected = !!account;

  const [selectedFn, setSelectedFn] = useState<AbiItem | null>(null);
  const [fnParams, setFnParams] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chainName = chains?.find(c => c.chainId === contract?.chainId)?.name;

  const publicClient = useMemo(() => {
    if (!contract?.chainId) return null;
    const chain = VIEM_CHAINS[contract.chainId];
    if (!chain) return null;
    return createPublicClient({ chain, transport: http() });
  }, [contract?.chainId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDelete = async () => {
    await deleteContractMut.mutateAsync({ id });
    toast.success("Contract removed");
    setLocation("/contracts");
  };

  const handleSelectFn = (fn: AbiItem) => {
    setSelectedFn(fn);
    setFnParams(fn.inputs?.map(() => "") || []);
    setResult(null);
    setError(null);
  };

  const parseParam = (value: string, type: string): any => {
    if (type === "bool") return value === "true";
    if (type.startsWith("uint") || type.startsWith("int")) return BigInt(value);
    if (type === "address") return value as `0x${string}`;
    if (type.includes("[]")) {
      try { return JSON.parse(value); } catch { return value.split(",").map(s => s.trim()); }
    }
    if (type.startsWith("bytes")) return value as `0x${string}`;
    return value;
  };

  const handleExecute = async () => {
    if (!selectedFn || !contract || !publicClient) return;

    const isRead = selectedFn.stateMutability === "view" || selectedFn.stateMutability === "pure";

    if (!isRead && !account) {
      toast.error("Connect your wallet to execute write functions");
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const args = selectedFn.inputs?.map((input, i) => parseParam(fnParams[i] || "", input.type)) || [];
      const contractAddress = contract.address as `0x${string}`;

      if (isRead) {
        const data = await publicClient.readContract({
          address: contractAddress,
          abi: contract.abi as Abi,
          functionName: selectedFn.name!,
          args,
        });
        setResult(typeof data === "bigint" ? data.toString() : JSON.stringify(data, null, 2));
        toast.success("Read executed on-chain");
      } else {
        const thirdwebChain = defineThirdwebChain(contract.chainId);
        const walletClient = viemAdapter.walletClient.toViem({
          account: account!,
          client: thirdwebClient,
          chain: thirdwebChain,
        });
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: contract.abi as Abi,
          functionName: selectedFn.name!,
          args,
        });
        setResult(`Transaction sent: ${hash}`);
        toast.success("Transaction submitted", { description: `TX: ${hash.slice(0, 10)}...` });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        setResult(`Transaction confirmed in block ${receipt.blockNumber}\nTX Hash: ${hash}\nStatus: ${receipt.status}`);
      }
    } catch (err: any) {
      const message = err?.shortMessage || err?.message || "Execution failed";
      setError(message);
      toast.error("Execution failed", { description: message.slice(0, 100) });
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading || !contract) {
    return <div className="animate-pulse h-64 bg-card rounded-md border border-border" />;
  }

  const abi = (contract.abi as AbiItem[]) || [];
  const functions = abi.filter(item => item.type === "function");
  const readFns = functions.filter(fn => fn.stateMutability === "view" || fn.stateMutability === "pure");
  const writeFns = functions.filter(fn => fn.stateMutability !== "view" && fn.stateMutability !== "pure");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setLocation("/contracts")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{contract.name}</h1>
            <Badge variant="outline">{chainName}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-sm text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md border border-border flex items-center gap-1.5">
              {contract.address}
              <button onClick={() => handleCopy(contract.address)} className="hover:text-foreground transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        </div>
        <Button variant="danger" onClick={handleDelete} isLoading={deleteContractMut.isPending} className="gap-2">
          <Trash2 className="w-4 h-4" /> Remove
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {readFns.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" /> Read Functions
              </h3>
              <div className="space-y-1">
                {readFns.map((fn, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectFn(fn)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedFn?.name === fn.name ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    {fn.name}({fn.inputs?.map(i => i.type).join(", ")})
                  </button>
                ))}
              </div>
            </Card>
          )}

          {writeFns.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Play className="w-4 h-4 text-muted-foreground" /> Write Functions
              </h3>
              <div className="space-y-1">
                {writeFns.map((fn, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectFn(fn)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedFn?.name === fn.name ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    {fn.name}({fn.inputs?.map(i => i.type).join(", ")})
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedFn ? (
            <Card>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">{selectedFn.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedFn.stateMutability === "view" || selectedFn.stateMutability === "pure" ? "Read" : "Write"} function
                  {selectedFn.outputs?.length ? ` → ${selectedFn.outputs.map(o => o.type).join(", ")}` : ""}
                </p>
              </div>

              {selectedFn.inputs && selectedFn.inputs.length > 0 && (
                <div className="space-y-3 mb-4">
                  {selectedFn.inputs.map((input, i) => (
                    <div key={i}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {input.name} <span className="text-muted-foreground/60">({input.type})</span>
                      </label>
                      <Input
                        placeholder={`${input.type}...`}
                        value={fnParams[i] || ""}
                        onChange={(e) => {
                          const next = [...fnParams];
                          next[i] = e.target.value;
                          setFnParams(next);
                        }}
                        className="font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {!isConnected && selectedFn.stateMutability !== "view" && selectedFn.stateMutability !== "pure" && (
                <div className="mb-4 p-3 rounded-md bg-destructive/5 border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-destructive font-medium">Connect your wallet to execute write functions</span>
                </div>
              )}

              <Button
                onClick={handleExecute}
                className="gap-2"
                isLoading={isExecuting}
                disabled={!isConnected && selectedFn.stateMutability !== "view" && selectedFn.stateMutability !== "pure"}
              >
                {selectedFn.stateMutability === "view" || selectedFn.stateMutability === "pure" ? (
                  <><Eye className="w-4 h-4" /> Read</>
                ) : (
                  <><Play className="w-4 h-4" /> Write</>
                )}
              </Button>

              {error && (
                <div className="mt-4 p-3 rounded-md bg-destructive/5 border border-destructive/20">
                  <p className="text-xs text-destructive font-medium mb-1">Error</p>
                  <p className="font-mono text-xs text-destructive/80 break-all">{error}</p>
                </div>
              )}

              {result && (
                <div className="mt-4 p-3 rounded-md bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Result</p>
                  <pre className="font-mono text-sm text-foreground break-all whitespace-pre-wrap">{result}</pre>
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex items-center justify-center py-16 text-center">
              <div>
                <FileCode2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a function from the panel to interact with this contract.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
